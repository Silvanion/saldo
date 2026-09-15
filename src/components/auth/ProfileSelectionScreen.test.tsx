/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ProfileSelectionScreen } from './ProfileSelectionScreen';
import { BiometricService } from '../../services/BiometricService';
import { Profile } from '../../types';
import React from 'react';

vi.mock('../../services/BiometricService', () => ({
  BiometricService: {
    checkHardwareStatus: vi.fn().mockResolvedValue({ available: false, isEnrolledForProfile: false, platform: 'web', label: '', hardwareDescription: '', storageBackend: '' }),
    promptUnlock: vi.fn(),
  },
}));

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'p1', name: 'Test Profile', kind: 'personal',
    transactions: [], payments: [], goals: [], investments: [],
    currency: 'PLN', budgets: {},
    ...overrides,
  };
}

describe('ProfileSelectionScreen', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(BiometricService.checkHardwareStatus).mockClear();
    vi.mocked(BiometricService.promptUnlock).mockReset();
  });

  it('unlocks a profile with no PIN immediately without showing the keypad', () => {
    const onUnlockSuccess = vi.fn();
    const profile = makeProfile();
    render(
      <ProfileSelectionScreen
        profiles={[profile]}
        onUnlockSuccess={onUnlockSuccess}
        onStartOnboarding={vi.fn()}
        onEnterDemo={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Test Profile'));
    expect(onUnlockSuccess).toHaveBeenCalledWith(profile);
  });

  it('shows the PIN keypad for a PIN-protected profile without auto-triggering biometrics when none is enrolled', async () => {
    const onUnlockSuccess = vi.fn();
    const profile = makeProfile({ pinHash: 'somehash', salt: 'somesalt' });
    render(
      <ProfileSelectionScreen
        profiles={[profile]}
        onUnlockSuccess={onUnlockSuccess}
        onStartOnboarding={vi.fn()}
        onEnterDemo={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Test Profile'));
    await waitFor(() => expect(screen.getByText('Wprowadź kod PIN lub użyj biometrii')).toBeTruthy());
    expect(BiometricService.promptUnlock).not.toHaveBeenCalled();
  });

  it('auto-triggers the real BiometricService.promptUnlock and forwards the recovered PIN when biometrics are enrolled', async () => {
    vi.mocked(BiometricService.checkHardwareStatus).mockResolvedValueOnce({
      available: true, isEnrolledForProfile: true, platform: 'macos',
      label: 'Touch ID', hardwareDescription: '', storageBackend: '',
    });
    vi.mocked(BiometricService.promptUnlock).mockResolvedValueOnce({ success: true, pin: '1234' });
    const onUnlockSuccess = vi.fn();
    const profile = makeProfile({ pinHash: 'somehash', salt: 'somesalt' });

    render(
      <ProfileSelectionScreen
        profiles={[profile]}
        onUnlockSuccess={onUnlockSuccess}
        onStartOnboarding={vi.fn()}
        onEnterDemo={vi.fn()}
      />
    );

    await waitFor(() => expect(BiometricService.checkHardwareStatus).toHaveBeenCalledWith('p1'));
    fireEvent.click(screen.getByText('Test Profile'));

    await waitFor(() => expect(BiometricService.promptUnlock).toHaveBeenCalledWith('p1', expect.any(String)));
    await waitFor(() => expect(onUnlockSuccess).toHaveBeenCalledWith(profile, '1234'));
  });
});
