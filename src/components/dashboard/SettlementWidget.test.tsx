/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SettlementWidget } from './SettlementWidget';
import { Profile, Transaction, Payment, SettlementEntry } from '../../types';
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

  it('renders nothing when profile.kind is not shared', () => {
    const personalProfile: Profile = {
      ...mockSharedProfile,
      kind: 'personal'
    };

    const { container } = render(
      <SettlementWidget
        profile={personalProfile}
        showToast={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders settled empty state ("Wszystko rozliczone z historii" and "Uregulowane" badge) when historyNet is 0', () => {
    render(
      <SettlementWidget
        profile={mockSharedProfile}
        showToast={vi.fn()}
      />
    );

    expect(screen.getByText('Wszystko rozliczone z historii')).toBeTruthy();
    expect(screen.getByText('Uregulowane')).toBeTruthy();
  });

  it('renders positive balance and "Nadpłata" badge when partner owes user (historyNet > 0)', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        name: 'Zakupy wspólne',
        amount: 200,
        type: 'expense',
        category: 'Jedzenie',
        account: 'acc-1',
        isoDate: '2026-07-20',
        paidBy: 'me',
        splitMode: 'equal',
        currency: 'PLN'
      }
    ];

    const profile: Profile = {
      ...mockSharedProfile,
      transactions
    };

    render(
      <SettlementWidget
        profile={profile}
        showToast={vi.fn()}
      />
    );

    expect(screen.getByText(/Ania jest Ci winien/i)).toBeTruthy();
    expect(screen.getByText('Nadpłata')).toBeTruthy();
  });

  it('renders negative balance and "Niedopłata" badge when user owes partner (historyNet < 0)', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-2',
        name: 'Zakupy partnera',
        amount: 300,
        type: 'expense',
        category: 'Jedzenie',
        account: 'acc-1',
        isoDate: '2026-07-20',
        paidBy: 'partner',
        splitMode: 'equal',
        currency: 'PLN'
      }
    ];

    const profile: Profile = {
      ...mockSharedProfile,
      transactions
    };

    render(
      <SettlementWidget
        profile={profile}
        showToast={vi.fn()}
      />
    );

    expect(screen.getByText(/Jesteś winien Ania/i)).toBeTruthy();
    expect(screen.getByText('Niedopłata')).toBeTruthy();
  });

  it('renders upcoming settlement info when there are unpaid payments with split obligations', () => {
    const payments: Payment[] = [
      {
        id: 'pay-1',
        name: 'Internet',
        amount: 100,
        status: 'Do opłacenia',
        category: 'Media',
        isRecurring: false,
        dueDate: '2026-07-30',
        paidBy: 'me',
        splitMode: 'equal',
        currency: 'PLN'
      }
    ];

    const profile: Profile = {
      ...mockSharedProfile,
      payments
    };

    render(
      <SettlementWidget
        profile={profile}
        showToast={vi.fn()}
      />
    );

    const upcomingInfo = document.getElementById('settlement-upcoming-info');
    expect(upcomingInfo).toBeTruthy();
    expect(upcomingInfo?.textContent).toContain('Dodatkowo z nieopłaconych rachunków');
  });

  it('toggles settlement history list and handles entry deletion', () => {
    const onDeleteSettlement = vi.fn();
    const settlements: SettlementEntry[] = [
      {
        id: 'set-1',
        amount: 150,
        isoDate: '2026-07-15',
        note: 'Rozliczenie za obiad',
        createdAt: '2026-07-15T12:00:00Z'
      }
    ];

    const profile: Profile = {
      ...mockSharedProfile,
      settlements
    };

    render(
      <SettlementWidget
        profile={profile}
        onDeleteSettlement={onDeleteSettlement}
        showToast={vi.fn()}
      />
    );

    // History toggle button should show count (1)
    const historyBtn = screen.getByRole('button', { name: /Historia \(1\)/i });
    expect(historyBtn).toBeTruthy();

    // Before clicking toggle, history list should not be visible
    expect(screen.queryByText('Historia rozliczeń ręcznych')).toBeNull();

    // Click toggle to show history
    fireEvent.click(historyBtn);
    expect(screen.getByText('Historia rozliczeń ręcznych')).toBeTruthy();
    expect(screen.getByText('Rozliczenie za obiad')).toBeTruthy();

    // Click delete button
    const deleteBtn = screen.getByRole('button', { name: /Usuń wpis rozliczenia/i });
    fireEvent.click(deleteBtn);
    expect(onDeleteSettlement).toHaveBeenCalledWith('set-1');
  });

  it('shows error toast when submitting zero or invalid settlement amount', () => {
    const showToast = vi.fn();
    const onAddSettlement = vi.fn();

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
  });

  it('shows error toast when submitting negative settlement amount', () => {
    const showToast = vi.fn();
    const onAddSettlement = vi.fn();

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
  });

  it('successfully records settlement with valid amount without error toast', () => {
    const showToast = vi.fn();
    const onAddSettlement = vi.fn();

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
  });
});
