// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppActions } from "./hooks/useAppActions";
import { AppState, Profile, FinancialActionPlan } from "./types";

describe("Financial Plans actions in useAppActions", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Test Profile",
    kind: "personal",
    currency: "PLN",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    debts: [],
    financialPlans: [],
  };

  const baseState: AppState = {
    profiles: [baseProfile],
    activeProfileId: "p1",
  };

  const samplePlan: FinancialActionPlan = {
    id: "plan-1",
    skillId: "debt-avalanche-accelerator",
    title: "Spłata karty",
    description: "Opis planu",
    status: "in_progress",
    createdAt: "2026-03-01T12:00:00Z",
    items: [
      { id: "step-1", title: "Nadpłata 100 zł", category: "debt", completed: false },
      { id: "step-2", title: "Spłata końcowa", category: "debt", completed: false },
    ],
  };

  it("handleSaveFinancialPlan dodaje nowy plan do profilu", () => {
    let currentState = { ...baseState };
    const saveState = vi.fn(async (newState: AppState) => {
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
        connectGoogle: vi.fn() as any,
        disconnectGoogle: vi.fn() as any,
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn() as any,
        restoreFromDriveManual: vi.fn() as any,
        showToast: vi.fn(),
        openModal: vi.fn(),
      })
    );

    act(() => {
      result.current.handleSaveFinancialPlan(samplePlan);
    });

    expect(saveState).toHaveBeenCalledTimes(1);
    const updatedPlans = currentState.profiles[0].financialPlans;
    expect(updatedPlans).toHaveLength(1);
    expect(updatedPlans?.[0].title).toBe("Spłata karty");
  });

  it("handleTogglePlanItem przełącza stan kroku i aktualizuje status planu na completed gdy wszystkie zrobione", () => {
    let currentState: AppState = {
      ...baseState,
      profiles: [{ ...baseProfile, financialPlans: [samplePlan] }],
    };
    const saveState = vi.fn(async (newState: AppState) => {
      currentState = newState;
    });

    const { result, rerender } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn() as any,
        disconnectGoogle: vi.fn() as any,
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn() as any,
        restoreFromDriveManual: vi.fn() as any,
        showToast: vi.fn(),
        openModal: vi.fn(),
      })
    );

    // Krok 1: wykonany
    act(() => {
      result.current.handleTogglePlanItem("plan-1", "step-1");
    });

    let plan = currentState.profiles[0].financialPlans?.[0];
    expect(plan?.items[0].completed).toBe(true);
    expect(plan?.items[0].completedAt).toBeDefined();
    expect(plan?.status).toBe("in_progress");

    // Krok 2: wykonany -> status planu staje się "completed"
    rerender();
    act(() => {
      result.current.handleTogglePlanItem("plan-1", "step-2");
    });

    plan = currentState.profiles[0].financialPlans?.[0];
    expect(plan?.items[1].completed).toBe(true);
    expect(plan?.status).toBe("completed");
  });

  it("handleDeleteFinancialPlan usuwa plan z profilu", () => {
    let currentState: AppState = {
      ...baseState,
      profiles: [{ ...baseProfile, financialPlans: [samplePlan] }],
    };
    const saveState = vi.fn(async (newState: AppState) => {
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
        connectGoogle: vi.fn() as any,
        disconnectGoogle: vi.fn() as any,
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn() as any,
        restoreFromDriveManual: vi.fn() as any,
        showToast: vi.fn(),
        openModal: vi.fn(),
      })
    );

    act(() => {
      result.current.handleDeleteFinancialPlan("plan-1");
    });

    expect(saveState).toHaveBeenCalledTimes(1);
    expect(currentState.profiles[0].financialPlans).toHaveLength(0);
  });
});
