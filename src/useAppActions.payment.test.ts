// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppActions } from "./hooks/useAppActions";
import { AppState, Profile } from "./types";

describe("Payment status toggling in useAppActions", () => {
  it("Payment 'Do opłacenia' -> po handleTogglePaymentStatus: status 'Opłacono' i nowa transakcja", () => {
    const mockSaveState = vi.fn();
    const baseProfile: Profile = {
      id: "p1",
      name: "Test",
      kind: "personal",
      payments: [
        {
          id: "pay1",
          name: "Prąd",
          amount: 150,
          status: "Do opłacenia",
          dueDate: "2026-07-20",
          category: "Rachunki",
          paidBy: "me",
          splitMode: "none"
        }
      ],
      transactions: [],
      goals: [],
      investments: [],
      budgets: {},
      accounts: [{ id: "a1", name: "Konto Główne", bankName: "Bank", hasCreditLimit: false, creditLimit: 0 }]
    };

    const state: AppState = {
      profiles: [baseProfile],
      activeProfileId: "p1",
      schemaVersion: 1,
      updatedAt: "2026-07-10T00:00:00Z",
      lastModifiedBy: "me"
    };

    const { result } = renderHook(() => useAppActions({
      state,
      saveState: mockSaveState,
      activeProfile: baseProfile,
      makeUndoBackup: vi.fn(),
      unlockProfile: vi.fn(),
      lockProfile: vi.fn(),
      setActiveView: vi.fn(),
      connectGoogle: vi.fn(),
      disconnectGoogle: vi.fn(),
      toggleAutoSync: vi.fn(),
      backupToDriveManual: vi.fn(),
      restoreFromDriveManual: vi.fn(),
      openModal: vi.fn(),
      addToast: vi.fn()
    }));

    act(() => {
      result.current.handleTogglePaymentStatus("pay1");
    });

    expect(mockSaveState).toHaveBeenCalledTimes(1);
    const newState = mockSaveState.mock.calls[0][0] as AppState;
    const updatedProfile = newState.profiles[0];

    const updatedPayment = updatedProfile.payments[0];
    expect(updatedPayment.status).toBe("Opłacono");

    expect(updatedProfile.transactions).toHaveLength(1);
    const newTx = updatedProfile.transactions[0];
    expect(newTx.name).toBe("Prąd");
    expect(newTx.amount).toBe(150);
    expect(newTx.type).toBe("expense");
    expect(newTx.category).toBe("Rachunki");
    expect(newTx.account).toBe("Konto Główne");
    expect(newTx.paidBy).toBe("me");
    expect(newTx.splitMode).toBe("none");
    expect(newTx.sourcePaymentId).toBe("pay1");
  });

  it("Payment 'Opłacono' -> drugie wywołanie nie tworzy transakcji i status się nie zmienia", () => {
    const mockSaveState = vi.fn();
    const baseProfile: Profile = {
      id: "p1",
      name: "Test",
      kind: "personal",
      payments: [
        {
          id: "pay1",
          name: "Prąd",
          amount: 150,
          status: "Opłacono",
          dueDate: "2026-07-20",
          category: "Rachunki"
        }
      ],
      transactions: [
        { id: "tx-old", name: "Prąd", amount: 150, type: "expense", category: "Rachunki", account: "Konto", isoDate: "2026-07-20" }
      ],
      goals: [],
      investments: [],
      budgets: {}
    };

    const state: AppState = {
      profiles: [baseProfile],
      activeProfileId: "p1",
      schemaVersion: 1,
      updatedAt: "2026-07-10T00:00:00Z",
      lastModifiedBy: "me"
    };

    const mockSetApiError = vi.fn();

    const { result } = renderHook(() => useAppActions({
      state,
      saveState: mockSaveState,
      activeProfile: baseProfile,
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
      openModal: vi.fn(),
      addToast: vi.fn()
    }));

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    act(() => {
      result.current.handleTogglePaymentStatus("pay1");
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith("Cofanie statusu 'Opłacono' jest zablokowane.");
    expect(mockSetApiError).toHaveBeenCalledWith("Nie można cofnąć statusu „Opłacono”. Usuń powiązaną transakcję ręcznie, jeśli to pomyłka.");
    consoleWarnSpy.mockRestore();

    // should not update state
    expect(mockSaveState).not.toHaveBeenCalled();
    expect(baseProfile.payments[0].status).toBe("Opłacono");
    expect(baseProfile.transactions).toHaveLength(1);
  });

  it("Payment 'Do opłacenia', ale transakcja z sourcePaymentId już istnieje -> zmiana statusu na 'Opłacono' bez dodania nowej transakcji", () => {
    const mockSaveState = vi.fn();
    const baseProfile: Profile = {
      id: "p1",
      name: "Test",
      kind: "personal",
      payments: [
        {
          id: "pay1",
          name: "Prąd",
          amount: 150,
          status: "Do opłacenia",
          dueDate: "2026-07-20",
          category: "Rachunki"
        }
      ],
      transactions: [
        {
          id: "tx-existing",
          name: "Prąd",
          amount: 150,
          type: "expense",
          category: "Rachunki",
          account: "Konto Główne",
          isoDate: "2026-07-20",
          sourcePaymentId: "pay1"
        }
      ],
      goals: [],
      investments: [],
      budgets: {}
    };

    const state: AppState = {
      profiles: [baseProfile],
      activeProfileId: "p1",
      schemaVersion: 1,
      updatedAt: "2026-07-10T00:00:00Z",
      lastModifiedBy: "me"
    };

    const { result } = renderHook(() =>
      useAppActions({
        state,
        saveState: mockSaveState,
        activeProfile: baseProfile,
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
      openModal: vi.fn(),
      addToast: vi.fn()
    })
    );

    act(() => {
      result.current.handleTogglePaymentStatus("pay1");
    });

    expect(mockSaveState).toHaveBeenCalledTimes(1);
    const newState = mockSaveState.mock.calls[0][0] as AppState;
    const updatedProfile = newState.profiles[0];

    expect(updatedProfile.payments[0].status).toBe("Opłacono");
    expect(updatedProfile.transactions).toHaveLength(1);
    expect(updatedProfile.transactions[0].id).toBe("tx-existing");
  });

  describe("handleImportTransactions deduplication & sanity checks", () => {
    it("Import 2x tego samego CSV (tych samych transakcji) -> liczba transakcji nie podwaja się", () => {
      const mockSaveState = vi.fn();
      let currentProfile: Profile = {
        id: "p1",
        name: "Test",
        kind: "personal",
        payments: [],
        transactions: [],
        goals: [],
        investments: [],
        budgets: {}
      };

      const state: AppState = {
        profiles: [currentProfile],
        activeProfileId: "p1",
        schemaVersion: 1,
        updatedAt: "2026-07-10T00:00:00Z",
        lastModifiedBy: "me"
      };

      const mockSave = async (newState: AppState) => {
        mockSaveState(newState);
        currentProfile = newState.profiles[0];
      };

      const { result, rerender } = renderHook(
        ({ activeP }) =>
          useAppActions({
            state: { ...state, profiles: [activeP] },
            saveState: mockSave,
            activeProfile: activeP,
            makeUndoBackup: vi.fn(),
            unlockProfile: vi.fn(),
            lockProfile: vi.fn(),
            setActiveView: vi.fn(),
            connectGoogle: vi.fn(),
            disconnectGoogle: vi.fn(),
            toggleAutoSync: vi.fn(),
            backupToDriveManual: vi.fn(),
            restoreFromDriveManual: vi.fn(),
      openModal: vi.fn(),
      addToast: vi.fn()
    }),
        { initialProps: { activeP: currentProfile } }
      );

      const batchToImport = [
        { id: "tx-csv-1", name: "Zakupy", amount: 100, type: "expense" as const, category: "Jedzenie", account: "Konto", isoDate: "2026-07-20" },
        { id: "tx-csv-2", name: "Paliwo", amount: 200, type: "expense" as const, category: "Transport", account: "Konto", isoDate: "2026-07-21" }
      ];

      // Pierwszy import
      act(() => {
        result.current.handleImportTransactions(batchToImport);
      });

      expect(currentProfile.transactions).toHaveLength(2);

      // Rerender z zaktualizowanym profilem
      rerender({ activeP: currentProfile });

      // Drugi import tego samego zestawu
      act(() => {
        result.current.handleImportTransactions(batchToImport);
      });

      expect(currentProfile.transactions).toHaveLength(2);
    });

    it("Transakcja z amount NaN -> nie jest dodana", () => {
      const mockSaveState = vi.fn();
      let currentProfile: Profile = {
        id: "p1",
        name: "Test",
        kind: "personal",
        payments: [],
        transactions: [],
        goals: [],
        investments: [],
        budgets: {}
      };

      const state: AppState = {
        profiles: [currentProfile],
        activeProfileId: "p1",
        schemaVersion: 1,
        updatedAt: "2026-07-10T00:00:00Z",
        lastModifiedBy: "me"
      };

      const mockSave = async (newState: AppState) => {
        mockSaveState(newState);
        currentProfile = newState.profiles[0];
      };

      const { result } = renderHook(() =>
        useAppActions({
          state: { ...state, profiles: [currentProfile] },
          saveState: mockSave,
          activeProfile: currentProfile,
          makeUndoBackup: vi.fn(),
          unlockProfile: vi.fn(),
          lockProfile: vi.fn(),
          setActiveView: vi.fn(),
          connectGoogle: vi.fn(),
          disconnectGoogle: vi.fn(),
          toggleAutoSync: vi.fn(),
          backupToDriveManual: vi.fn(),
          restoreFromDriveManual: vi.fn(),
      openModal: vi.fn(),
      addToast: vi.fn()
    })
      );

      const invalidBatch = [
        { id: "tx-valid", name: "Kawa", amount: 15, type: "expense" as const, category: "Jedzenie", account: "Konto", isoDate: "2026-07-20" },
        { id: "tx-nan", name: "Błędna transakcja", amount: NaN, type: "expense" as const, category: "Jedzenie", account: "Konto", isoDate: "2026-07-20" }
      ];

      act(() => {
        result.current.handleImportTransactions(invalidBatch);
      });

      expect(currentProfile.transactions).toHaveLength(1);
      expect(currentProfile.transactions[0].id).toBe("tx-valid");
    });
  });

  describe("handleDeletePayment", () => {
    it("should delete only payment when mode is payment-only", () => {
      let currentProfile: Profile = {
        id: "p1",
        name: "Test",
        kind: "personal",
        payments: [{ id: "pay1", name: "Prąd", amount: 150, dueDate: "2026-07-20", status: "Do opłacenia" }],
        transactions: [{ id: "tx1", name: "Prąd", amount: 150, type: "expense", category: "Rachunki", account: "Konto", isoDate: "2026-07-20", sourcePaymentId: "pay1", tags: [] }],
        goals: [],
        investments: [],
        budgets: {}
      };

      const state: AppState = { profiles: [currentProfile], activeProfileId: "p1", schemaVersion: 1, updatedAt: "", lastModifiedBy: "" };
      const { result } = renderHook(() => useAppActions({ state, saveState: async (s) => { currentProfile = s.profiles[0]; }, activeProfile: currentProfile, makeUndoBackup: vi.fn(), unlockProfile: vi.fn(), lockProfile: vi.fn(), setActiveView: vi.fn(), connectGoogle: vi.fn(), disconnectGoogle: vi.fn(), toggleAutoSync: vi.fn(), backupToDriveManual: vi.fn(), restoreFromDriveManual: vi.fn(), openModal: vi.fn(), addToast: vi.fn(), setApiError: vi.fn() }));

      act(() => {
        result.current.handleDeletePayment("pay1", "payment-only");
      });

      expect(currentProfile.payments).toHaveLength(0);
      expect(currentProfile.transactions).toHaveLength(1);
    });

    it("should delete payment and transaction when mode is payment-and-linked-transaction", () => {
      let currentProfile: Profile = {
        id: "p1",
        name: "Test",
        kind: "personal",
        payments: [{ id: "pay1", name: "Prąd", amount: 150, dueDate: "2026-07-20", status: "Do opłacenia" }],
        transactions: [{ id: "tx1", name: "Prąd", amount: 150, type: "expense", category: "Rachunki", account: "Konto", isoDate: "2026-07-20", sourcePaymentId: "pay1", tags: [] }],
        goals: [],
        investments: [],
        budgets: {}
      };

      const state: AppState = { profiles: [currentProfile], activeProfileId: "p1", schemaVersion: 1, updatedAt: "", lastModifiedBy: "" };
      const { result } = renderHook(() => useAppActions({ state, saveState: async (s) => { currentProfile = s.profiles[0]; }, activeProfile: currentProfile, makeUndoBackup: vi.fn(), unlockProfile: vi.fn(), lockProfile: vi.fn(), setActiveView: vi.fn(), connectGoogle: vi.fn(), disconnectGoogle: vi.fn(), toggleAutoSync: vi.fn(), backupToDriveManual: vi.fn(), restoreFromDriveManual: vi.fn(), openModal: vi.fn(), addToast: vi.fn(), setApiError: vi.fn() }));

      act(() => {
        result.current.handleDeletePayment("pay1", "payment-and-linked-transaction");
      });

      expect(currentProfile.payments).toHaveLength(0);
      expect(currentProfile.transactions).toHaveLength(0);
    });

    it("should delete payment without linked tx normally", () => {
      let currentProfile: Profile = {
        id: "p1", name: "Test", kind: "personal",
        payments: [{ id: "pay1", name: "Prąd", amount: 150, dueDate: "2026-07-20", status: "Do opłacenia" }],
        transactions: [], goals: [], investments: [], budgets: {}
      };
      const state: AppState = { profiles: [currentProfile], activeProfileId: "p1", schemaVersion: 1, updatedAt: "", lastModifiedBy: "" };
      const { result } = renderHook(() => useAppActions({ state, saveState: async (s) => { currentProfile = s.profiles[0]; }, activeProfile: currentProfile, makeUndoBackup: vi.fn(), unlockProfile: vi.fn(), lockProfile: vi.fn(), setActiveView: vi.fn(), connectGoogle: vi.fn(), disconnectGoogle: vi.fn(), toggleAutoSync: vi.fn(), backupToDriveManual: vi.fn(), restoreFromDriveManual: vi.fn(), openModal: vi.fn(), addToast: vi.fn(), setApiError: vi.fn() }));

      act(() => { result.current.handleDeletePayment("pay1", "payment-only"); });
      expect(currentProfile.payments).toHaveLength(0);
    });

    it("missing linked tx still allows payment delete in payment-and-linked-transaction mode", () => {
      let currentProfile: Profile = {
        id: "p1", name: "Test", kind: "personal",
        payments: [{ id: "pay1", name: "Prąd", amount: 150, dueDate: "2026-07-20", status: "Do opłacenia" }],
        transactions: [{ id: "tx2", name: "Inne", amount: 100, type: "expense", category: "Inne", account: "Konto", isoDate: "2026-07-20", tags: [] }],
        goals: [], investments: [], budgets: {}
      };
      const state: AppState = { profiles: [currentProfile], activeProfileId: "p1", schemaVersion: 1, updatedAt: "", lastModifiedBy: "" };
      const { result } = renderHook(() => useAppActions({ state, saveState: async (s) => { currentProfile = s.profiles[0]; }, activeProfile: currentProfile, makeUndoBackup: vi.fn(), unlockProfile: vi.fn(), lockProfile: vi.fn(), setActiveView: vi.fn(), connectGoogle: vi.fn(), disconnectGoogle: vi.fn(), toggleAutoSync: vi.fn(), backupToDriveManual: vi.fn(), restoreFromDriveManual: vi.fn(), openModal: vi.fn(), addToast: vi.fn(), setApiError: vi.fn() }));

      act(() => { result.current.handleDeletePayment("pay1", "payment-and-linked-transaction"); });
      expect(currentProfile.payments).toHaveLength(0);
      expect(currentProfile.transactions).toHaveLength(1);
    });

    it("missing payment id results in safe no-op without crash", () => {
      let currentProfile: Profile = {
        id: "p1", name: "Test", kind: "personal",
        payments: [{ id: "pay1", name: "Prąd", amount: 150, dueDate: "2026-07-20", status: "Do opłacenia" }],
        transactions: [], goals: [], investments: [], budgets: {}
      };
      const state: AppState = { profiles: [currentProfile], activeProfileId: "p1", schemaVersion: 1, updatedAt: "", lastModifiedBy: "" };
      const { result } = renderHook(() => useAppActions({ state, saveState: async (s) => { currentProfile = s.profiles[0]; }, activeProfile: currentProfile, makeUndoBackup: vi.fn(), unlockProfile: vi.fn(), lockProfile: vi.fn(), setActiveView: vi.fn(), connectGoogle: vi.fn(), disconnectGoogle: vi.fn(), toggleAutoSync: vi.fn(), backupToDriveManual: vi.fn(), restoreFromDriveManual: vi.fn(), openModal: vi.fn(), addToast: vi.fn(), setApiError: vi.fn() }));

      act(() => { result.current.handleDeletePayment("missing-id", "payment-and-linked-transaction"); });
      expect(currentProfile.payments).toHaveLength(1);
    });
  });
});
