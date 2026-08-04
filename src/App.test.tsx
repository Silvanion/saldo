/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { AppProvider, useApp } from './app/providers/AppContext';
import { AppViewRouter } from './app/AppViewRouter';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    googleUser: null,
    driveToken: null,
    isGoogleAuthenticated: false,
    connectGoogle: vi.fn(),
    disconnectGoogle: vi.fn(),
    invalidateDriveToken: vi.fn()
  })
}));

import * as localDb from './services/localDb';

vi.mock('./services/localDb', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    loadState: vi.fn().mockResolvedValue(null),
    saveState: vi.fn().mockResolvedValue(undefined),
  };
});

const TestHarness = () => {
  const app = useApp();
  React.useEffect(() => {
    app.setActiveView('settings');
  }, [app]);
  
  return (
    <AppViewRouter 
      onOpenTxModal={vi.fn()}
      onOpenBudgetModal={vi.fn()}
      onOpenPaymentModal={vi.fn()}
      onTriggerCalendarAi={vi.fn()}
      onOpenGoalModal={vi.fn()}
      onOpenGoalDepositModal={vi.fn()}
      onOpenProfileModal={vi.fn()}
      onOpenPinModal={vi.fn()}
    />
  );
};

describe('Full App Diagnostic Loop - Forms', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      writable: true
    });
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock localDb.loadState to return a default profile so settings forms render
    vi.mocked(localDb.loadState).mockResolvedValue({
      profiles: [{ id: 'p1', name: 'Test Profile', kind: 'personal', avatar: '👤', accounts: [], currency: 'PLN' } as unknown as any],
      activeProfileId: 'p1',
      recurringRules: [],
      transactionRules: [],
      schemaVersion: 2,
      updatedAt: '2026-08-04T10:00:00.000Z',
      lastModifiedBy: 'test'
    });
  });

  it('should test all forms', async () => {
    let renderResult;
    await act(async () => {
      renderResult = render(
        <AppProvider>
          <TestHarness />
        </AppProvider>
      );
    });

    await screen.findByText('Wszystkie sekcje');

    // 1. Dodaj konto
    const addAccountBtn = screen.getByRole('button', { name: /\+\s*Dodaj konto/i });
    const accNameInput = screen.getByPlaceholderText('np. Konto bieżące, Gotówka');
    await act(async () => {
      fireEvent.change(accNameInput, { target: { value: 'Nowe Konto' } });
      fireEvent.click(addAccountBtn);
    });

    // 2. Dodaj regułę transakcji
    const addTxRuleBtn = screen.getByRole('button', { name: /Zapisz dopasowanie/i });
    const txRuleInput = screen.getByPlaceholderText('np. biedronka, netflix, orlen');
    await act(async () => {
      fireEvent.change(txRuleInput, { target: { value: 'Biedronka' } });
      fireEvent.click(addTxRuleBtn);
    });

    // 3. Dodaj regułę płatności cyklicznej
    const addRecRuleBtn = screen.getByRole('button', { name: /Dodaj harmonogram płatności/i });
    const recRuleName = screen.getByPlaceholderText('np. Abonament Netflix, Pensja');
    const recRuleAmount = screen.getByPlaceholderText('np. 43.99');
    // For date we need querySelector
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    
    await act(async () => {
      fireEvent.change(recRuleName, { target: { value: 'Czynsz' } });
      fireEvent.change(recRuleAmount, { target: { value: '1500' } });
      if (dateInput) {
        fireEvent.change(dateInput, { target: { value: '2026-08-01' } });
      }
      fireEvent.click(addRecRuleBtn);
    });

    // Expect no errors to have been logged
    expect(console.error).not.toHaveBeenCalled();
  });
});
