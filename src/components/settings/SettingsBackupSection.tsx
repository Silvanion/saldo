import React, { useState } from "react";
import type { User } from "firebase/auth";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  LogOut,
  RefreshCw,
  Upload,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  Info,
  Sparkles,
  ChevronDown,
  Lock,
  Database
} from "lucide-react";
import { AppState, Profile } from "../../types";
import { generateCsvContent, downloadFile, getMonthName } from "../../utils";
import { prepareStateForRemoteSave } from "../../services/crypto";
import { ConfirmModal } from "../ConfirmModal";

interface SettingsBackupSectionProps {
  state: AppState;
  activeProfile?: Profile;
  activeProfileId: string | null;
  unlockedProfileId?: string | null;
  selectedDate?: Date;
  googleUser: User | null;
  isGoogleLoading: boolean;
  googleError?: string | null;
  isDriveActionLoading: boolean;
  gdriveFileId: string | null;
  gdriveLastSynced: string | null;
  isDriveAutoSyncEnabled: boolean;
  onConnectGoogle: () => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  onSyncToDrive: () => Promise<void>;
  onLoadFromDrive: () => Promise<void>;
  onToggleDriveAutoSync: (enabled: boolean) => void;
  onImportLocalData: (state: AppState) => void;
  onExportData: () => void;
  onResetData: () => void;
  onOpenPinModal: () => void;
  onOpenExportReports?: (tab?: "pdf" | "csv" | "backup") => void;
  onOpenDataAuditor?: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function SettingsBackupSection({
  state,
  activeProfile,
  activeProfileId,
  unlockedProfileId,
  selectedDate,
  googleUser,
  isGoogleLoading,
  googleError,
  isDriveActionLoading,
  gdriveFileId,
  gdriveLastSynced,
  isDriveAutoSyncEnabled,
  onConnectGoogle,
  onDisconnectGoogle,
  onSyncToDrive,
  onLoadFromDrive,
  onToggleDriveAutoSync,
  onImportLocalData,
  onExportData,
  onResetData,
  onOpenPinModal,
  onOpenExportReports,
  onOpenDataAuditor,
  showToast
}: SettingsBackupSectionProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [filePreview, setFilePreview] = useState<AppState | null>(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  const targetPdfDate = selectedDate || (() => {
    if (activeProfile?.transactions && activeProfile.transactions.length > 0) {
      const sorted = [...activeProfile.transactions].sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""));
      if (sorted[0]?.isoDate) {
        return new Date(`${sorted[0].isoDate}T12:00:00`);
      }
    }
    return new Date();
  })();

  const pdfYear = targetPdfDate.getFullYear();
  const pdfMonthIdx = targetPdfDate.getMonth();
  const pdfMonthLabel = getMonthName(pdfMonthIdx);

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SP";
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processJsonString = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.profiles)) {
        setFilePreview(parsed);
      } else {
        showToast("Plik JSON nie zawiera prawidłowej bazy danych aplikacji Saldo.", "error");
      }
    } catch {
      showToast("Błąd dekodowania pliku JSON. Upewnij się, że plik nie jest uszkodzony.", "error");
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".json")) {
      showToast("Proszę wybrać plik w formacie JSON (.json).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processJsonString(text);
    };
    reader.readAsText(file);
  };

  const confirmLocalImport = () => {
    if (filePreview) {
      onImportLocalData(filePreview);
      setFilePreview(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* QUICK CLOUD BANNER */}
      <div className="bg-brand-subtle/40 border border-brand/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-text-main">Synchronizacja w chmurze (Dysk Google)</h4>
            <p className="text-[11px] text-text-muted">
              {googleUser ? "Połączono z kontem Google • Dostępny automatyczny zapis i weryfikacja spójności w zakładce Usługi Google" : "Dostępna kopia zapasowa na Dysku Google w zakładce Usługi Google"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {googleUser ? (
            <span className="text-[11px] font-bold text-success flex items-center gap-1 bg-surface px-2.5 py-1 rounded-lg border border-border">
              <CheckCircle className="w-3 h-3" /> Chmura aktywna
            </span>
          ) : (
            <span className="text-[11px] font-medium text-text-muted bg-surface px-2.5 py-1 rounded-lg border border-border">
              Tryb lokalny
            </span>
          )}
        </div>
      </div>

      {/* SECTION: LOCAL FILES & RESET */}
      <div className="bg-surface rounded-2xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-local-tools-card">
        <div className="flex items-start sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
              <FileJson className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-text-main tracking-tight truncate">
                Lokalna kopia zapasowa i reset
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Eksport bazy danych, import z pliku JSON oraz generowanie raportów CSV i PDF
              </p>
            </div>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        {!filePreview ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            tabIndex={0}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (window.electronAPI) {
                  const json = await window.electronAPI.importData();
                  if (json) processJsonString(json);
                } else {
                  document.getElementById("local-backup-file-input")?.click();
                }
              }
            }}
            onClick={async () => {
              if (window.electronAPI) {
                const json = await window.electronAPI.importData();
                if (json) processJsonString(json);
              } else {
                document.getElementById("local-backup-file-input")?.click();
              }
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer mb-4 focus-visible:ring-2 focus-visible:ring-focus-ring ${
              dragActive
                ? "border-brand bg-brand-subtle"
                : "border-border hover:border-border/80 bg-surface"
            }`}
          >
            <input
              id="local-backup-file-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="w-6 h-6 text-text-muted mx-auto mb-2" />
            <span className="text-xs font-black text-text-main block">Wczytaj kopię z pliku JSON</span>
            <p className="text-xs text-text-muted mt-1">
              Przeciągnij i upuść plik kopii zapasowej tutaj lub kliknij aby wyszukać na urządzeniu
            </p>
          </div>
        ) : (
          <div className="bg-warning-subtle border border-warning/20 rounded-xl p-5 mb-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs font-black text-warning">Podgląd wczytywanego pliku</strong>
                <p className="text-xs text-warning mt-0.5">
                  Wczytanie tych danych zastąpi wszystkie obecne profile i ich transakcje. Sprawdź zawartość pliku przed zatwierdzeniem:
                </p>
              </div>
            </div>

            <div className="bg-surface-2 border border-warning/20 rounded-xl p-3 space-y-1.5 min-w-0">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Liczba profili w kopii:</span>
                <strong className="text-text-muted tabular-nums">{filePreview.profiles?.length || 0}</strong>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Dostępne profile:</span>
                <strong className="text-brand truncate max-w-[180px]">
                  {filePreview.profiles?.map((p) => p.name).join(", ") || "Brak"}
                </strong>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Łączna liczba wpisów transakcji:</span>
                <strong className="text-text-muted tabular-nums">
                  {filePreview.profiles?.reduce((acc: number, p) => acc + (p.transactions?.length || 0), 0) || 0}
                </strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmLocalImport}
                className="flex-1 bg-warning text-text-inverse font-bold py-2.5 rounded-xl text-xs hover:bg-warning/90 active:scale-[0.98] transition-all cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                ✓ Nadpisz dane i przywróć
              </button>
              <button
                onClick={() => setFilePreview(null)}
                className="px-4 bg-surface border border-border text-text-muted hover:text-text-main rounded-xl text-xs font-medium active:scale-[0.98] transition-all cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-text-main">Eksport danych i raporty</h4>
              {onOpenExportReports && (
                <button
                  type="button"
                  onClick={() => onOpenExportReports()}
                  className="text-xs text-brand font-bold hover:underline flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Centrum raportów</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (onOpenExportReports) {
                    onOpenExportReports("csv");
                    return;
                  }
                  if (activeProfile && activeProfile.transactions) {
                    const csv = generateCsvContent(activeProfile.transactions);
                    downloadFile(csv, `saldo-${activeProfile.name}-transakcje.csv`, "text/csv;charset=utf-8;");
                  }
                }}
                className="bg-surface border border-border text-text-muted hover:border-brand/50 hover:text-brand active:scale-[0.98] transition-all py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <FileSpreadsheet className="w-4 h-4 text-brand" />
                <span>Pobierz CSV</span>
              </button>
              <div className="flex flex-col gap-1">
                <button
                  onClick={async () => {
                    if (onOpenExportReports) {
                      onOpenExportReports("pdf");
                      return;
                    }
                    if (activeProfile) {
                      try {
                        const { generateReportPdf } = await import("../../services/pdfGenerator");
                        generateReportPdf(activeProfile, pdfYear, pdfMonthIdx, activeProfile.currency || "PLN");
                      } catch (error) {
                        console.error("Błąd podczas generowania raportu PDF:", error);
                        showToast("Nie udało się wygenerować raportu PDF. Spróbuj ponownie.", "error");
                      }
                    }
                  }}
                  className="w-full bg-surface border border-border text-text-muted hover:border-brand/50 hover:text-brand active:scale-[0.98] transition-all py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <FileText className="w-4 h-4 text-brand" />
                  <span>Pobierz raport PDF</span>
                </button>
                <span className="text-xs text-text-muted text-center font-medium">
                  Raport za: <strong className="text-text-main">{pdfMonthLabel} {pdfYear}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Doktor Saldo - Integralność bazy */}
          <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-brand" />
                <h4 className="text-sm font-bold text-text-main">Doktor Saldo • Spójność bazy</h4>
              </div>
              <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Self-Healing
              </span>
            </div>
            <p className="text-xs text-text-muted mb-3">
              Przeskanuj swoje transakcje, rachunki i konta w poszukiwaniu ukrytych duplikatów, brakujących kategorii lub niespójności sald, i napraw je jednym kliknięciem.
            </p>
            {onOpenDataAuditor && (
              <button
                type="button"
                onClick={onOpenDataAuditor}
                id="btn-open-doctor-saldo"
                className="w-full bg-brand-subtle text-brand border border-brand/20 hover:bg-brand/15 active:scale-[0.98] transition-all py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Sparkles className="w-4 h-4" />
                <span>Uruchom Doktor Saldo (Audyt i samonaprawa)</span>
              </button>
            )}
          </div>
          
          <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
            <h4 className="text-sm font-bold text-text-main mb-3">Kopia zapasowa systemu</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  const safeState = await prepareStateForRemoteSave(state);
                  const json = JSON.stringify(safeState, null, 2);
                  if (window.electronAPI) {
                    window.electronAPI.setProgressBar?.(0.5);
                    try {
                      const path = await window.electronAPI.exportData('saldo-kopia-zaszyfrowana.json', json);
                      if (path) showToast("Zapisano zaszyfrowaną kopię.", "success");
                    } finally {
                      window.electronAPI.setProgressBar?.(-1);
                    }
                  } else {
                    downloadFile(json, `saldo-kopia-zaszyfrowana.json`, "application/json");
                  }
                }}
                className="bg-surface border border-border text-text-muted hover:border-brand/50 hover:text-brand active:scale-[0.98] transition-all py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Lock className="w-4 h-4 text-brand" />
                <span>Eksport zaszyfrowanej kopii</span>
              </button>
              <button
                onClick={() => {
                  if (activeProfile?.pinHash && activeProfileId !== unlockedProfileId) {
                    onOpenPinModal();
                    return;
                  }
                  setShowExportConfirm(true);
                }}
                className="bg-surface border border-border text-text-muted hover:border-brand/50 hover:text-brand active:scale-[0.98] transition-all py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <FileJson className="w-4 h-4 text-brand" />
                <span>Eksport czytelnych danych</span>
              </button>
            </div>
          </div>

          <button
            onClick={onResetData}
            className="w-full bg-danger-subtle text-danger border border-danger/20 hover:bg-danger/10 hover:border-danger/30 active:scale-[0.98] transition-all py-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-reset-db-data"
          >
            <AlertTriangle className="w-4 h-4 text-danger" />
            <span>Przywróć stan początkowy (Usuń wszystko)</span>
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showExportConfirm}
        onClose={() => setShowExportConfirm(false)}
        payload={
          showExportConfirm
            ? {
                title: "Potwierdź eksport danych",
                message: "Ten plik będzie zawierał czytelne dane finansowe. Zapisz go w bezpiecznym miejscu.",
                confirmLabel: "Eksportuj",
                cancelLabel: "Anuluj",
                tone: "warning",
                onConfirm: async () => {
                  const json = JSON.stringify(state, null, 2);
                  if (window.electronAPI) {
                    window.electronAPI.setProgressBar?.(0.5);
                    try {
                      const path = await window.electronAPI.exportData('saldo-kopia-czytelna.json', json);
                      if (path) showToast("Zapisano kopię danych.", "success");
                    } finally {
                      window.electronAPI.setProgressBar?.(-1);
                    }
                  } else {
                    downloadFile(json, `saldo-kopia-czytelna.json`, "application/json");
                  }
                  if (onExportData) {
                    onExportData();
                  }
                }
              }
            : null
        }
      />
    </div>
  );
}
