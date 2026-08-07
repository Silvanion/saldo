
import React, { useRef } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { AppState } from "../types";
import { AlertTriangle, Download, Upload, X } from "lucide-react";

export type ConflictResolutionChoice = "download_remote" | "upload_local" | "cancel";

export interface DriveConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  localState: AppState | null;
  remoteState: AppState | null;
  lastSyncedAt?: string | null;
  onResolve: (choice: ConflictResolutionChoice) => void;
}

export function DriveConflictModal({
  isOpen,
  onClose,
  localState,
  remoteState,
  lastSyncedAt,
  onResolve
}: DriveConflictModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  if (!isOpen || !localState || !remoteState) return null;

  const countTransactions = (s: AppState) => {
    return (s.profiles || []).reduce((acc, p) => acc + (p.transactions?.length || 0), 0);
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "Brak danych";
    try {
      return new Date(isoStr).toLocaleString("pl-PL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch (_) {
      return isoStr;
    }
  };

  const hasSharedProfile =
    localState.profiles?.some((p) => p.kind === "shared") ||
    remoteState.profiles?.some((p) => p.kind === "shared");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="drive-conflict-title"
        className="bg-bg-base/95 backdrop-blur-2xl rounded-2xl max-w-2xl w-full shadow-xl border border-border flex flex-col max-h-[90vh] overflow-hidden"
        ref={modalRef}
      >
        {/* Header */}
        <div className="flex items-start justify-between shrink-0 p-6 pb-4 border-b border-border sticky top-0 z-20 bg-bg-base/95 backdrop-blur-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="drive-conflict-title" className="text-lg font-bold text-white truncate" title="Wykryto konflikt wersji (Dysk Google)">Wykryto konflikt wersji (Dysk Google)</h3>
              <p className="text-xs text-text-muted truncate" title={`Lokalna baza i plik w chmurze różnią się od ostatniej synchronizacji (${formatDate(lastSyncedAt)}).`}>
                Lokalna baza i plik w chmurze różnią się od ostatniej synchronizacji ({formatDate(lastSyncedAt)}).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="p-1 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-offset transition-colors active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-w-0 p-6 space-y-5 custom-scrollbar">
          {/* Informational warning text */}
          <p className="text-sm text-text-muted">
            Wykryto nowsze modyfikacje po obu stronach. Aby uniknąć utraty danych, wybierz, którą wersję chcesz zachować:
          </p>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Local State Card */}
            <div className="border border-border rounded-xl p-4 bg-surface flex flex-col gap-2 min-w-0">
              <div className="flex items-center justify-between border-b border-border pb-2 gap-2">
                <span className="font-bold text-sm text-text-main truncate" title="Wersja lokalna">Wersja lokalna</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                  To urządzenie
                </span>
              </div>
              <div className="text-xs text-text-muted space-y-1 mt-1">
                <p className="flex justify-between items-center min-w-0 gap-2">
                  <span className="text-text-muted truncate">Ostatnia zmiana:</span>{" "}
                  <strong className="text-text-main truncate text-right">{formatDate(localState.updatedAt)}</strong>
                </p>
                <p className="flex justify-between items-center min-w-0 gap-2">
                  <span className="text-text-muted truncate">Przez:</span>{" "}
                  <span className="text-text-main truncate text-right" title={localState.lastModifiedBy || "użytkownik lokalny"}>{localState.lastModifiedBy || "użytkownik lokalny"}</span>
                </p>
                <p className="flex justify-between items-center min-w-0 gap-2">
                  <span className="text-text-muted truncate">Liczba profili:</span>{" "}
                  <strong className="text-text-main truncate text-right">{localState.profiles?.length || 0}</strong>
                </p>
                <p className="flex justify-between items-center min-w-0 gap-2">
                  <span className="text-text-muted truncate">Łączna liczba transakcji:</span>{" "}
                  <strong className="text-text-main truncate text-right">{countTransactions(localState)}</strong>
                </p>
              </div>
            </div>

            {/* Remote State Card */}
            <div className="border border-border rounded-xl p-4 bg-surface flex flex-col gap-2 min-w-0">
              <div className="flex items-center justify-between border-b border-border pb-2 gap-2">
                <span className="font-bold text-sm text-text-main truncate" title="Wersja w chmurze">Wersja w chmurze</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-text-main shrink-0">
                  Dysk Google
                </span>
              </div>
              <div className="text-xs text-text-muted space-y-1 mt-1">
                <p className="flex justify-between items-center min-w-0 gap-2">
                  <span className="text-text-muted truncate">Ostatnia zmiana:</span>{" "}
                  <strong className="text-text-main truncate text-right">{formatDate(remoteState.updatedAt)}</strong>
                </p>
                <p className="flex justify-between items-center min-w-0 gap-2">
                  <span className="text-text-muted truncate">Przez:</span>{" "}
                  <span className="text-text-main truncate text-right" title={remoteState.lastModifiedBy || "Dysk Google"}>{remoteState.lastModifiedBy || "Dysk Google"}</span>
                </p>
                <p className="flex justify-between items-center min-w-0 gap-2">
                  <span className="text-text-muted truncate">Liczba profili:</span>{" "}
                  <strong className="text-text-main truncate text-right">{remoteState.profiles?.length || 0}</strong>
                </p>
                <p className="flex justify-between items-center min-w-0 gap-2">
                  <span className="text-text-muted truncate">Łączna liczba transakcji:</span>{" "}
                  <strong className="text-text-main truncate text-right">{countTransactions(remoteState)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Shared Profile Warning (Task 6) */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <p className="font-bold text-amber-900 truncate" title="Profil wspólny: ostatni zapis wygrywa">
                Profil wspólny: ostatni zapis wygrywa
              </p>
              <p className="text-amber-800 text-xs">
                {hasSharedProfile
                  ? "Wybór zaktualizuje profil wspólny. Zmiany niepołączone zostaną nadpisane."
                  : "Wszelkie konflikty dla profili rozwiązywane są nadpisaniem wybraną wersją (bez automatycznego scscalania CRDT)."}
              </p>
            </div>
          </div>
        </div>

        {/* Actions (3 Polish buttons) */}
        <div className="flex flex-col sm:flex-row gap-2 p-6 pt-4 border-t border-border justify-end shrink-0 bg-bg-base/95 rounded-b-2xl">
          <button
            onClick={() => onResolve("cancel")}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-text-main font-bold text-xs hover:bg-surface-offset active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Anuluj</span>
          </button>
          <button
            onClick={() => onResolve("download_remote")}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Pobierz (nadpisz lokalne)</span>
          </button>
          <button
            onClick={() => onResolve("upload_local")}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand text-white font-medium text-xs hover:bg-brand-hover active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Wyślij (nadpisz remote)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
