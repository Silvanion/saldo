/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { OnboardingWizard } from './OnboardingWizard';
import React from 'react';

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
  afterEach(() => cleanup());

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
});
