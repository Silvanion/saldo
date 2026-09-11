import { useCallback } from "react";
import { AppState } from "../../types";
import { ConfirmPayload } from "../../uiTypes";
import { getLocalDateIso } from "../../utils";
import { validateAndMigrateState, createEmptyState } from "../../utils/stateMigration";

interface UseDataSyncActionsProps {
  state: AppState;
  saveState: (newState: AppState) => Promise<void>;
  makeUndoBackup: () => void;
  lockProfile: () => void;
  setActiveView: (view: any) => void;
  connectGoogle: (mode?: "basic" | "drive" | "calendar") => Promise<any>;
  disconnectGoogle: () => Promise<void>;
  toggleAutoSync: (enabled: boolean) => void;
  backupToDriveManual: () => Promise<void>;
  restoreFromDriveManual: () => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  openModal: (type: "confirm", payload: ConfirmPayload) => void;
}

export function useDataSyncActions({
  state,
  saveState,
  makeUndoBackup,
  lockProfile,
  setActiveView,
  connectGoogle,
  disconnectGoogle,
  toggleAutoSync,
  backupToDriveManual,
  restoreFromDriveManual,
  showToast,
  openModal
}: UseDataSyncActionsProps) {
  const handleExportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saldo-kopia-zapasowa-${getLocalDateIso()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const handleResetData = useCallback(async () => {
    openModal("confirm", {
      title: "Reset bazy danych",
      message: "OSTRZEŻENIE: Ta operacja usunie wszystkie dane profilów (transakcje, płatności, cele, budżety). Czy na pewno chcesz kontynuować?",
      confirmLabel: "Zresetuj dane",
      tone: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/state/reset", { method: "POST" });
          if (!res.ok) {
            throw new Error(`Reset request failed with status ${res.status}`);
          }
          const result = await res.json();
          makeUndoBackup();
          await saveState(result.data || createEmptyState());
          lockProfile();
          setActiveView("dashboard");
          showToast("Baza danych została zresetowana do ustawień początkowych.", "success");
        } catch (err) {
          console.error("Failed to reset data:", err);
          showToast("Nie udało się zresetować bazy danych.", "error");
        }
      }
    });
  }, [openModal, makeUndoBackup, saveState, lockProfile, setActiveView, showToast]);

  const handleImportLocalData = useCallback(
    (importedState: AppState) => {
      if (!importedState || !Array.isArray(importedState.profiles)) {
        showToast("Błędna struktura pliku JSON. Import przerwany.", "error");
        return;
      }
      const validated = validateAndMigrateState(importedState);

      openModal("confirm", {
        title: "Wczytanie kopii zapasowej",
        message: "Czy chcesz zastąpić obecne dane danymi z pliku lokalnego? W razie potrzeby możesz cofnąć tę zmianę.",
        confirmLabel: "Importuj i nadpisz",
        tone: "warning",
        onConfirm: async () => {
          try {
            makeUndoBackup();
            await saveState(validated);
            showToast("Kopia lokalna została pomyślnie wczytana!", "success");
          } catch (err) {
            console.error("Failed to import local data:", err);
            showToast("Nie udało się wczytać kopii lokalnej.", "error");
          }
        }
      });
    },
    [openModal, makeUndoBackup, saveState, showToast]
  );

  const handleConnectGoogle = useCallback(async () => {
    try {
      await connectGoogle("drive");
    } catch (e) {
      console.error("Google connect error", e);
    }
  }, [connectGoogle]);

  const handleDisconnectGoogle = useCallback(async () => {
    await disconnectGoogle();
    toggleAutoSync(false);
  }, [disconnectGoogle, toggleAutoSync]);

  const handleSyncToDrive = useCallback(
    async (silent = false) => {
      try {
        await backupToDriveManual();
        if (!silent) {
          showToast(
            "Baza budżetu została pomyślnie zapisana na Dysku Google!",
            "success"
          );
        }
      } catch (err: any) {
        if (!silent) {
          showToast(
            err.message ||
              "Błąd zapisu na Dysku Google. Spróbuj ponownie później.",
            "error"
          );
        }
      }
    },
    [backupToDriveManual, showToast]
  );

  const handleLoadFromDrive = useCallback(async () => {
    openModal("confirm", {
      title: "Przywracanie z Dysku Google",
      message: "Czy na pewno chcesz pobrać plik 'saldo_budget.json' z Dysku Google i zastąpić całą lokalną bazę danych? Obecne lokalne dane zostaną trwale nadpisane.",
      confirmLabel: "Przywróć z Dysku",
      tone: "danger",
      onConfirm: async () => {
        try {
          await restoreFromDriveManual();
          showToast(
            "Baza danych została pomyślnie przywrócona z Dysku Google!",
            "success"
          );
        } catch (err: any) {
          showToast(
            err.message || "Nie udało się pobrać danych z Dysku Google.",
            "error"
          );
        }
      }
    });
  }, [openModal, restoreFromDriveManual, showToast]);

  return {
    handleExportData,
    handleResetData,
    handleImportLocalData,
    handleConnectGoogle,
    handleDisconnectGoogle,
    handleSyncToDrive,
    handleLoadFromDrive
  };
}
