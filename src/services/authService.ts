import {
  startRegistration,
  startAuthentication,
  platformAuthenticatorIsAvailable,
  browserSupportsWebAuthn,
  browserSupportsPasskeys,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON
} from "@simplewebauthn/browser";
import { Profile } from "../types";
import { deriveKeyFromPin, generateRandomSalt } from "./crypto";

export interface PinValidationResult {
  isValid: boolean;
  failedAttempts: number;
  lockedUntil: string | null;
  errorMessage?: string;
}

export interface PasskeyRegistrationResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

export interface PasskeyAuthResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

/**
 * Serwis Zarządzania Uwierzytelnianiem, Biometrią i Passkeys (WebAuthn / FIDO2)
 */
export class AuthService {
  /**
   * Sprawdza dostępność biometrii na bieżącej platformie (Electron Touch ID / Windows Hello lub WebAuthn)
   */
  static async checkPlatformBiometricsSupport(): Promise<boolean> {
    // 1. Jeśli działamy w natywnym środowisku Electron
    if (typeof window !== "undefined" && window.electronAPI?.checkBiometricsStatus) {
      try {
        const res = await window.electronAPI.checkBiometricsStatus("system_check");
        return Boolean(res?.available);
      } catch {
        return false;
      }
    }

    // 2. Jeśli działamy w przeglądarce WWW (WebAuthn Platform Authenticator)
    if (typeof window !== "undefined" && browserSupportsWebAuthn()) {
      try {
        return await platformAuthenticatorIsAvailable();
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Sprawdza czy przeglądarka wspiera Google Passkeys
   */
  static async supportsPasskeys(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    return await browserSupportsPasskeys();
  }

  /**
   * Rejestracja nowego poświadczenia Google Passkey / System Keychain (FIDO2 / WebAuthn)
   */
  static async registerPasskey(
    profileId: string,
    profileName: string,
    rpName: string = "Saldo"
  ): Promise<PasskeyRegistrationResult> {
    if (!browserSupportsWebAuthn()) {
      return { success: false, error: "Przeglądarka lub platforma nie wspiera WebAuthn." };
    }

    try {
      // Wygenerowanie bezpiecznego wyzwania (challenge)
      const challengeBuffer = new Uint8Array(32);
      window.crypto.getRandomValues(challengeBuffer);
      const challengeBase64 = btoa(String.fromCharCode(...challengeBuffer))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const userIdBuffer = new TextEncoder().encode(profileId);
      const userIdBase64 = btoa(String.fromCharCode(...userIdBuffer))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const options: PublicKeyCredentialCreationOptionsJSON = {
        challenge: challengeBase64,
        rp: {
          name: rpName,
          id: window.location.hostname || "localhost"
        },
        user: {
          id: userIdBase64,
          name: profileName.toLowerCase().replace(/\s+/g, "_"),
          displayName: profileName
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },  // ES256 (ECDSA z SHA-256)
          { alg: -257, type: "public-key" } // RS256 (RSA z SHA-256)
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Wymuszenie wbudowanego authenticatora (Touch ID / Face ID / Windows Hello)
          residentKey: "required",             // Passkey synchronizowany z Pękiem Kluczy Apple / Google Passkeys
          userVerification: "required"         // Wymagana weryfikacja biometryczna lub PIN systemowy
        },
        timeout: 60000,
        attestation: "none"
      };

      const registrationResponse = await startRegistration({ optionsJSON: options });
      return {
        success: true,
        credentialId: registrationResponse.id
      };
    } catch (err: any) {
      console.warn("[AuthService] Rejestracja Passkey nie powiodła się:", err);
      return {
        success: false,
        error: err.name === "NotAllowedError"
          ? "Użytkownik anulował rejestrację poświadczenia Passkey."
          : err.message || "Błąd rejestracji Passkey."
      };
    }
  }

  /**
   * Autentykacja za pomocą zarejestrowanego Passkey (FIDO2)
   */
  static async authenticatePasskey(
    credentialId?: string
  ): Promise<PasskeyAuthResult> {
    if (!browserSupportsWebAuthn()) {
      return { success: false, error: "Brak wsparcia dla WebAuthn." };
    }

    try {
      const challengeBuffer = new Uint8Array(32);
      window.crypto.getRandomValues(challengeBuffer);
      const challengeBase64 = btoa(String.fromCharCode(...challengeBuffer))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const options: PublicKeyCredentialRequestOptionsJSON = {
        challenge: challengeBase64,
        rpId: window.location.hostname || "localhost",
        userVerification: "required",
        timeout: 60000,
        allowCredentials: credentialId
          ? [
              {
                id: credentialId,
                type: "public-key",
                transports: ["internal"]
              }
            ]
          : undefined
      };

      const authResponse = await startAuthentication({ optionsJSON: options });
      return {
        success: true,
        credentialId: authResponse.id
      };
    } catch (err: any) {
      console.warn("[AuthService] Autentykacja Passkey nie powiodła się:", err);
      return {
        success: false,
        error: err.name === "NotAllowedError"
          ? "Weryfikacja Passkey została odrzucona przez użytkownika."
          : err.message || "Błąd uwierzytelniania biometrycznego."
      };
    }
  }

  /**
   * Autentykacja natywną biometrią (Touch ID / Face ID / Windows Hello)
   */
  static async authenticateBiometrics(
    profileId: string,
    promptReason: string = "Odblokuj profil Saldo"
  ): Promise<{ success: boolean; pin?: string; error?: string }> {
    // 1. Electron bridge
    if (typeof window !== "undefined" && window.electronAPI?.promptBiometricsUnlock) {
      try {
        const res = await window.electronAPI.promptBiometricsUnlock(profileId, promptReason);
        return res;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // 2. Web fallback przez Passkey
    const passkeyRes = await this.authenticatePasskey();
    return {
      success: passkeyRes.success,
      error: passkeyRes.error
    };
  }

  /**
   * Sprawdza czy profil jest aktywnie zablokowany przez politykę lockout
   */
  static isProfileLocked(profile: Profile): boolean {
    if (!profile.lockedUntil) return false;
    return new Date(profile.lockedUntil).getTime() > Date.now();
  }

  /**
   * Wylicza pozostały czas blokady profilu w sekundach
   */
  static calculateLockoutRemaining(lockedUntil?: string | null): number {
    if (!lockedUntil) return 0;
    const diffMs = new Date(lockedUntil).getTime() - Date.now();
    return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
  }

  /**
   * Haszowanie kodu PIN przy użyciu PBKDF2 z SHA-256 i unikalnym per-profil saltem (100k iteracji)
   */
  static async hashPin(pin: string, providedSalt?: string): Promise<{ pinHash: string; salt: string }> {
    const salt = providedSalt || generateRandomSalt();
    const enc = new TextEncoder();
    const cryptoObj = typeof window !== "undefined" && window.crypto ? window.crypto : globalThis.crypto;
    const keyMaterial = await cryptoObj.subtle.importKey(
      "raw",
      enc.encode(pin),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derivedBits = await cryptoObj.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: enc.encode(salt),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );
    const pinHash = Array.from(new Uint8Array(derivedBits))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    return { pinHash, salt };
  }

  /**
   * Weryfikacja kodu PIN z wbudowaną polityką anti-bruteforce (blokady czasowe)
   */
  static async verifyPin(
    param1: string | Profile,
    param2: Profile | string
  ): Promise<PinValidationResult> {
    const pin = typeof param1 === "string" ? param1 : (param2 as string);
    const profile = typeof param1 === "object" ? (param1 as Profile) : (param2 as Profile);
    const now = Date.now();

    // Sprawdzenie czy profil jest zablokowany
    if (this.isProfileLocked(profile)) {
      const remainingSeconds = this.calculateLockoutRemaining(profile.lockedUntil);
      return {
        isValid: false,
        failedAttempts: profile.failedAttempts || 0,
        lockedUntil: profile.lockedUntil || null,
        errorMessage: `Profil jest tymczasowo zablokowany. Spróbuj ponownie za ${remainingSeconds}s.`
      };
    }

    if (!profile.pinHash || !profile.salt) {
      return { isValid: true, failedAttempts: 0, lockedUntil: null };
    }

    const { pinHash: calculatedHash } = await this.hashPin(pin, profile.salt);
    if (calculatedHash === profile.pinHash) {
      return {
        isValid: true,
        failedAttempts: 0,
        lockedUntil: null
      };
    }

    // Błędny PIN: wyliczenie nowej liczby prób i ewentualnej kary czasowej
    const nextFailedAttempts = (profile.failedAttempts || 0) + 1;
    let lockedUntil: string | null = null;

    if (nextFailedAttempts >= 6) {
      // 6 i więcej prób: blokada 15 minut
      lockedUntil = new Date(now + 15 * 60 * 1000).toISOString();
    } else if (nextFailedAttempts === 5) {
      // 5 prób: blokada 2 minuty
      lockedUntil = new Date(now + 2 * 60 * 1000).toISOString();
    } else if (nextFailedAttempts === 4) {
      // 4 próby: blokada 30 sekund
      lockedUntil = new Date(now + 30 * 1000).toISOString();
    }

    return {
      isValid: false,
      failedAttempts: nextFailedAttempts,
      lockedUntil,
      errorMessage: lockedUntil
        ? "Zbyt wiele prób. Profil został tymczasowo zablokowany ze względów bezpieczeństwa."
        : `Niepoprawny kod PIN (pozostało prób: ${Math.max(0, 4 - nextFailedAttempts)}).`
    };
  }

  /**
   * Tworzy bezpieczny, gotowy profil demonstracyjny (Sandbox / Demo)
   */
  static createDemoProfile(): Profile {
    const today = new Date().toISOString().split("T")[0];
    return {
      id: "demo-guest-profile",
      name: "Profil Demonstracyjny (Gość)",
      kind: "personal",
      avatar: "🚀",
      color: "emerald",
      is_demo: true,
      currency: "PLN",
      budgets: {
        "Jedzenie": 1800,
        "Mieszkanie": 3200,
        "Transport": 600,
        "Rozrywka": 500
      },
      transactions: [
        {
          id: "demo-tx-1",
          name: "Wynagrodzenie miesięczne",
          category: "Wynagrodzenie",
          categoryIcon: "Briefcase",
          account: "Konto Główne",
          amount: 8500,
          type: "income",
          isoDate: today,
          currency: "PLN"
        },
        {
          id: "demo-tx-2",
          name: "Czynsz i opłaty",
          category: "Mieszkanie",
          categoryIcon: "Home",
          account: "Konto Główne",
          amount: 2850,
          type: "expense",
          isoDate: today,
          currency: "PLN"
        },
        {
          id: "demo-tx-3",
          name: "Zakupy spożywcze",
          category: "Jedzenie",
          categoryIcon: "ShoppingCart",
          account: "Konto Główne",
          amount: 245.5,
          type: "expense",
          isoDate: today,
          currency: "PLN"
        }
      ],
      payments: [
        {
          id: "demo-pay-1",
          name: "Internet Światłowodowy",
          amount: 89.99,
          dueDate: today,
          status: "Do opłacenia",
          category: "Rachunki",
          currency: "PLN"
        }
      ],
      goals: [
        {
          id: "demo-goal-1",
          name: "Poduszka Finansowa (3 m-ce)",
          target: 20000,
          saved: 12500,
          currency: "PLN"
        }
      ],
      investments: [],
      recurringRules: [],
      accounts: [
        {
          id: "demo-acc-1",
          name: "Konto Główne",
          bankName: "mBank",
          hasCreditLimit: false,
          creditLimit: 0
        }
      ]
    };
  }
}
