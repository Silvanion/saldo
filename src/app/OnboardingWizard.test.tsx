/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { OnboardingWizard } from './OnboardingWizard';
import { BiometricService } from '../services/BiometricService';
import React from 'react';

vi.mock('../services/BiometricService', () => ({
  BiometricService: {
    checkHardwareStatus: vi.fn().mockResolvedValue({
      available: false, isEnrolledForProfile: false, platform: 'web',
      label: 'WebAuthn / Passkeys', hardwareDescription: '', storageBackend: '',
    }),
    enrollBiometrics: vi.fn(),
  },
}));

function fillProfileStep() {
  fireEvent.click(screen.getByText('Rozpocznij'));
  fireEvent.change(screen.getByPlaceholderText('np. Budżet Seweryna, Domowy'), { target: { value: 'Mój Budżet' } });
  fireEvent.click(screen.getByText('Dalej'));
}

function enterPin(pin: string) {
  for (const digit of pin) {
    fireEvent.click(screen.getByText(digit, { selector: 'button' }));
  }
}

describe('OnboardingWizard', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(BiometricService.checkHardwareStatus).mockClear();
    vi.mocked(BiometricService.enrollBiometrics).mockReset();
  });

  it('shows the local-first welcome screen with no login form of any kind', () => {
    render(<OnboardingWizard onComplete={vi.fn()} onEnterDemo={vi.fn()} />);
    expect(screen.getByText('Rozpocznij')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByPlaceholderText(/e-?mail/i)).toBeNull();
  });

  it('calls onEnterDemo from the welcome screen', () => {
    const onEnterDemo = vi.fn();
    render(<OnboardingWizard onComplete={vi.fn()} onEnterDemo={onEnterDemo} />);
    fireEvent.click(screen.getByText('Wypróbuj tryb demonstracyjny'));
    expect(onEnterDemo).toHaveBeenCalledTimes(1);
  });

  it('completes the full flow with a matching PIN and calls onComplete with the right payload', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(<OnboardingWizard onComplete={onComplete} onEnterDemo={vi.fn()} />);

    fillProfileStep();
    enterPin('1234');
    await waitFor(() => expect(screen.getByText('Powtórz kod PIN')).toBeTruthy());
    enterPin('1234');

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Mój Budżet',
      kind: 'personal',
      partnerName: '',
      pin: '1234',
      avatar: 'wallet',
      color: 'brand',
      currency: 'PLN',
    }));
  });

  it('shows an error and resets when the PIN confirmation does not match', async () => {
    render(<OnboardingWizard onComplete={vi.fn()} onEnterDemo={vi.fn()} />);

    fillProfileStep();
    enterPin('1234');
    await waitFor(() => expect(screen.getByText('Powtórz kod PIN')).toBeTruthy());
    enterPin('5678');

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText('Ustaw kod PIN')).toBeTruthy();
  });

  it('allows skipping the PIN entirely', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(<OnboardingWizard onComplete={onComplete} onEnterDemo={vi.fn()} />);

    fillProfileStep();
    fireEvent.click(screen.getByText('Pomiń'));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ pin: '' }));
  });

  it('offers biometric enrollment after a matching PIN when hardware is available, and completes onComplete after enrolling', async () => {
    vi.mocked(BiometricService.checkHardwareStatus).mockResolvedValueOnce({
      available: true, isEnrolledForProfile: false, platform: 'macos',
      label: 'Touch ID', hardwareDescription: 'Apple Secure Enclave', storageBackend: 'macOS Keychain',
    });
    vi.mocked(BiometricService.enrollBiometrics).mockResolvedValueOnce({ success: true });
    const onComplete = vi.fn().mockResolvedValue(undefined);

    render(<OnboardingWizard onComplete={onComplete} onEnterDemo={vi.fn()} />);

    fillProfileStep();
    await waitFor(() => expect(BiometricService.checkHardwareStatus).toHaveBeenCalled());
    enterPin('1234');
    await waitFor(() => expect(screen.getByText('Powtórz kod PIN')).toBeTruthy());
    enterPin('1234');

    await waitFor(() => expect(screen.getByText('Włączyć Touch ID?')).toBeTruthy());
    fireEvent.click(screen.getByText('Włącz Touch ID'));

    await waitFor(() => expect(BiometricService.enrollBiometrics).toHaveBeenCalledWith(expect.any(String), '1234'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ pin: '1234' }));
  });

  it('persists the profile exactly once when biometric enrollment fails and the user then clicks skip', async () => {
    vi.mocked(BiometricService.checkHardwareStatus).mockResolvedValueOnce({
      available: true, isEnrolledForProfile: false, platform: 'macos',
      label: 'Touch ID', hardwareDescription: 'Apple Secure Enclave', storageBackend: 'macOS Keychain',
    });
    vi.mocked(BiometricService.enrollBiometrics).mockResolvedValueOnce({ success: false, error: 'Odmowa dostępu do Keychain.' });
    const onComplete = vi.fn().mockResolvedValue(undefined);

    render(<OnboardingWizard onComplete={onComplete} onEnterDemo={vi.fn()} />);

    fillProfileStep();
    await waitFor(() => expect(BiometricService.checkHardwareStatus).toHaveBeenCalled());
    enterPin('1234');
    await waitFor(() => expect(screen.getByText('Powtórz kod PIN')).toBeTruthy());
    enterPin('1234');

    await waitFor(() => expect(screen.getByText('Włączyć Touch ID?')).toBeTruthy());
    fireEvent.click(screen.getByText('Włącz Touch ID'));

    // Enrollment fails, but the profile must already have been persisted before
    // the Keychain write was attempted (otherwise a save failure would leave an
    // orphaned biometric credential for a profile that doesn't exist).
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Odmowa dostępu do Keychain.')).toBeTruthy());

    fireEvent.click(screen.getByText('Pomiń, zostanę przy PIN-ie'));

    // Clicking skip after a failed enrollment must not create a second,
    // duplicate profile with the same id.
    await waitFor(() => expect(screen.getByText('Gotowe!')).toBeTruthy());
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('lets the user skip biometric enrollment and still complete with the PIN', async () => {
    vi.mocked(BiometricService.checkHardwareStatus).mockResolvedValueOnce({
      available: true, isEnrolledForProfile: false, platform: 'macos',
      label: 'Touch ID', hardwareDescription: 'Apple Secure Enclave', storageBackend: 'macOS Keychain',
    });
    const onComplete = vi.fn().mockResolvedValue(undefined);

    render(<OnboardingWizard onComplete={onComplete} onEnterDemo={vi.fn()} />);

    fillProfileStep();
    await waitFor(() => expect(BiometricService.checkHardwareStatus).toHaveBeenCalled());
    enterPin('1234');
    await waitFor(() => expect(screen.getByText('Powtórz kod PIN')).toBeTruthy());
    enterPin('1234');

    await waitFor(() => expect(screen.getByText('Pomiń, zostanę przy PIN-ie')).toBeTruthy());
    fireEvent.click(screen.getByText('Pomiń, zostanę przy PIN-ie'));

    expect(BiometricService.enrollBiometrics).not.toHaveBeenCalled();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ pin: '1234' }));
  });
});
