// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { useAppActions } from "./hooks/useAppActions";
import { AppState, Profile, Payment } from "./types";
import { renderHook, act } from "@testing-library/react";

describe("useAppActions - handleUpdatePayment", () => {
  const getMockState = (): AppState => ({
    activeProfileId: "p1",
    profiles: [
      {
        id: "p1",
        name: "Test",
        kind: "personal",
        transactions: [],
        payments: [
          {
            id: "pay-1",
            name: "Netflix",
            amount: 60,
            dueDate: "2024-05-15",
            status: "Do opłacenia",
            isRecurring: true,
            recurringRuleId: "rule-1"
          }
        ],
        goals: [],
        investments: [],
        currency: "PLN", budgets: {}
      }
    ]
  });

  it("should update an existing payment and preserve technical fields", () => {
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
      result.current.handleUpdatePayment("pay-1", {
        name: "Netflix Premium",
        amount: 70,
        dueDate: "2024-05-20"
      });
    });

    expect(saveState).toHaveBeenCalled();
    const updatedProfile = currentState.profiles[0];
    const pay = updatedProfile.payments[0];

    expect(updatedProfile.payments.length).toBe(1);
    expect(pay.name).toBe("Netflix Premium");
    expect(pay.amount).toBe(70);
    expect(pay.dueDate).toBe("2024-05-20");
    expect(pay.id).toBe("pay-1");
    
    // Technical fields should be preserved
    expect(pay.status).toBe("Do opłacenia");
    expect(pay.isRecurring).toBe(true);
    expect(pay.recurringRuleId).toBe("rule-1");
  });

  it("should not call saveState if the payment is not found", () => {
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
      result.current.handleUpdatePayment("pay-999", {
        name: "Netflix Premium"
      });
    });

    expect(saveState).not.toHaveBeenCalled();
  });
});
