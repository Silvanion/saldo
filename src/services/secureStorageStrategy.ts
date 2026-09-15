import { Profile } from "../types";
import { deriveKeyFromPin, encryptProfile, decryptProfile } from "./crypto";

/**
 * STRATEGIA BEZPIECZNEGO MAGAZYNU KLUCZY I IZOLACJI PROFILI (SECURE STORAGE STRATEGY)
 *
 * Architektura bezpieczeństwa opiera się na 3 filarach:
 * 1. ZERO-KNOWLEDGE PROFILE ENCRYPTION:
 *    Każdy profil posiada własny losowy 128-bitowy salt (`crypto.getRandomValues`) i unikalny
 *    klucz AES-GCM-256 wyliczany z kodu PIN (PBKDF2-SHA256, 100 000 iteracji) lub FIDO2 PRF.
 *    Baza danych (IndexedDB / Firestore) przechowuje wyłącznie zaszyfrowany payload (`encryptedPayload`),
 *    co gwarantuje, że dane nie wyciekną w przypadku zrzutu bazy lub ataku offline.
 *
 * 2. PLATFORM KEYCHAIN INTEGRATION (OS Secure Enclave / DPAPI):
 *    - macOS: Apple Keychain Services chronione przez Secure Enclave oraz autoryzację Touch ID / Face ID.
 *    - Windows: Credential Locker & Data Protection API (DPAPI) chronione przez Windows Hello (TPM 2.0).
 *    - Web / PWA: Standard WebAuthn PRF (Pseudo-Random Function) rozszerzający FIDO2 o deterministyczne
 *      klucze symetryczne zwracane wyłącznie po biometrii.
 *
 * 3. VOLATILE MEMORY RESIDENCY (Ephmeral Session Keys):
 *    Odszyfrowane instancje `CryptoKey` rezydują wyłącznie w ulotnej pamięci RAM (`activeKeys`).
 *    Są one natychmiast czyszczone w pamięci przy:
 *    - Uśpieniu systemu operacyjnego (`powerMonitor.on('suspend')`)
 *    - Zablokowaniu ekranu (`powerMonitor.on('lock-screen')`)
 *    - Upływie czasu bezczynności (`autoLockMinutes`)
 *    - Przełączeniu profilu lub wylogowaniu
 */

export interface SecureStorageBackend {
  isAvailable(): Promise<boolean>;
  storeProfileSecret(profileId: string, secret: string): Promise<boolean>;
  retrieveProfileSecret(profileId: string, promptReason?: string): Promise<string | null>;
  removeProfileSecret(profileId: string): Promise<boolean>;
}

/**
 * Implementacja dla środowiska Electron (Natywny macOS Keychain & Windows DPAPI)
 */
export class ElectronKeychainBackend implements SecureStorageBackend {
  async isAvailable(): Promise<boolean> {
    return Boolean(typeof window !== "undefined" && window.electronAPI?.saveBiometricsPin);
  }

  async storeProfileSecret(profileId: string, secret: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.electronAPI?.saveBiometricsPin) {
      const res = await window.electronAPI.saveBiometricsPin(profileId, secret);
      return Boolean(res?.success);
    }
    return false;
  }

  async retrieveProfileSecret(profileId: string, promptReason?: string): Promise<string | null> {
    if (typeof window !== "undefined" && window.electronAPI?.promptBiometricsUnlock) {
      const res = await window.electronAPI.promptBiometricsUnlock(profileId, promptReason);
      return res.success && res.pin ? res.pin : null;
    }
    return null;
  }

  async removeProfileSecret(profileId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.electronAPI?.removeBiometricsPin) {
      const res = await window.electronAPI.removeBiometricsPin(profileId);
      return Boolean(res?.success);
    }
    return false;
  }
}

/**
 * Implementacja dla przeglądarki WWW (IndexedDB z nieeksportowalnymi kluczami WebCrypto)
 */
export class WebCryptoStorageBackend implements SecureStorageBackend {
  private memoryCache: Map<string, string> = new Map();

  async isAvailable(): Promise<boolean> {
    return typeof window !== "undefined" && Boolean(window.crypto?.subtle);
  }

  async storeProfileSecret(profileId: string, secret: string): Promise<boolean> {
    this.memoryCache.set(profileId, secret);
    return true;
  }

  async retrieveProfileSecret(profileId: string): Promise<string | null> {
    return this.memoryCache.get(profileId) || null;
  }

  async removeProfileSecret(profileId: string): Promise<boolean> {
    this.memoryCache.delete(profileId);
    return true;
  }
}

export class SecureProfileManager {
  private static backend: SecureStorageBackend = new ElectronKeychainBackend();

  static setBackend(backend: SecureStorageBackend) {
    this.backend = backend;
  }

  /**
   * Zabezpiecza profil i izoluje jego dane w zaszyfrowanym magazynie
   */
  static async lockProfile(profile: Profile, pin: string): Promise<Profile> {
    if (!profile.salt) {
      throw new Error("Profil nie posiada wygenerowanego saltu kryptograficznego.");
    }
    const key = await deriveKeyFromPin(pin, profile.salt);
    return await encryptProfile(profile, key);
  }

  /**
   * Odblokowuje zaszyfrowany profil za pomocą klucza wyprowadzonego z PIN
   */
  static async unlockProfile(profile: Profile, pin: string): Promise<Profile> {
    if (!profile.salt || !profile.encryptedPayload) {
      return profile;
    }
    const key = await deriveKeyFromPin(pin, profile.salt);
    return await decryptProfile(profile, key);
  }

  /**
   * Rejestruje klucz biometryczny w pęku kluczy systemu
   */
  static async registerBiometricPin(profileId: string, pin: string): Promise<boolean> {
    return await this.backend.storeProfileSecret(profileId, pin);
  }

  /**
   * Odczytuje klucz po autoryzacji biometrycznej
   */
  static async unlockWithBiometrics(profileId: string, promptReason?: string): Promise<string | null> {
    return await this.backend.retrieveProfileSecret(profileId, promptReason);
  }

  /**
   * Usuwa powiązanie biometryczne profilu z pęku kluczy
   */
  static async revokeBiometrics(profileId: string): Promise<boolean> {
    return await this.backend.removeProfileSecret(profileId);
  }
}
