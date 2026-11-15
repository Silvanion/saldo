import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  checkBiometricsAvailability,
  authenticateWithBiometrics,
  saveSecurePin,
  verifySecurePin,
  hasConfiguredPin,
} from './biometrics';

vi.mock('expo-local-authentication', () => ({
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  supportedAuthenticationTypesAsync: vi.fn(),
  authenticateAsync: vi.fn(),
}));

vi.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    setItemAsync: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    getItemAsync: vi.fn(async (key: string) => {
      return store.get(key) ?? null;
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

describe('Mobile Biometrics & Secure PIN Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('poprawnie wykrywa wsparcie dla Face ID', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);

    const result = await checkBiometricsAvailability();
    expect(result.hasHardware).toBe(true);
    expect(result.isEnrolled).toBe(true);
    expect(result.biometryTypeLabel).toBe('Face ID');
  });

  it('poprawnie wykrywa wsparcie dla Touch ID / czytnika linii papilarnych', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValue([
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    ]);

    const result = await checkBiometricsAvailability();
    expect(result.biometryTypeLabel).toBe('Touch ID / Odcisk palca');
  });

  it('uwierzytelnia pomyślnie za pomocą promptu biometrycznego', async () => {
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
      success: true,
    } as any);

    const result = await authenticateWithBiometrics('Odblokuj Saldo');
    expect(result.success).toBe(true);
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
      promptMessage: 'Odblokuj Saldo',
      cancelLabel: 'Anuluj',
      fallbackLabel: 'Wprowadź kod PIN',
      disableDeviceFallback: false,
    });
  });

  it('obsługuje błąd uwierzytelnienia biometrycznego', async () => {
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({
      success: false,
      error: 'user_cancel',
    } as any);

    const result = await authenticateWithBiometrics();
    expect(result.success).toBe(false);
    expect(result.error).toBe('user_cancel');
  });

  it('bezpiecznie zapisuje i weryfikuje kod PIN', async () => {
    expect(await hasConfiguredPin()).toBe(false);

    await saveSecurePin('1234');
    expect(await hasConfiguredPin()).toBe(true);
    expect(await verifySecurePin('1234')).toBe(true);
    expect(await verifySecurePin('9999')).toBe(false);
  });
});
