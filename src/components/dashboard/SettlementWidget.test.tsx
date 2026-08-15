/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SettlementWidget } from './SettlementWidget';
import { Profile } from '../../types';
import React from 'react';

const mockSharedProfile: Profile = {
  id: 'shared-p1',
  name: 'Wspólny',
  kind: 'shared',
  partnerName: 'Ania',
  avatar: '🏠',
  currency: 'PLN',
  accounts: [],
  settlements: [],
  transactions: [],
  payments: [],
  goals: [],
  investments: [],
  budgets: {}
};

describe('SettlementWidget', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows error toast when submitting zero or invalid settlement amount', () => {
    const showToast = vi.fn();
    const onAddSettlement = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <SettlementWidget
        profile={mockSharedProfile}
        onAddSettlement={onAddSettlement}
        showToast={showToast}
      />
    );

    // Open settlement modal
    const openBtn = screen.getByRole('button', { name: /Rozlicz/i });
    fireEvent.click(openBtn);

    // Amount input
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '0' } });

    // Submit form
    const form = document.getElementById('settlement-form') as HTMLFormElement;
    expect(form).toBeTruthy();
    fireEvent.submit(form);

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      'Proszę podać poprawną kwotę większą od zera.',
      'error'
    );
    expect(onAddSettlement).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('shows error toast when submitting negative settlement amount', () => {
    const showToast = vi.fn();
    const onAddSettlement = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <SettlementWidget
        profile={mockSharedProfile}
        onAddSettlement={onAddSettlement}
        showToast={showToast}
      />
    );

    const openBtn = screen.getByRole('button', { name: /Rozlicz/i });
    fireEvent.click(openBtn);

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '-25.50' } });

    const form = document.getElementById('settlement-form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      'Proszę podać poprawną kwotę większą od zera.',
      'error'
    );
    expect(onAddSettlement).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('successfully records settlement with valid amount without error toast', () => {
    const showToast = vi.fn();
    const onAddSettlement = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <SettlementWidget
        profile={mockSharedProfile}
        onAddSettlement={onAddSettlement}
        showToast={showToast}
      />
    );

    const openBtn = screen.getByRole('button', { name: /Rozlicz/i });
    fireEvent.click(openBtn);

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '150.00' } });

    const form = document.getElementById('settlement-form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(showToast).not.toHaveBeenCalled();
    expect(onAddSettlement).toHaveBeenCalledTimes(1);
    expect(onAddSettlement).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 150
      })
    );
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
