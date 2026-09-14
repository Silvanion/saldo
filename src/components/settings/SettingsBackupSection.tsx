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

  const processFile = (file: File) => {
    if (!file.name.endsWith(".json")) {
      showToast("Proszę wybrać plik w formacie JSON (.json).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
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
      {/* SECTION: GOOGLE DRIVE CLOUD INTEGRATION */}
      <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-google-drive-card">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40">
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">Kopia zapasowa w chmurze (Dysk Google)</h3>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Bezpieczna archiwizacja pliku bazy danych budżetu (<code className="bg-surface-2 px-1 py-0.5 rounded border border-border/70 text-text-main font-mono text-xs">saldo_budget.json</code>) na Twoim prywatnym Dysku. Gwarantuje to pełną kontrolę nad danymi i ochronę przed ich utratą po wyczyszczeniu przeglądarki.
            </p>
          </div>
        </div>

        {googleError && (
          <div className="mb-5 p-4 bg-danger-subtle border border-danger/20 rounded-xl text-danger text-xs space-y-2" id="gdrive-auth-error-notice">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div className="font-bold text-danger">Błąd połączenia z kontem Google</div>
            </div>
            {googleError === "auth/popup-closed-by-user" ? (
              <div className="leading-relaxed text-text-muted pl-6 space-y-2">
                <p>
                  <strong>Okno logowania zostało zamknięte</strong> przed ukończeniem autoryzacji.
                </p>
                <p>
                  Jeśli korzystasz z aplikacji wewnątrz ramki podglądu (iframe) w AI Studio, przeglądarka mogła automatycznie zablokować wyskakujące okienko (pop-up) lub zablokować dostęp do plików cookies firm trzecich.
                </p>
                <p className="font-bold text-brand flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Aby rozwiązać ten problem:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Kliknij przycisk <strong>"Otwórz w nowej karcie"</strong> w prawym górnym rogu podglądu, aby otworzyć aplikację poza ramką iframe.</li>
                  <li>Upewnij się, że zezwalasz na wyskakujące okienka (pop-ups) w ustawieniach przeglądarki dla tej domeny.</li>
                </ul>
              </div>
            ) : (
              <div className="leading-relaxed text-text-muted pl-6 space-y-2">
                <p>
                  Szczegóły błędu: <code className="bg-danger-subtle border border-danger/20 text-danger px-1 py-0.5 rounded font-mono text-xs">{googleError}</code>.
                </p>
                {googleError?.includes('unauthorized-domain') || googleError?.includes('nie jest autoryzowana') ? (
                  <div className="bg-warning-subtle p-3 rounded-xl border border-warning/20 mt-2">
                    <p className="font-bold text-warning mb-1 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Wymagana konfiguracja w Firebase</p>
                    <p className="text-warning text-xs">
                      Aktualna domena nie jest dodana do autoryzowanych domen w Twoim projekcie Firebase.
                      Aby to naprawić:
                    </p>
                    <ol className="list-decimal pl-5 mt-1 space-y-1 text-warning text-xs font-medium">
                      <li>Wejdź na stronę <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline hover:text-warning">console.firebase.google.com</a></li>
                      <li>Wybierz swój projekt</li>
                      <li>Przejdź do <strong>Authentication</strong> &gt; <strong>Settings</strong> (Ustawienia) &gt; <strong>Authorized domains</strong> (Autoryzowane domeny)</li>
                      <li>Dodaj domenę: <code className="bg-warning-subtle border border-warning/20 text-text-main px-1 rounded select-all">{window.location.hostname}</code></li>
                    </ol>
                  </div>
                ) : (
                  <p>Zalecamy otwarcie aplikacji w nowej karcie podglądu, aby uniknąć ograniczeń związanych z ramką (iframe).</p>
                )}
              </div>
            )}
          </div>
        )}

        {!googleUser ? (
          <div className="bg-surface border border-border/70 rounded-xl p-6 text-center space-y-4 shadow-xs">
            <p className="text-xs text-text-muted max-w-md mx-auto">
              Aplikacja Saldo nie posiada centralnej bazy danych do przechowywania Twoich finansów. Podłączenie Dysku Google utworzy bezpieczny plik, z którego możesz korzystać na każdym urządzeniu.
            </p>
            <button
              onClick={onConnectGoogle}
              disabled={isGoogleLoading}
              className="inline-flex items-center gap-2 bg-brand text-text-inverse border border-brand hover:bg-brand-hover font-bold py-3 px-6 rounded-xl text-xs active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-google-drive-connect"
            >
              {isGoogleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.173-2.763-6.173-6.174 0-3.41 2.763-6.173 6.173-6.173 1.48 0 2.83.52 3.9 1.383l3.153-3.152C18.99 1.943 15.82 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.786 0 10.74-4.14 10.74-11.24 0-.648-.06-1.285-.16-1.955H12.24z"/>
                </svg>
              )}
              <span>Połącz z kontem Google Drive</span>
            </button>
            <details className="group mt-4 border border-border rounded-xl bg-surface overflow-hidden text-left max-w-md mx-auto shadow-xs">
              <summary className="p-3 text-xs font-bold text-text-muted cursor-pointer hover:bg-surface-2 flex justify-between items-center list-none select-none">
                <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-text-muted shrink-0" /> Dlaczego potrzebujemy dostępu do Dysku Google?</span>
                <ChevronDown className="w-4 h-4 text-text-muted group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <div className="p-4 border-t border-border/30 text-xs text-text-muted space-y-3 leading-relaxed">
                <p>
                  Aplikacja Saldo działa w modelu <strong className="text-text-main">Local-First</strong> (dane są na Twoim urządzeniu). 
                  Aby zapewnić Ci kopię zapasową oraz możliwość synchronizacji między urządzeniami (np. telefonem a komputerem), 
                  oferujemy zapis do prywatnego, ukrytego pliku na Twoim koncie Google Drive.
                </p>
                <div className="bg-brand-subtle p-3 rounded-xl border border-brand/20">
                  <span className="font-bold text-brand block mb-1">Pełna prywatność:</span>
                  Aplikacja prosi wyłącznie o dostęp typu <code className="bg-surface px-1 py-0.5 rounded border border-border text-brand text-xs">drive.file</code>.
                  Oznacza to, że ma dostęp <strong>tylko i wyłącznie</strong> do plików, które sama utworzyła. Nie mamy dostępu do Twoich prywatnych zdjęć ani dokumentów!
                </div>
              </div>
            </details>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-brand-subtle border border-brand/20 rounded-xl gap-4 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    referrerPolicy="no-referrer"
                    alt={googleUser.displayName || "Google User"}
                    className="w-10 h-10 rounded-full border border-brand/20"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-subtle text-brand flex items-center justify-center font-bold text-sm">
                    {getInitials(googleUser.displayName || googleUser.email || "G")}
                  </div>
                )}
                <div>
                  <span className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-brand" />
                    Zalogowano jako: {googleUser.displayName || "Użytkownik Google"}
                  </span>
                  <p className="text-xs text-text-muted font-medium">{googleUser.email}</p>
                </div>
              </div>
              <button
                onClick={onDisconnectGoogle}
                className="text-xs font-bold text-text-muted hover:text-danger hover:bg-danger-subtle p-2 rounded-xl active:scale-95 transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0"
                id="btn-google-drive-disconnect"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Odłącz konto</span>
              </button>
            </div>

            {/* Backups Action Stats */}
            <div className="p-4 bg-surface rounded-xl border border-border grid grid-cols-1 md:grid-cols-2 gap-4 shadow-xs">
              <div>
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Nazwa pliku na dysku</span>
                <span className="text-xs font-bold text-text-main font-mono block mt-0.5">saldo_budget.json</span>
                <span className="text-xs text-text-muted flex items-center gap-1.5 mt-1">
                  Status:
                  {gdriveFileId ? (
                    <span className="inline-flex items-center gap-1 text-brand font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand" /> Plik istnieje
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-text-faint font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" /> Plik zostanie utworzony przy pierwszym zapisie
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Ostatni zapis w chmurze</span>
                <span className="text-xs font-bold text-text-main block mt-0.5 tabular-nums">
                  {gdriveLastSynced || "Brak wykonanego zapisu"}
                </span>
                <span className="text-xs text-text-muted block mt-1">Dostępny do wczytania</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onSyncToDrive}
                disabled={isDriveActionLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-brand text-text-inverse border border-brand hover:bg-brand-hover font-bold py-2.5 px-4 rounded-xl text-xs active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-google-drive-upload"
              >
                {isDriveActionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                <span>Zapisz teraz kopie na Dysk</span>
              </button>
              <button
                onClick={onLoadFromDrive}
                disabled={isDriveActionLoading || !gdriveFileId}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-surface border border-border text-text-main hover:bg-surface-2 hover:border-brand/20 hover:text-brand active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100 disabled:hover:border-border disabled:hover:text-text-main py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-google-drive-download"
              >
                {isDriveActionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudDownload className="w-3.5 h-3.5" />
                )}
                <span>Wczytaj kopie z Dysku Google</span>
              </button>
            </div>

            {/* AutoSync Switch toggle */}
            <div className="flex items-center justify-between p-4 bg-surface/50 border border-border rounded-xl">
              <div className="pr-4">
                <strong className="text-xs font-bold text-text-main flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand animate-pulse" />
                  Automatyczny zapis (Auto-Sync)
                </strong>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  Każda zmiana w transakcjach lub celach będzie automatycznie zapisywana na Twoim Dysku Google.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none focus-within:ring-2 focus-within:ring-focus-ring rounded-full">
                <input
                  type="checkbox"
                  checked={isDriveAutoSyncEnabled}
                  onChange={(e) => onToggleDriveAutoSync(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-offset rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring"></div>
              </label>
            </div>
            <p className="text-xs text-text-muted italic text-center">
              Uwaga: Ze względów bezpieczeństwa tokeny Google Drive są przechowywane wyłącznie w pamięci RAM. Po odświeżeniu aplikacji wystarczy kliknąć przycisk autoryzacji ponownie.
            </p>
          </div>
        )}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                document.getElementById("local-backup-file-input")?.click();
              }
            }}
            onClick={() => document.getElementById("local-backup-file-input")?.click()}
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
                  downloadFile(json, `saldo-kopia-zaszyfrowana.json`, "application/json");
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
                onConfirm: () => {
                  const json = JSON.stringify(state, null, 2);
                  downloadFile(json, `saldo-kopia-czytelna.json`, "application/json");
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
