import React, { useEffect, useState } from "react";
import { FolderSearch } from "lucide-react";

// Desktop only: wybrany folder jest obserwowany, a nowy plik CSV/PDF kończy się
// powiadomieniem systemowym. Import nadal przechodzi przez podgląd i wymaga
// potwierdzenia użytkownika.
export function StatementFolderWatchCard() {
  const api = typeof window !== "undefined" ? window.electronAPI : undefined;
  const [folder, setFolder] = useState<string | null>(null);

  useEffect(() => {
    api?.getImportWatchFolder?.().then(setFolder).catch(() => {});
  }, [api]);

  if (!api?.chooseImportWatchFolder) return null;

  const choose = async () => {
    try {
      setFolder(await api.chooseImportWatchFolder!());
    } catch {
      // zachowaj bieżący stan w przypadku błędu
    }
  };

  const clear = async () => {
    try {
      setFolder(await api.clearImportWatchFolder!());
    } catch {
      // zachowaj bieżący stan w przypadku błędu
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-statement-folder-card">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40">
        <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
          <FolderSearch className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-main">Folder z wyciągami bankowymi</h3>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
            Saldo powiadomi Cię, gdy w wybranym folderze pojawi się nowy plik CSV lub PDF. Nic nie jest importowane
            automatycznie — po kliknięciu powiadomienia zobaczysz podgląd i sam zatwierdzasz import. Pliki nie opuszczają komputera.
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-sm text-text-main break-all flex-1" data-testid="statement-folder-path">
          {folder ?? "Nie wybrano folderu"}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={choose}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-surface-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {folder ? "Zmień folder" : "Wybierz folder"}
          </button>
          {folder && (
            <button
              type="button"
              onClick={clear}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-text-muted hover:bg-surface-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Wyłącz
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-text-muted mt-3 leading-relaxed">
        Wskazówka: wybierz osobny folder na wyciągi, a nie cały folder Pobrane — inaczej dostaniesz powiadomienia o każdym pobranym CSV/PDF.
      </p>
    </div>
  );
}
