// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppActions } from "./hooks/useAppActions";
import { applyGoalTransferToProfile, applyGoalTransfer } from "./services/goalTransfers";
import { calculateSafeToSpend } from "./services/budgetCalculations";
import { AppState, Profile } from "./types";

describe("Goal Deposit/Withdraw (Real Model A Handler)", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Model A Profile",
    kind: "personal",
    transactions: [
      { id: "t1", name: "Wynagrodzenie", amount: 4000, type: "income", category: "Praca", account: "Konto", isoDate: "2026-07-01",
          currency: "PLN"
    }
    ],
    payments: [],
    goals: [
      { id: "g1", name: "Wakacje", target: 2000, saved: 500, transfers: [] }
    ],
    investments: [],
    currency: "PLN", budgets: {}
  };

  it("Wpłata +200 zwiększa saved i dopisuje transfer", () => {
    const updated = applyGoalTransferToProfile(baseProfile, "g1", 200, "2026-07-20", { note: "Wpłata na cele" });
    const goal = updated.goals.find((g) => g.id === "g1");
    expect(goal?.saved).toBe(700);
    expect(goal?.transfers).toHaveLength(1);
    expect(goal?.transfers?.[0].amount).toBe(200);
    expect(goal?.transfers?.[0].note).toBe("Wpłata na cele");
    expect(goal?.transfers?.[0].isoDate).toBe("2026-07-20");
  });

  it("Wypłata większa niż saved jest clampowana do -saved", () => {
    // Proba wyciągnięcia 600zł przy saved = 500zł -> clamp do -500zł
    const updated = applyGoalTransferToProfile(baseProfile, "g1", -600, "2026-07-20");
    const goal = updated.goals.find((g) => g.id === "g1");
    expect(goal?.saved).toBe(0);
    expect(goal?.transfers).toHaveLength(1);
    expect(goal?.transfers?.[0].amount).toBe(-500);
    expect(goal?.transfers?.[0].note).toBe("Wypłata");
  });

  it("Wypłata przy saved = 0 nie zmienia celu ani nie dodaje transferu", () => {
    const zeroSavedGoal = { id: "g2", name: "Auto", target: 1000, saved: 0, transfers: [] };
    const res = applyGoalTransfer(zeroSavedGoal, -100, "2026-07-20");
    expect(res.saved).toBe(0);
    expect(res.transfers).toHaveLength(0);
  });

  it("Brak tworzenia transaction jako side effect (brak double-count)", () => {
    const initialTxsLength = baseProfile.transactions.length;
    const updated = applyGoalTransferToProfile(baseProfile, "g1", 300, "2026-07-20");
    
    // Transakcje nie zostały zmienione ani zniekształcone
    expect(updated.transactions.length).toBe(initialTxsLength);
    expect(updated.transactions).toEqual(baseProfile.transactions);
  });

  it("calculateSafeToSpend pozostaje spójne z Model A przy wpłatach i wypłatach", () => {
    // Początkowo: saldo 4000, zaoszczędzone na cele 500 -> safeToSpend = 3500
    const initialSafe = calculateSafeToSpend(baseProfile, [], "2026-07-15");
    expect(initialSafe.currentBalance).toBe(4000);
    expect(initialSafe.reservedGoalsSum).toBe(500);
    expect(initialSafe.safeToSpend).toBe(3500);

    // Po wpłacie 200: zaoszczędzone = 700, safeToSpend = 3300, saldo nie ulega zmianie
    const updatedDeposit = applyGoalTransferToProfile(baseProfile, "g1", 200, "2026-07-20");
    const safeAfterDeposit = calculateSafeToSpend(updatedDeposit, [], "2026-07-15");
    expect(safeAfterDeposit.currentBalance).toBe(4000);
    expect(safeAfterDeposit.reservedGoalsSum).toBe(700);
    expect(safeAfterDeposit.safeToSpend).toBe(3300);

    // Po wypłacie 300 z celu: zaoszczędzone = 200, safeToSpend = 3800, saldo nie ulega zmianie
    const updatedWithdraw = applyGoalTransferToProfile(baseProfile, "g1", -300, "2026-07-20");
    const safeAfterWithdraw = calculateSafeToSpend(updatedWithdraw, [], "2026-07-15");
    expect(safeAfterWithdraw.currentBalance).toBe(4000);
    expect(safeAfterWithdraw.reservedGoalsSum).toBe(200);
    expect(safeAfterWithdraw.safeToSpend).toBe(3800);
  });

  describe("handleDeleteGoal logic in useAppActions", () => {
    it("Goal z saved=0 -> usuwa go z listy i wywołuje saveState", () => {
      const mockSaveState = vi.fn();
      const profile: Profile = {
        ...baseProfile,
        goals: [
          { id: "g-zero", name: "Cel zero", target: 1000, saved: 0 }
        ]
      };
      const state: AppState = {
        profiles: [profile],
        activeProfileId: "p1",
        schemaVersion: 1,
        updatedAt: "2026-07-10T00:00:00Z",
        lastModifiedBy: "me"
      };

      const { result } = renderHook(() =>
        useAppActions({
          state,
          saveState: mockSaveState,
          activeProfile: profile,
          makeUndoBackup: vi.fn(),
          unlockProfile: vi.fn(),
          lockProfile: vi.fn(),
          setActiveView: vi.fn(),
          connectGoogle: vi.fn(),
          disconnectGoogle: vi.fn(),
          toggleAutoSync: vi.fn(),
          backupToDriveManual: vi.fn(),
          restoreFromDriveManual: vi.fn(),
          showToast: vi.fn(),
          openModal: vi.fn()
        })
      );

      act(() => {
        result.current.handleDeleteGoal("g-zero");
      });

      expect(mockSaveState).toHaveBeenCalledTimes(1);
      const newState = mockSaveState.mock.calls[0][0] as AppState;
      expect(newState.profiles[0].goals).toHaveLength(0);
    });

    it("Goal z saved>0 -> blokada usunięcia, expect(mockSaveState).not.toHaveBeenCalled()", () => {
      const mockSaveState = vi.fn();
      const profile: Profile = {
        ...baseProfile,
        goals: [
          { id: "g-saved", name: "Cel ze środkami", target: 1000, saved: 250 }
        ]
      };
      const state: AppState = {
        profiles: [profile],
        activeProfileId: "p1",
        schemaVersion: 1,
        updatedAt: "2026-07-10T00:00:00Z",
        lastModifiedBy: "me"
      };

      const mockSetApiError = vi.fn();

      const { result } = renderHook(() =>
        useAppActions({
          state,
          saveState: mockSaveState,
          activeProfile: profile,
          makeUndoBackup: vi.fn(),
          unlockProfile: vi.fn(),
          lockProfile: vi.fn(),
          setActiveView: vi.fn(),
          connectGoogle: vi.fn(),
          disconnectGoogle: vi.fn(),
          toggleAutoSync: vi.fn(),
          backupToDriveManual: vi.fn(),
          restoreFromDriveManual: vi.fn(),
          setApiError: mockSetApiError,
          showToast: vi.fn(),
          openModal: vi.fn()
        })
      );

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      act(() => {
        result.current.handleDeleteGoal("g-saved");
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith("Nie można usunąć celu oszczędnościowego z dodatnimi środkami.");
      expect(mockSetApiError).toHaveBeenCalledWith("Nie można usunąć celu z wpłaconymi środkami. Najpierw wypłać oszczędności.");
      consoleWarnSpy.mockRestore();

      expect(mockSaveState).not.toHaveBeenCalled();
    });
  });
});
