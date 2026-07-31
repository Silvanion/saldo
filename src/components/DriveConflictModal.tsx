import { useI18n } from "../i18n/I18nProvider";
import { getLocaleForLanguage } from "../i18n/config";

import React from "react";
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
  const { language } = useI18n();
  if (!isOpen || !localState || !remoteState) return null;

  const countTransactions = (s: AppState) => {
    return (s.profiles || []).reduce((acc, p) => acc + (p.transactions?.length || 0), 0);
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "Brak danych";
    try {
      return new Date(isoStr).toLocaleString(getLocaleForLanguage(language), {
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
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Wykryto konflikt wersji (Dysk Google)</h3>
              <p className="text-xs text-slate-500">
                Lokalna baza i plik w chmurze różnią się od ostatniej synchronizacji ({formatDate(lastSyncedAt)}).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational warning text */}
        <p className="text-sm text-slate-600">
          Wykryto nowsze modyfikacje po obu stronach. Aby uniknąć utraty danych, wybierz, którą wersję chcesz zachować:
        </p>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local State Card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-sm text-slate-800">Wersja lokalna</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                To urządzenie
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 mt-1">
              <p>
                <span className="text-slate-400">Ostatnia zmiana:</span>{" "}
                <strong className="text-slate-800">{formatDate(localState.updatedAt)}</strong>
              </p>
              <p>
                <span className="text-slate-400">Przez:</span>{" "}
                <span className="text-slate-700">{localState.lastModifiedBy || "użytkownik lokalny"}</span>
              </p>
              <p>
                <span className="text-slate-400">Liczba profili:</span>{" "}
                <strong className="text-slate-800">{localState.profiles?.length || 0}</strong>
              </p>
              <p>
                <span className="text-slate-400">Łączna liczba transakcji:</span>{" "}
                <strong className="text-slate-800">{countTransactions(localState)}</strong>
              </p>
            </div>
          </div>

          {/* Remote State Card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-sm text-slate-800">Wersja w chmurze</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                Dysk Google
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 mt-1">
              <p>
                <span className="text-slate-400">Ostatnia zmiana:</span>{" "}
                <strong className="text-slate-800">{formatDate(remoteState.updatedAt)}</strong>
              </p>
              <p>
                <span className="text-slate-400">Przez:</span>{" "}
                <span className="text-slate-700">{remoteState.lastModifiedBy || "Dysk Google"}</span>
              </p>
              <p>
                <span className="text-slate-400">Liczba profili:</span>{" "}
                <strong className="text-slate-800">{remoteState.profiles?.length || 0}</strong>
              </p>
              <p>
                <span className="text-slate-400">Łączna liczba transakcji:</span>{" "}
                <strong className="text-slate-800">{countTransactions(remoteState)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Shared Profile Warning (Task 6) */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-900">
              Profil wspólny: ostatni zapis wygrywa
            </p>
            <p className="text-amber-800 text-[11px]">
              {hasSharedProfile
                ? "Wybór zaktualizuje profil wspólny. Zmiany niepołączone zostaną nadpisane."
                : "Wszelkie konflikty dla profili rozwiązywane są nadpisaniem wybraną wersją (bez automatycznego scscalania CRDT)."}
            </p>
          </div>
        </div>

        {/* Actions (3 Polish buttons) */}
        <div className="flex flex-col sm:flex-row gap-2 mt-2 pt-2 border-t border-slate-100 justify-end">
          <button
            onClick={() => onResolve("cancel")}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Anuluj
          </button>
          <button
            onClick={() => onResolve("download_remote")}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Pobierz i nadpisz lokalne
          </button>
          <button
            onClick={() => onResolve("upload_local")}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#137566] text-white font-bold text-xs hover:bg-[#0f5c50] transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Wyślij i nadpisz remote
          </button>
        </div>
      </div>
    </div>
  );
}
