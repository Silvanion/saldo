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

vi.mock('./services/localDb', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    localDb: {
      ...actual.localDb,
      loadState: vi.fn().mockResolvedValue(null),
      saveState: vi.fn().mockResolvedValue(undefined),
    }
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
    vi.spyOn(console, 'error');
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
    const addAccountBtn = screen.getByText('+ Dodaj konto');
    const accNameInput = screen.getByPlaceholderText('np. Konto firmowe');
    await act(async () => {
      fireEvent.change(accNameInput, { target: { value: 'Nowe Konto' } });
      fireEvent.click(addAccountBtn);
    });

    // 2. Dodaj regułę transakcji
    const addTxRuleBtn = screen.getByText('+ Dodaj regułę');
    const txRuleInput = screen.getByPlaceholderText('Wpisz słowo kluczowe...');
    await act(async () => {
      fireEvent.change(txRuleInput, { target: { value: 'Biedronka' } });
      fireEvent.click(addTxRuleBtn);
    });

    // 3. Dodaj regułę płatności cyklicznej
    const addRecRuleBtn = screen.getByText('＋ Dodaj harmonogram płatności');
    const recRuleName = screen.getByPlaceholderText('np. Czynsz za mieszkanie');
    const recRuleAmount = screen.getByPlaceholderText('0.00');
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
