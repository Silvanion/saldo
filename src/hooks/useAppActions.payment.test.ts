// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { useAppActions } from "./useAppActions";
import { AppState } from "../types";
import { renderHook, act } from "@testing-library/react";

describe("useAppActions - handleDeletePayment", () => {
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
            name: "Netflix",
            amount: 60,
            type: "expense",
            category: "Subskrypcje",
            account: "Konto główne",
            isoDate: "2024-05-15",
            sourcePaymentId: "pay-1",
              currency: "PLN"
        },
          {
            id: "tx-2",
            name: "Other Tx",
            amount: 10,
            type: "expense",
            category: "Jedzenie",
            account: "Konto główne",
            isoDate: "2024-05-16",
              currency: "PLN"
        }
        ],
        payments: [
          {
            id: "pay-1",
            name: "Netflix",
            amount: 60,
            dueDate: "2024-05-15",
            status: "Opłacono",
              currency: "PLN"
        },
          {
            id: "pay-2",
            name: "Spotify",
            amount: 20,
            dueDate: "2024-05-20",
            status: "Do opłacenia",
              currency: "PLN"
        }
        ],
        goals: [],
        investments: [],
        currency: "PLN", budgets: {}
      }
    ]
  });

  it("should delete payment only and leave linked transaction when mode is 'payment-only'", () => {
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
      result.current.handleDeletePayment("pay-1", "payment-only");
    });

    expect(saveState).toHaveBeenCalled();
    const updatedProfile = currentState.profiles[0];
    
    // payments count -1
    expect(updatedProfile.payments.length).toBe(1);
    expect(updatedProfile.payments.find(p => p.id === "pay-1")).toBeUndefined();

    // transactions count bez zmian
    expect(updatedProfile.transactions.length).toBe(2);
    // linked tx nadal istnieje z sourcePaymentId
    expect(updatedProfile.transactions.find(tx => tx.id === "tx-1")?.sourcePaymentId).toBe("pay-1");
  });

  it("should delete payment and linked transaction when mode is 'payment-and-linked-transaction'", () => {
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
      result.current.handleDeletePayment("pay-1", "payment-and-linked-transaction");
    });

    expect(saveState).toHaveBeenCalled();
    const updatedProfile = currentState.profiles[0];
    
    // payments count -1
    expect(updatedProfile.payments.length).toBe(1);
    
    // linked tx usunięta
    expect(updatedProfile.transactions.length).toBe(1);
    expect(updatedProfile.transactions.find(tx => tx.id === "tx-1")).toBeUndefined();
    // inne tx bez zmian
    expect(updatedProfile.transactions.find(tx => tx.id === "tx-2")).toBeDefined();
  });

  it("should delete unpaid payment (without linked tx) correctly using default mode", () => {
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
      result.current.handleDeletePayment("pay-2");
    });

    expect(saveState).toHaveBeenCalled();
    const updatedProfile = currentState.profiles[0];
    
    expect(updatedProfile.payments.length).toBe(1);
    expect(updatedProfile.payments.find(p => p.id === "pay-2")).toBeUndefined();
    expect(updatedProfile.transactions.length).toBe(2);
  });

  it("should not call saveState if payment id is not found", () => {
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
      result.current.handleDeletePayment("pay-999");
    });

    expect(saveState).not.toHaveBeenCalled();
  });
});
