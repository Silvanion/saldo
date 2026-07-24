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
            recurringRuleId: "rule-1"
          }
        ],
        payments: [],
        goals: [],
        investments: [],
        budgets: {}
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
        setApiError: vi.fn()
      })
    );

    act(() => {
      result.current.handleUpdateTransaction("tx-1", {
        name: "Biedronka",
        amount: 150,
        category: "Zakupy"
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
        setApiError: vi.fn()
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
