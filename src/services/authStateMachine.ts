import { Profile } from "../types";

/**
 * Stany Maszyny Stanów Uwierzytelniania i Zarządzania Tożsamością
 */
export type AuthState =
  | "UNINITIALIZED"
  | "DEMO_ACTIVE"
  | "ONBOARDING_WIZARD"
  | "LOCKED_PROFILE_SELECTION"
  | "AUTHENTICATING_BIOMETRIC"
  | "AUTHENTICATING_PIN"
  | "PROFILE_ACTIVE";

/**
 * Zdarzenia wyzwalające przejścia w Maszynie Stanów
 */
export type AuthEvent =
  | { type: "STARTUP_COLD"; hasProfiles: boolean; defaultDemo?: boolean }
  | { type: "START_ONBOARDING" }
  | { type: "CANCEL_ONBOARDING" }
  | { type: "COMPLETE_ONBOARDING"; profile: Profile }
  | { type: "SELECT_PROFILE"; profile: Profile }
  | { type: "START_BIOMETRIC_AUTH" }
  | { type: "BIOMETRIC_SUCCESS"; profile: Profile }
  | { type: "BIOMETRIC_FAILED"; reason?: string }
  | { type: "FALLBACK_TO_PIN" }
  | { type: "SUBMIT_PIN"; pin: string }
  | { type: "PIN_SUCCESS"; profile: Profile }
  | { type: "PIN_FAILED"; failedAttempts: number; lockedUntil?: string | null }
  | { type: "SWITCH_TO_DEMO" }
  | { type: "LOCK_SESSION" }
  | { type: "RESET_TO_SELECTION" };

/**
 * Pełny kontekst Maszyny Stanów
 */
export interface AuthMachineContext {
  state: AuthState;
  activeProfile: Profile | null;
  selectedProfileForAuth: Profile | null;
  errorMessage: string | null;
  failedPinAttempts: number;
  lockedUntil: string | null;
  isBiometricsSupported: boolean;
  isPasskeySupported: boolean;
}

export const INITIAL_AUTH_CONTEXT: AuthMachineContext = {
  state: "UNINITIALIZED",
  activeProfile: null,
  selectedProfileForAuth: null,
  errorMessage: null,
  failedPinAttempts: 0,
  lockedUntil: null,
  isBiometricsSupported: false,
  isPasskeySupported: false,
};

/**
 * Deterministyczna funkcja przejść (State Transition Function)
 */
export function authReducer(
  context: AuthMachineContext,
  event: AuthEvent
): AuthMachineContext {
  switch (context.state) {
    case "UNINITIALIZED": {
      if (event.type === "STARTUP_COLD") {
        if (!event.hasProfiles || event.defaultDemo) {
          return {
            ...context,
            state: "DEMO_ACTIVE",
            errorMessage: null,
          };
        }
        return {
          ...context,
          state: "LOCKED_PROFILE_SELECTION",
          errorMessage: null,
        };
      }
      break;
    }

    case "DEMO_ACTIVE": {
      if (event.type === "START_ONBOARDING") {
        return {
          ...context,
          state: "ONBOARDING_WIZARD",
          errorMessage: null,
        };
      }
      if (event.type === "LOCK_SESSION" || event.type === "RESET_TO_SELECTION") {
        return {
          ...context,
          state: "LOCKED_PROFILE_SELECTION",
          activeProfile: null,
          selectedProfileForAuth: null,
          errorMessage: null,
        };
      }
      break;
    }

    case "ONBOARDING_WIZARD": {
      if (event.type === "CANCEL_ONBOARDING") {
        return {
          ...context,
          state: context.activeProfile ? "PROFILE_ACTIVE" : "DEMO_ACTIVE",
          errorMessage: null,
        };
      }
      if (event.type === "COMPLETE_ONBOARDING") {
        return {
          ...context,
          state: "PROFILE_ACTIVE",
          activeProfile: event.profile,
          selectedProfileForAuth: null,
          errorMessage: null,
          failedPinAttempts: 0,
          lockedUntil: null,
        };
      }
      break;
    }

    case "LOCKED_PROFILE_SELECTION": {
      if (event.type === "SWITCH_TO_DEMO") {
        return {
          ...context,
          state: "DEMO_ACTIVE",
          activeProfile: null,
          selectedProfileForAuth: null,
          errorMessage: null,
        };
      }
      if (event.type === "START_ONBOARDING") {
        return {
          ...context,
          state: "ONBOARDING_WIZARD",
          errorMessage: null,
        };
      }
      if (event.type === "SELECT_PROFILE") {
        const target = event.profile;
        // Sprawdzenie blokady czasowej anti-bruteforce
        if (target.lockedUntil && new Date(target.lockedUntil).getTime() > Date.now()) {
          return {
            ...context,
            selectedProfileForAuth: target,
            failedPinAttempts: target.failedAttempts || 0,
            lockedUntil: target.lockedUntil,
            errorMessage: "Profil jest tymczasowo zablokowany z powodu zbyt wielu prób.",
          };
        }

        // Profil bez hasła i biometrii odblokowuje się od razu
        if (!target.pinHash && !target.hasBiometrics && !target.passkeyCredentialId) {
          return {
            ...context,
            state: "PROFILE_ACTIVE",
            activeProfile: target,
            selectedProfileForAuth: null,
            errorMessage: null,
            failedPinAttempts: 0,
            lockedUntil: null,
          };
        }

        // Jeśli ma zarejestrowaną biometrię lub passkey, przechodzimy do biometrii
        if (target.hasBiometrics || target.passkeyCredentialId) {
          return {
            ...context,
            state: "AUTHENTICATING_BIOMETRIC",
            selectedProfileForAuth: target,
            errorMessage: null,
          };
        }

        // W przeciwnym razie przechodzimy do wprowadzania kodu PIN
        return {
          ...context,
          state: "AUTHENTICATING_PIN",
          selectedProfileForAuth: target,
          errorMessage: null,
        };
      }
      break;
    }

    case "AUTHENTICATING_BIOMETRIC": {
      if (event.type === "BIOMETRIC_SUCCESS") {
        return {
          ...context,
          state: "PROFILE_ACTIVE",
          activeProfile: event.profile,
          selectedProfileForAuth: null,
          errorMessage: null,
          failedPinAttempts: 0,
          lockedUntil: null,
        };
      }
      if (event.type === "FALLBACK_TO_PIN" || event.type === "BIOMETRIC_FAILED") {
        return {
          ...context,
          state: "AUTHENTICATING_PIN",
          errorMessage: event.type === "BIOMETRIC_FAILED" ? event.reason || "Weryfikacja biometryczna nie powiodła się." : null,
        };
      }
      if (event.type === "RESET_TO_SELECTION") {
        return {
          ...context,
          state: "LOCKED_PROFILE_SELECTION",
          selectedProfileForAuth: null,
          errorMessage: null,
        };
      }
      break;
    }

    case "AUTHENTICATING_PIN": {
      if (event.type === "PIN_SUCCESS") {
        return {
          ...context,
          state: "PROFILE_ACTIVE",
          activeProfile: event.profile,
          selectedProfileForAuth: null,
          errorMessage: null,
          failedPinAttempts: 0,
          lockedUntil: null,
        };
      }
      if (event.type === "PIN_FAILED") {
        return {
          ...context,
          failedPinAttempts: event.failedAttempts,
          lockedUntil: event.lockedUntil || null,
          errorMessage: event.lockedUntil
            ? "Zbyt wiele błędnych prób. Profil został zablokowany."
            : "Nieprawidłowy kod PIN. Spróbuj ponownie.",
        };
      }
      if (event.type === "START_BIOMETRIC_AUTH") {
        return {
          ...context,
          state: "AUTHENTICATING_BIOMETRIC",
          errorMessage: null,
        };
      }
      if (event.type === "RESET_TO_SELECTION") {
        return {
          ...context,
          state: "LOCKED_PROFILE_SELECTION",
          selectedProfileForAuth: null,
          errorMessage: null,
        };
      }
      break;
    }

    case "PROFILE_ACTIVE": {
      if (event.type === "LOCK_SESSION") {
        return {
          ...context,
          state: "LOCKED_PROFILE_SELECTION",
          activeProfile: null,
          selectedProfileForAuth: null,
          errorMessage: null,
        };
      }
      if (event.type === "START_ONBOARDING") {
        return {
          ...context,
          state: "ONBOARDING_WIZARD",
          errorMessage: null,
        };
      }
      if (event.type === "SWITCH_TO_DEMO") {
        return {
          ...context,
          state: "DEMO_ACTIVE",
          activeProfile: null,
          selectedProfileForAuth: null,
          errorMessage: null,
        };
      }
      break;
    }
  }

  return context;
}
