import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_STORAGE_KEY = 'saldo_user_pin';
const BIOMETRICS_ENABLED_KEY = 'saldo_biometrics_enabled';

export interface BiometricCheckResult {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometryTypeLabel: string;
}

/**
 * Sprawdza dostępność biometrii (Face ID / Touch ID / Android BiometricPrompt).
 */
export async function checkBiometricsAvailability(): Promise<BiometricCheckResult> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

  let biometryTypeLabel = 'Biometria';
  if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    biometryTypeLabel = 'Face ID';
  } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    biometryTypeLabel = 'Touch ID / Odcisk palca';
  }

  return {
    hasHardware,
    isEnrolled,
    supportedTypes,
    biometryTypeLabel,
  };
}

/**
 * Wywołuje systemowy prompt biometryczny do odblokowania aplikacji.
 */
export async function authenticateWithBiometrics(promptMessage = 'Odblokuj Saldo'): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Anuluj',
      fallbackLabel: 'Wprowadź kod PIN',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error || 'Autoryzacja odrzucona' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Bezpieczne zapisanie kodu PIN w sprzętowej Enklawie (iOS Keychain / Android Keystore).
 */
export async function saveSecurePin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_STORAGE_KEY, pin, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/**
 * Weryfikacja kodu PIN z bezpiecznego magazynu.
 */
export async function verifySecurePin(enteredPin: string): Promise<boolean> {
  const storedPin = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
  return storedPin === enteredPin;
}

/**
 * Sprawdza czy użytkownik skonfigurował już kod PIN w aplikacji.
 */
export async function hasConfiguredPin(): Promise<boolean> {
  const storedPin = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
  return Boolean(storedPin);
}
