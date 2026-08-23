// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { useAppActions } from "./hooks/useAppActions";
import { AppState, Profile, Transaction } from "./types";
import { renderHook, act } from "@testing-library/react";

describe("useAppActions - handleUpdateTransaction", () => {
  const getMockState = (): AppState => ({
    activeProfileId: "p1",
    profiles: [
      {
        id: "p1",
        name: "Test",
        kind: "personal",
        transactions: [
          {
            id: "tx-1",
            name: "Zabka",
            amount: 20,
            type: "expense",
            category: "Jedzenie",
            account: "Cash",
            isoDate: "2024-05-15",
            sourcePaymentId: "pay-1",
            isRecurring: true,
            recurringRuleId: "rule-1",
              currency: "PLN"
        }
        ],
        payments: [],
        goals: [],
        investments: [],
        currency: "PLN", budgets: {}
      }
    ]
  });

  it("should update an existing transaction and preserve technical fields", () => {
    let currentState = getMockState();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn(),
        showToast: vi.fn(),
        openModal: vi.fn()
      })
    );

    act(() => {
      result.current.handleUpdateTransaction("tx-1", {
        name: "Biedronka",
        amount: 150,
        category: "Zakupy",
          currency: "PLN"
    });
    });

    expect(saveState).toHaveBeenCalled();
    const updatedProfile = currentState.profiles[0];
    const tx = updatedProfile.transactions[0];

    expect(updatedProfile.transactions.length).toBe(1);
    expect(tx.name).toBe("Biedronka");
    expect(tx.amount).toBe(150);
    expect(tx.category).toBe("Zakupy");
    expect(tx.id).toBe("tx-1");
    // Technical fields should be preserved
    expect(tx.sourcePaymentId).toBe("pay-1");
    expect(tx.isRecurring).toBe(true);
    expect(tx.recurringRuleId).toBe("rule-1");
  });

  it("should not call saveState if the transaction is not found", () => {
    let currentState = getMockState();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn(),
        showToast: vi.fn(),
        openModal: vi.fn()
      })
    );

    act(() => {
      result.current.handleUpdateTransaction("tx-999", {
        name: "Biedronka"
      });
    });

    expect(saveState).not.toHaveBeenCalled();
  });
});

describe("useAppActions - Debt Transaction Balance Integration (Sprint 21)", () => {
  const getMockStateWithDebts = (): AppState => ({
    activeProfileId: "p1",
    profiles: [
      {
        id: "p1",
        name: "Główny",
        kind: "personal",
        transactions: [],
        payments: [],
        goals: [],
        investments: [],
        currency: "PLN",
        budgets: {},
        debts: [
          {
            id: "debt-hipo-1",
            name: "Hipoteka",
            institution: "PKO",
            type: "mortgage",
            currency: "PLN",
            balance: 10000,
            monthlyPayment: 500,
            interestRate: 6.0, // monthly rate = 0.5% -> 50 PLN interest on 10,000 PLN
            status: "active",
            createdAt: "2026-01-01"
          },
          {
            id: "debt-zero-2",
            name: "Raty 0%",
            institution: "Media",
            type: "bnpl",
            currency: "PLN",
            balance: 1200,
            monthlyPayment: 200,
            interestRate: 0,
            status: "active",
            createdAt: "2026-01-01"
          },
          {
            id: "debt-closed-3",
            name: "Spłacony",
            institution: "Alior",
            type: "cash_loan",
            currency: "PLN",
            balance: 0,
            monthlyPayment: 100,
            interestRate: 8.0,
            status: "closed",
            createdAt: "2026-01-01"
          }
        ]
      },
      {
        id: "p2",
        name: "Inny profil",
        kind: "personal",
        transactions: [],
        payments: [],
        goals: [],
        investments: [],
        currency: "PLN",
        budgets: {},
        debts: [
          {
            id: "debt-p2-1",
            name: "Kredyt P2",
            institution: "ING",
            type: "cash_loan",
            currency: "PLN",
            balance: 5000,
            monthlyPayment: 300,
            interestRate: 5.0,
            status: "active",
            createdAt: "2026-01-01"
          }
        ]
      }
    ]
  });

  it("reduces debt balance by principal only on linked transaction creation", () => {
    let currentState = getMockStateWithDebts();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn(),
        showToast: vi.fn(),
        openModal: vi.fn()
      })
    );

    act(() => {
      result.current.handleAddTransaction({
        name: "Rata kredytu hipotecznego",
        amount: 500, // 50 interest, 450 principal
        category: "Rachunki",
        account: "Konto",
        type: "expense",
        isoDate: "2026-03-01",
        debtId: "debt-hipo-1"
      });
    });

    expect(saveState).toHaveBeenCalled();
    const updatedProfile = currentState.profiles[0];
    expect(updatedProfile.transactions.length).toBe(1);
    expect(updatedProfile.transactions[0].debtId).toBe("debt-hipo-1");

    const updatedDebt = updatedProfile.debts?.find((d) => d.id === "debt-hipo-1");
    expect(updatedDebt?.balance).toBe(9550); // 10000 - 450 principal
  });

  it("does not change debt balance for unlinked transaction or non-matching debtId", () => {
    let currentState = getMockStateWithDebts();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn(),
        showToast: vi.fn(),
        openModal: vi.fn()
      })
    );

    act(() => {
      result.current.handleAddTransaction({
        name: "Zakupy",
        amount: 300,
        category: "Jedzenie",
        account: "Konto",
        type: "expense",
        isoDate: "2026-03-01"
      });
    });

    const debt = currentState.profiles[0].debts?.find((d) => d.id === "debt-hipo-1");
    expect(debt?.balance).toBe(10000);
  });

  it("does not change debt balance for income transactions", () => {
    let currentState = getMockStateWithDebts();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn(),
        showToast: vi.fn(),
        openModal: vi.fn()
      })
    );

    act(() => {
      result.current.handleAddTransaction({
        name: "Zwrot odsetek",
        amount: 200,
        category: "Inne",
        account: "Konto",
        type: "income",
        isoDate: "2026-03-01",
        debtId: "debt-hipo-1"
      });
    });

    const debt = currentState.profiles[0].debts?.find((d) => d.id === "debt-hipo-1");
    expect(debt?.balance).toBe(10000);
  });

  it("reverses old impact and applies new impact on transaction update", () => {
    let currentState = getMockStateWithDebts();
    currentState.profiles[0].transactions = [
      {
        id: "tx-pay-1",
        name: "Rata hipo",
        amount: 500, // applied 450 principal
        category: "Rachunki",
        account: "Konto",
        type: "expense",
        isoDate: "2026-03-01",
        debtId: "debt-hipo-1",
        currency: "PLN"
      }
    ];
    currentState.profiles[0].debts![0].balance = 9550; // balance after first 500 PLN payment

    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn(),
        showToast: vi.fn(),
        openModal: vi.fn()
      })
    );

    // Update payment from 500 to 800 PLN
    act(() => {
      result.current.handleUpdateTransaction("tx-pay-1", {
        amount: 800
      });
    });

    const debt = currentState.profiles[0].debts?.find((d) => d.id === "debt-hipo-1");
    // Reversal restored 10000, then 800 applied (50 interest, 750 principal) -> balance = 9250
    expect(debt?.balance).toBe(9250);
  });

  it("restores debt balance when linked transaction is deleted", () => {
    let currentState = getMockStateWithDebts();
    currentState.profiles[0].transactions = [
      {
        id: "tx-pay-1",
        name: "Rata hipo",
        amount: 500,
        category: "Rachunki",
        account: "Konto",
        type: "expense",
        isoDate: "2026-03-01",
        debtId: "debt-hipo-1",
        currency: "PLN"
      }
    ];
    currentState.profiles[0].debts![0].balance = 9550;

    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn(),
        showToast: vi.fn(),
        openModal: vi.fn()
      })
    );

    act(() => {
      result.current.handleDeleteTransaction("tx-pay-1");
    });

    const updatedProfile = currentState.profiles[0];
    expect(updatedProfile.transactions.length).toBe(0);

    const debt = updatedProfile.debts?.find((d) => d.id === "debt-hipo-1");
    expect(debt?.balance).toBe(10000); // restored!
  });

  it("maintains strict profile isolation during debt updates", () => {
    let currentState = getMockStateWithDebts();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn(),
        showToast: vi.fn(),
        openModal: vi.fn()
      })
    );

    act(() => {
      result.current.handleAddTransaction({
        name: "Rata hipo",
        amount: 500,
        category: "Rachunki",
        account: "Konto",
        type: "expense",
        isoDate: "2026-03-01",
        debtId: "debt-hipo-1"
      });
    });

    // Profile 1 debt updated
    expect(currentState.profiles[0].debts![0].balance).toBe(9550);
    // Profile 2 debt completely untouched
    expect(currentState.profiles[1].debts![0].balance).toBe(5000);
  });
});
