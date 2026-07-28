import { useCallback } from "react";
import { AppState } from "../../types";
import { getLocalDateIso } from "../../utils";
import { validateAndMigrateState } from "../../utils/stateMigration";

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
  restoreFromDriveManual
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
    // TODO: replace with app modal/toast system
    const confirmed = window.confirm(
      "OSTRZEŻENIE: Ta operacja usunie wszystkie dane profilów (transakcje, płatności, cele, budżety). Jesteś pewien?"
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/state/reset", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        makeUndoBackup();
        saveState(result.data);
        lockProfile();
        setActiveView("dashboard");
        alert("Baza danych została zresetowana do ustawień początkowych.");
      }
    } catch (err) {
      console.error("Failed to reset data:", err);
      alert("Nie udało się zresetować bazy danych.");
    }
  }, [makeUndoBackup, saveState, lockProfile, setActiveView]);

  const handleImportLocalData = useCallback(
    (importedState: AppState) => {
      if (!importedState || !Array.isArray(importedState.profiles)) {
        alert("Błędna struktura pliku JSON. Import przerwany.");
        return;
      }
      const validated = validateAndMigrateState(importedState);
      // TODO: replace with app modal/toast system
      const confirmed = window.confirm(
        "Czy chcesz zastąpić obecne dane danymi z pliku lokalnego? W razie potrzeby możesz cofnąć tę zmianę."
      );
      if (!confirmed) return;

      makeUndoBackup();
      saveState(validated);
      alert("Kopia lokalna została pomyślnie wczytana!");
    },
    [makeUndoBackup, saveState]
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
          alert("Baza budżetu została pomyślnie zapisana na Dysku Google!");
        }
      } catch (err: any) {
        if (!silent) {
          alert(err.message || "Błąd zapisu na Dysku Google. Spróbuj ponownie później.");
        }
      }
    },
    [backupToDriveManual]
  );

  const handleLoadFromDrive = useCallback(async () => {
    // TODO: replace with app modal/toast system
    const confirmed = window.confirm(
      "Czy na pewno chcesz pobrać plik 'saldo_budget.json' z Dysku Google i zastąpić całą lokalną bazę danych? Obecne lokalne dane zostaną trwale nadpisane."
    );
    if (!confirmed) return;

    try {
      await restoreFromDriveManual();
      alert("Baza danych została pomyślnie przywrócona z Dysku Google!");
    } catch (err: any) {
      alert(err.message || "Nie udało się pobrać danych z Dysku Google.");
    }
  }, [restoreFromDriveManual]);

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
