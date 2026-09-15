import { platformAuthenticatorIsAvailable, browserSupportsWebAuthn } from "@simplewebauthn/browser";

export type SupportedPlatform = "macos" | "windows" | "linux" | "web";

export interface BiometricPlatformInfo {
  platform: SupportedPlatform;
  label: string;
  hardwareDescription: string;
  storageBackend: string;
  isSupported: boolean;
  unsupportedReason?: string;
}

export interface BiometricHardwareStatus {
  available: boolean;
  isEnrolledForProfile: boolean;
  platform: SupportedPlatform;
  label: string;
  hardwareDescription: string;
  storageBackend: string;
  unsupportedReason?: string;
}

/**
 * BiometricService - Autonaprawa i Zaawansowana Detekcja Biometrii
 * Wspiera macOS (Touch ID / Apple Biometrics), Windows (Windows Hello / DPAPI),
 * Linux (kontrola Secure Enclave/TPM z eleganckim fallbackiem) oraz Web (WebAuthn).
 */
export class BiometricService {
  /**
   * Wykrywa platformę uruchomieniową w runtime
   */
  static getPlatform(): SupportedPlatform {
    if (typeof window !== "undefined" && window.electronAPI?.platform) {
      const p = window.electronAPI.platform.toLowerCase();
      if (p === "darwin") return "macos";
      if (p === "win32") return "windows";
      if (p === "linux") return "linux";
    }

    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes("mac")) return "macos";
      if (ua.includes("win")) return "windows";
      if (ua.includes("linux")) return "linux";
    }

    return "web";
  }

  /**
   * Zwraca szczegółowe metadane platformy i modułu kryptograficznego
   */
  static getPlatformInfo(): BiometricPlatformInfo {
    const platform = this.getPlatform();

    switch (platform) {
      case "macos":
        return {
          platform: "macos",
          label: "Touch ID / Apple Biometrics",
          hardwareDescription: "Apple Secure Enclave & Biometrics",
          storageBackend: "macOS Keychain (safeStorage)",
          isSupported: true
        };
      case "windows":
        return {
          platform: "windows",
          label: "Windows Hello",
          hardwareDescription: "Windows Hello & TPM Credential Guard",
          storageBackend: "Windows DPAPI (safeStorage)",
          isSupported: true
        };
      case "linux":
        return {
          platform: "linux",
          label: "Biometria systemowa",
          hardwareDescription: "Brak sprzętowego modułu Secure Enclave/TPM",
          storageBackend: "Niedostępne",
          isSupported: false,
          unsupportedReason: "Platforma Linux nie udostępnia zunifikowanego modułu biometrii sprzętowej. Używaj kodu PIN."
        };
      case "web":
      default:
        return {
          platform: "web",
          label: "WebAuthn / Passkeys",
          hardwareDescription: "Przeglądarkowy czytnik biometryczny (FIDO2)",
          storageBackend: "WebCrypto non-extractable storage",
          isSupported: true
        };
    }
  }

  /**
   * Sprawdza dostępność sprzętową biometrii na danym urządzeniu dla wskazanego profilu
   */
  static async checkHardwareStatus(profileId?: string): Promise<BiometricHardwareStatus> {
    const info = this.getPlatformInfo();

    // 1. Środowisko natywne Electron (macOS / Windows)
    if (typeof window !== "undefined" && window.electronAPI?.checkBiometricsStatus) {
      try {
        const res = await window.electronAPI.checkBiometricsStatus(profileId);
        return {
          available: Boolean(res?.available),
          isEnrolledForProfile: Boolean(res?.isEnrolledForProfile),
          platform: info.platform,
          label: info.label,
          hardwareDescription: info.hardwareDescription,
          storageBackend: info.storageBackend,
          unsupportedReason: res?.available ? undefined : info.unsupportedReason || "Urządzenie nie posiada aktywnego czytnika biometrycznego lub moduł TPM/Touch ID jest wyłączony."
        };
      } catch (err: any) {
        return {
          available: false,
          isEnrolledForProfile: false,
          platform: info.platform,
          label: info.label,
          hardwareDescription: info.hardwareDescription,
          storageBackend: info.storageBackend,
          unsupportedReason: err?.message || "Błąd komunikacji z podsystemem biometrii."
        };
      }
    }

    // 2. Środowisko przeglądarki WWW (WebAuthn Platform Authenticator)
    if (typeof window !== "undefined" && browserSupportsWebAuthn()) {
      try {
        const hasPlatformAuth = await platformAuthenticatorIsAvailable();
        return {
          available: hasPlatformAuth,
          isEnrolledForProfile: false,
          platform: "web",
          label: info.label,
          hardwareDescription: info.hardwareDescription,
          storageBackend: info.storageBackend,
          unsupportedReason: hasPlatformAuth ? undefined : "Przeglądarka lub urządzenie nie wspiera autentykacji platformowej FIDO2."
        };
      } catch {
        return {
          available: false,
          isEnrolledForProfile: false,
          platform: "web",
          label: info.label,
          hardwareDescription: info.hardwareDescription,
          storageBackend: info.storageBackend,
          unsupportedReason: "Nie udało się zweryfikować czytnika FIDO2."
        };
      }
    }

    // 3. Fallback dla środowisk bez wsparcia
    return {
      available: false,
      isEnrolledForProfile: false,
      platform: info.platform,
      label: info.label,
      hardwareDescription: info.hardwareDescription,
      storageBackend: info.storageBackend,
      unsupportedReason: info.unsupportedReason || "Brak wsparcia dla biometrii na tym urządzeniu."
    };
  }

  /**
   * Rejestruje klucz biometryczny dla danego profilu (zapisuje zaszyfrowany sekret w Keychain/DPAPI)
   */
  static async enrollBiometrics(profileId: string, secretPin: string): Promise<{ success: boolean; error?: string }> {
    if (typeof window !== "undefined" && window.electronAPI?.saveBiometricsPin) {
      return await window.electronAPI.saveBiometricsPin(profileId, secretPin);
    }
    return { success: false, error: "Zapis biometrii jest dostępny wyłącznie w wersji aplikacji desktopowej." };
  }

  /**
   * Wywołuje natywny monit biometryczny celem odblokowania profilu
   */
  static async promptUnlock(profileId: string, promptReason?: string): Promise<{ success: boolean; pin?: string; error?: string }> {
    const info = this.getPlatformInfo();
    const defaultReason = info.platform === "macos"
      ? "Użyj Touch ID, aby odblokować profil Saldo"
      : "Zezwól Windows Hello na odblokowanie profilu Saldo";

    if (typeof window !== "undefined" && window.electronAPI?.promptBiometricsUnlock) {
      return await window.electronAPI.promptBiometricsUnlock(profileId, promptReason || defaultReason);
    }
    return { success: false, error: "Monit biometryczny niedostępny w bieżącym środowisku." };
  }

  /**
   * Usuwa powiązanie biometrii z profilem
   */
  static async removeBiometrics(profileId: string): Promise<{ success: boolean; error?: string }> {
    if (typeof window !== "undefined" && window.electronAPI?.removeBiometricsPin) {
      return await window.electronAPI.removeBiometricsPin(profileId);
    }
    return { success: false, error: "Operacja usuwania niedostępna." };
  }
}
