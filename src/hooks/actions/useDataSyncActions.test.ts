/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDataSyncActions } from "./useDataSyncActions";
import { ConfirmPayload } from "../../uiTypes";

describe("useDataSyncActions with ConfirmModal and showToast", () => {
  let mockBackup: any;
  let mockRestore: any;
  let mockShowToast: any;
  let mockOpenModal: any;
  let mockSaveState: any;
  let mockMakeUndoBackup: any;
  let mockLockProfile: any;
  let mockSetActiveView: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBackup = vi.fn().mockResolvedValue(undefined);
    mockRestore = vi.fn().mockResolvedValue(undefined);
    mockShowToast = vi.fn();
    mockOpenModal = vi.fn();
    mockSaveState = vi.fn();
    mockMakeUndoBackup = vi.fn();
    mockLockProfile = vi.fn();
    mockSetActiveView = vi.fn();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockImplementation(() => {
      throw new Error("window.confirm should not be called!");
    });
  });

  const getHook = (stateOverrides = {}) =>
    renderHook(() =>
      useDataSyncActions({
        state: { profiles: [{ id: "p1", name: "Osobisty", kind: "personal", payments: [], transactions: [], goals: [], investments: [], currency: "PLN", budgets: {} }] } as any,
        saveState: mockSaveState,
        makeUndoBackup: mockMakeUndoBackup,
        lockProfile: mockLockProfile,
        setActiveView: mockSetActiveView,
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: mockBackup,
        restoreFromDriveManual: mockRestore,
        showToast: mockShowToast,
        openModal: mockOpenModal,
        ...stateOverrides
      })
    );

  describe("handleSyncToDrive", () => {
    it("should use showToast for successful drive backup and not use alert", async () => {
      const { result } = getHook();
      await act(async () => {
        await result.current.handleSyncToDrive(false);
      });
      expect(mockBackup).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        "Baza budżetu została pomyślnie zapisana na Dysku Google!",
        "success"
      );
      expect(window.alert).not.toHaveBeenCalled();
    });

    it("should use showToast for failed drive backup", async () => {
      mockBackup.mockRejectedValue(new Error("Test error"));
      const { result } = getHook();
      await act(async () => {
        await result.current.handleSyncToDrive(false);
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        "Test error",
        "error"
      );
      expect(window.alert).not.toHaveBeenCalled();
    });

    it("should not show toast when silent=true", async () => {
      const { result } = getHook();
      await act(async () => {
        await result.current.handleSyncToDrive(true);
      });
      expect(mockBackup).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  describe("handleLoadFromDrive with ConfirmModal", () => {
    it("opens confirm modal and does nothing if user does not confirm", async () => {
      const { result } = getHook();
      await act(async () => {
        await result.current.handleLoadFromDrive();
      });

      expect(mockOpenModal).toHaveBeenCalledWith("confirm", expect.objectContaining({
        title: "Przywracanie z Dysku Google",
        tone: "danger"
      }));
      expect(mockRestore).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("executes restoreFromDriveManual and shows toast on confirm", async () => {
      const { result } = getHook();
      await act(async () => {
        await result.current.handleLoadFromDrive();
      });

      const confirmCall = mockOpenModal.mock.calls.find((c: any[]) => c[0] === "confirm");
      expect(confirmCall).toBeDefined();
      const payload: ConfirmPayload = confirmCall[1];

      await act(async () => {
        await payload.onConfirm();
      });

      expect(mockRestore).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        "Baza danych została pomyślnie przywrócona z Dysku Google!",
        "success"
      );
    });

    it("shows error toast when restore fails after confirm", async () => {
      mockRestore.mockRejectedValue(new Error("Restore error"));
      const { result } = getHook();
      await act(async () => {
        await result.current.handleLoadFromDrive();
      });

      const confirmCall = mockOpenModal.mock.calls.find((c: any[]) => c[0] === "confirm");
      const payload: ConfirmPayload = confirmCall[1];

      await act(async () => {
        await payload.onConfirm();
      });

      expect(mockShowToast).toHaveBeenCalledWith("Restore error", "error");
    });
  });

  describe("handleResetData with ConfirmModal", () => {
    it("opens confirm modal and does not reset if user cancels", async () => {
      const { result } = getHook();
      await act(async () => {
        await result.current.handleResetData();
      });

      expect(mockOpenModal).toHaveBeenCalledWith("confirm", expect.objectContaining({
        title: "Reset bazy danych",
        tone: "danger"
      }));
      expect(mockMakeUndoBackup).not.toHaveBeenCalled();
      expect(mockSaveState).not.toHaveBeenCalled();
    });

    it("performs reset on confirmation and shows success toast", async () => {
      const globalFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { profiles: [] } })
      });
      vi.stubGlobal("fetch", globalFetch);

      const { result } = getHook();
      await act(async () => {
        await result.current.handleResetData();
      });

      const confirmCall = mockOpenModal.mock.calls.find((c: any[]) => c[0] === "confirm");
      const payload: ConfirmPayload = confirmCall[1];

      await act(async () => {
        await payload.onConfirm();
      });

      expect(globalFetch).toHaveBeenCalledWith("/api/state/reset", { method: "POST" });
      expect(mockMakeUndoBackup).toHaveBeenCalledTimes(1);
      expect(mockSaveState).toHaveBeenCalledWith({ profiles: [] });
      expect(mockLockProfile).toHaveBeenCalledTimes(1);
      expect(mockSetActiveView).toHaveBeenCalledWith("dashboard");
      expect(mockShowToast).toHaveBeenCalledWith("Baza danych została zresetowana do ustawień początkowych.", "success");
      expect(window.alert).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("shows error toast when reset request fails after confirmation", async () => {
      const globalFetch = vi.fn().mockRejectedValue(new Error("Network failure"));
      vi.stubGlobal("fetch", globalFetch);

      const { result } = getHook();
      await act(async () => {
        await result.current.handleResetData();
      });

      const confirmCall = mockOpenModal.mock.calls.find((c: any[]) => c[0] === "confirm");
      const payload: ConfirmPayload = confirmCall[1];

      await act(async () => {
        await payload.onConfirm();
      });

      expect(mockShowToast).toHaveBeenCalledWith("Nie udało się zresetować bazy danych.", "error");
      expect(window.alert).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("shows error toast when saving reset state fails", async () => {
      mockSaveState.mockRejectedValue(new Error("Storage failure"));
      const globalFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { profiles: [] } })
      });
      vi.stubGlobal("fetch", globalFetch);

      const { result } = getHook();
      await act(async () => {
        await result.current.handleResetData();
      });

      const confirmCall = mockOpenModal.mock.calls.find((c: any[]) => c[0] === "confirm");
      const payload: ConfirmPayload = confirmCall[1];

      await act(async () => {
        await payload.onConfirm();
      });

      expect(mockShowToast).toHaveBeenCalledWith("Nie udało się zresetować bazy danych.", "error");
      expect(mockLockProfile).not.toHaveBeenCalled();
      expect(mockSetActiveView).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("shows error toast when reset returns a non-success HTTP status", async () => {
      const globalFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });
      vi.stubGlobal("fetch", globalFetch);

      const { result } = getHook();
      await act(async () => {
        await result.current.handleResetData();
      });

      const confirmCall = mockOpenModal.mock.calls.find((c: any[]) => c[0] === "confirm");
      const payload: ConfirmPayload = confirmCall[1];

      await act(async () => {
        await payload.onConfirm();
      });

      expect(mockShowToast).toHaveBeenCalledWith("Nie udało się zresetować bazy danych.", "error");
      expect(mockMakeUndoBackup).not.toHaveBeenCalled();
      expect(mockSaveState).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe("handleImportLocalData with ConfirmModal", () => {
    it("shows error toast when JSON structure is invalid without opening confirm modal", () => {
      const { result } = getHook();
      act(() => {
        result.current.handleImportLocalData({} as any);
      });

      expect(mockShowToast).toHaveBeenCalledWith("Błędna struktura pliku JSON. Import przerwany.", "error");
      expect(mockOpenModal).not.toHaveBeenCalled();
      expect(mockMakeUndoBackup).not.toHaveBeenCalled();
      expect(mockSaveState).not.toHaveBeenCalled();
      expect(window.alert).not.toHaveBeenCalled();
    });

    it("opens confirm modal for valid state and does not save if not confirmed", () => {
      const { result } = getHook();
      const validState = {
        profiles: [{ id: "p2", name: "Import", kind: "personal", payments: [], transactions: [], goals: [], investments: [], currency: "PLN", budgets: {} }]
      };

      act(() => {
        result.current.handleImportLocalData(validState as any);
      });

      expect(mockOpenModal).toHaveBeenCalledWith("confirm", expect.objectContaining({
        title: "Wczytanie kopii zapasowej",
        tone: "warning"
      }));
      expect(mockSaveState).not.toHaveBeenCalled();
    });

    it("saves state and triggers toast on confirm", async () => {
      const { result } = getHook();
      const validState = {
        profiles: [{ id: "p2", name: "Import", kind: "personal", payments: [], transactions: [], goals: [], investments: [], currency: "PLN", budgets: {} }]
      };

      act(() => {
        result.current.handleImportLocalData(validState as any);
      });

      const confirmCall = mockOpenModal.mock.calls.find((c: any[]) => c[0] === "confirm");
      const payload: ConfirmPayload = confirmCall[1];

      await act(async () => {
        await payload.onConfirm();
      });

      expect(mockMakeUndoBackup).toHaveBeenCalledTimes(1);
      expect(mockSaveState).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith("Kopia lokalna została pomyślnie wczytana!", "success");
      expect(window.alert).not.toHaveBeenCalled();
    });

    it("shows error toast when saving imported state fails", async () => {
      mockSaveState.mockRejectedValue(new Error("Storage failure"));
      const { result } = getHook();
      const validState = {
        profiles: [{ id: "p2", name: "Import", kind: "personal", payments: [], transactions: [], goals: [], investments: [], currency: "PLN", budgets: {} }]
      };

      act(() => {
        result.current.handleImportLocalData(validState as any);
      });

      const confirmCall = mockOpenModal.mock.calls.find((c: any[]) => c[0] === "confirm");
      const payload: ConfirmPayload = confirmCall[1];

      await act(async () => {
        await payload.onConfirm();
      });

      expect(mockShowToast).toHaveBeenCalledWith("Nie udało się wczytać kopii lokalnej.", "error");
      expect(mockShowToast).not.toHaveBeenCalledWith("Kopia lokalna została pomyślnie wczytana!", "success");
    });
  });
});
