import React, { useState } from "react";
import type { User } from "firebase/auth";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  LogOut,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  Calendar,
  Check,
  Activity,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import { DriveIntegrityReport } from "../../hooks/useDriveSync";

export interface SettingsGoogleHubSectionProps {
  googleUser: User | null;
  isGoogleLoading: boolean;
  googleError?: string | null;
  isDriveActionLoading: boolean;
  gdriveFileId: string | null;
  gdriveLastSynced: string | null;
  isDriveAutoSyncEnabled: boolean;
  autoSyncStatus?: "idle" | "saving" | "synced" | "error";
  driveIntegrityReport?: DriveIntegrityReport | null;
  calendarToken?: string | null;
  onConnectGoogle: () => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  onConnectCalendar?: () => Promise<void>;
  onSyncToDrive: () => Promise<void>;
  onLoadFromDrive: () => Promise<void>;
  onToggleDriveAutoSync: (enabled: boolean) => void;
  onCheckIntegrity?: () => Promise<any>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function SettingsGoogleHubSection({
  googleUser,
  isGoogleLoading,
  googleError,
  isDriveActionLoading,
  gdriveFileId,
  gdriveLastSynced,
  isDriveAutoSyncEnabled,
  autoSyncStatus = "idle",
  driveIntegrityReport,
  calendarToken,
  onConnectGoogle,
  onDisconnectGoogle,
  onConnectCalendar,
  onSyncToDrive,
  onLoadFromDrive,
  onToggleDriveAutoSync,
  onCheckIntegrity,
  showToast
}: SettingsGoogleHubSectionProps) {
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "G";
  };

  const handleIntegrityCheck = async () => {
    if (!onCheckIntegrity) return;
    setIsCheckingIntegrity(true);
    try {
      const report = await onCheckIntegrity();
      if (report?.status === "synced") {
        showToast("Wszystkie dane lokalne i plik na Dysku są w 100% spójne!", "success");
      } else if (report?.status === "local_newer") {
        showToast("Masz nowsze dane lokalnie. Warto zapisać je na Dysk.", "info");
      } else if (report?.status === "remote_newer") {
        showToast("Na Dysku Google znajduje się nowsza wersja danych.", "info");
      } else if (report?.status === "conflict") {
        showToast("Wykryto rozbieżność danych między urządzeniem a Dyskiem.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Błąd sprawdzania spójności.", "error");
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  return (
    <div className="space-y-6" id="settings-google-hub">
      {/* HEADER CARD */}
      <div className="bg-surface rounded-2xl border border-border/70 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-text-main">Centrum Usług Google</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-subtle text-brand border border-brand/20">
                  Google Cloud Hub
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Zarządzaj autoryzacją konta Google, bezpieczną kopią zapasową w chmurze oraz integracją z Kalendarzem
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {googleUser ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success-subtle text-success border border-success/20">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Połączono z Google
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-2 text-text-muted border border-border">
                <span className="w-2 h-2 rounded-full bg-text-muted" /> Tryb wyłącznie lokalny
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {googleError && (
        <div className="p-4 bg-danger-subtle border border-danger/20 rounded-2xl text-danger text-xs space-y-2" id="gdrive-auth-error-notice">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div className="font-bold text-danger">Błąd autoryzacji z usługą Google</div>
          </div>
          <p className="text-text-muted pl-6">{googleError}</p>
        </div>
      )}

      {/* SECTION 1: GOOGLE ACCOUNT */}
      <div className="bg-surface rounded-2xl border border-border/70 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-main">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.173-2.763-6.173-6.174 0-3.41 2.763-6.173 6.173-6.173 1.48 0 2.83.52 3.9 1.383l3.153-3.152C18.99 1.943 15.82 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.786 0 10.74-4.14 10.74-11.24 0-.648-.06-1.285-.16-1.955H12.24z"/>
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-main">Konto Google</h4>
              <p className="text-[11px] text-text-muted">Profil użytkownika i sesja Firebase Auth</p>
            </div>
          </div>
        </div>

        {!googleUser ? (
          <div className="bg-surface-2/60 border border-border/60 rounded-xl p-5 text-center space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
              <div className="rounded-xl border border-border/70 bg-surface p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-main mb-1">Lokalnie (obecnie)</p>
                <p className="text-xs text-text-muted leading-relaxed">Dane tylko na tym urządzeniu, pełna prywatność, brak logowania.</p>
              </div>
              <div className="rounded-xl border border-brand/20 bg-brand-subtle/40 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand mb-1">Z kontem Google</p>
                <p className="text-xs text-text-muted leading-relaxed">Kopia w chmurze i synchronizacja między urządzeniami — w pełni opcjonalne.</p>
              </div>
            </div>
            <button
              onClick={onConnectGoogle}
              disabled={isGoogleLoading}
              className="inline-flex items-center gap-2.5 bg-brand text-text-inverse border border-brand hover:bg-brand-hover font-bold py-2.5 px-5 rounded-xl text-xs active:scale-[0.98] transition-all cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
              id="btn-google-drive-connect"
            >
              {isGoogleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.173-2.763-6.173-6.174 0-3.41 2.763-6.173 6.173-6.173 1.48 0 2.83.52 3.9 1.383l3.153-3.152C18.99 1.943 15.82 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.786 0 10.74-4.14 10.74-11.24 0-.648-.06-1.285-.16-1.955H12.24z"/>
                </svg>
              )}
              <span>Zaloguj i połącz z kontem Google</span>
            </button>
            <details className="group mt-2 border border-border/60 rounded-xl bg-surface overflow-hidden text-left max-w-lg mx-auto shadow-xs">
              <summary className="p-3 text-xs font-bold text-text-muted cursor-pointer hover:bg-surface-2 flex justify-between items-center list-none select-none">
                <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-brand shrink-0" /> Jak dbamy o Twoją prywatność?</span>
                <ChevronDown className="w-4 h-4 text-text-muted group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <div className="p-4 border-t border-border/40 text-xs text-text-muted space-y-2 leading-relaxed">
                <p>
                  Aplikacja prosi wyłącznie o minimalny zakres uprawnień <code className="bg-surface-2 px-1.5 py-0.5 rounded border border-border text-brand text-xs">drive.file</code>.
                </p>
                <p>
                  Oznacza to, że ma dostęp <strong>wyłącznie</strong> do pliku <code className="text-text-main font-mono">saldo_budget.json</code>, który sama utworzy. Aplikacja nie widzi Twoich zdjęć, dokumentów ani innych plików na Dysku.
                </p>
              </div>
            </details>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-surface-2/70 border border-border/70 rounded-xl gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {googleUser.photoURL ? (
                <img
                  src={googleUser.photoURL}
                  referrerPolicy="no-referrer"
                  alt={googleUser.displayName || "Google User"}
                  className="w-11 h-11 rounded-full border border-brand/30 shadow-xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center font-bold text-sm shadow-xs">
                  {getInitials(googleUser.displayName || googleUser.email || "G")}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-xs font-bold text-text-main flex items-center gap-1.5 truncate">
                  <CheckCircle className="w-3.5 h-3.5 text-brand shrink-0" />
                  {googleUser.displayName || "Użytkownik Google"}
                </span>
                <p className="text-xs text-text-muted font-medium truncate">{googleUser.email}</p>
              </div>
            </div>

            <button
              onClick={onDisconnectGoogle}
              className="text-xs font-bold text-text-muted hover:text-danger hover:bg-danger-subtle px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-danger/20 shrink-0"
              id="btn-google-drive-disconnect"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Odłącz konto</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: GOOGLE DRIVE & BUDGET FILE */}
      {googleUser && (
        <div className="bg-surface rounded-2xl border border-border/70 p-5 sm:p-6 shadow-xs space-y-5" id="settings-google-drive-card">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-main">Dysk Google (Kopia bazy danych)</h4>
                <p className="text-[11px] text-text-muted">Plik kopii zapasowej <code className="font-mono text-text-main">saldo_budget.json</code></p>
              </div>
            </div>

            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-surface-2 border border-border/70 text-text-muted">
              {gdriveFileId ? "Plik powiązany" : "Oczekuje na zapis"}
            </span>
          </div>

          {/* METRIC STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="p-3.5 bg-surface-2/60 rounded-xl border border-border/60">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">Stan pliku w chmurze</span>
              <span className="text-xs font-bold text-text-main flex items-center gap-1.5 mt-1">
                {gdriveFileId ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Plik istnieje na Dysku
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    Zostanie utworzony przy 1. zapisie
                  </>
                )}
              </span>
            </div>

            <div className="p-3.5 bg-surface-2/60 rounded-xl border border-border/60">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">Ostatnia synchronizacja</span>
              <span className="text-xs font-bold text-text-main tabular-nums block mt-1">
                {gdriveLastSynced || "Brak wykonanego zapisu"}
              </span>
            </div>

            <div className="p-3.5 bg-surface-2/60 rounded-xl border border-border/60 sm:col-span-2 lg:col-span-1">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">Status Auto-Sync</span>
              <span className="text-xs font-bold flex items-center gap-1.5 mt-1">
                {isDriveAutoSyncEnabled ? (
                  autoSyncStatus === "saving" ? (
                    <span className="text-brand flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Zapisywanie zmian...
                    </span>
                  ) : autoSyncStatus === "synced" ? (
                    <span className="text-success flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Aktualne (zsynchronizowano)
                    </span>
                  ) : (
                    <span className="text-success flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Aktywny w tle
                    </span>
                  )
                ) : (
                  <span className="text-text-muted">Wyłączony</span>
                )}
              </span>
            </div>
          </div>

          {/* AUTOSYNC TOGGLE CARD */}
          <div className="flex items-center justify-between p-4 bg-brand-subtle/40 border border-brand/20 rounded-xl">
            <div className="pr-4">
              <strong className="text-xs font-bold text-text-main flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand animate-pulse" />
                Automatyczny zapis w chmurze (Auto-Sync)
              </strong>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Każda zmiana w transakcjach, budżecie lub celach jest samoczynnie zapisywana na Twoim Dysku Google po 2-3 sekundach od edycji.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none focus-within:ring-2 focus-within:ring-focus-ring rounded-full shrink-0">
              <input
                type="checkbox"
                checked={isDriveAutoSyncEnabled}
                onChange={(e) => onToggleDriveAutoSync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-offset rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring"></div>
            </label>
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={onSyncToDrive}
              disabled={isDriveActionLoading}
              className="inline-flex items-center justify-center gap-2 bg-brand text-text-inverse border border-brand hover:bg-brand-hover font-bold py-2.5 px-4 rounded-xl text-xs active:scale-[0.98] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              id="btn-google-drive-upload"
            >
              {isDriveActionLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              <span>Zapisz na Dysk</span>
            </button>

            <button
              onClick={onLoadFromDrive}
              disabled={isDriveActionLoading || !gdriveFileId}
              className="inline-flex items-center justify-center gap-2 bg-surface border border-border text-text-main hover:bg-surface-2 hover:border-brand/30 hover:text-brand font-bold py-2.5 px-4 rounded-xl text-xs active:scale-[0.98] transition-all cursor-pointer shadow-xs disabled:opacity-40"
              id="btn-google-drive-download"
            >
              {isDriveActionLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudDownload className="w-4 h-4" />
              )}
              <span>Wczytaj z Dysku</span>
            </button>

            <button
              onClick={handleIntegrityCheck}
              disabled={isDriveActionLoading || isCheckingIntegrity}
              className="inline-flex items-center justify-center gap-2 bg-surface-2 border border-border/80 text-text-main hover:bg-surface-3 font-bold py-2.5 px-4 rounded-xl text-xs active:scale-[0.98] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              id="btn-google-drive-check-integrity"
            >
              {isCheckingIntegrity ? (
                <RefreshCw className="w-4 h-4 animate-spin text-brand" />
              ) : (
                <Activity className="w-4 h-4 text-brand" />
              )}
              <span>Sprawdź spójność</span>
            </button>
          </div>

          {/* INTEGRITY REPORT CARD */}
          {driveIntegrityReport && (
            <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
              driveIntegrityReport.status === "synced"
                ? "bg-success-subtle/50 border-success/30 text-text-main"
                : driveIntegrityReport.status === "conflict"
                ? "bg-danger-subtle/50 border-danger/30 text-text-main"
                : "bg-brand-subtle/50 border-brand/30 text-text-main"
            }`}>
              <div className="flex items-center justify-between">
                <strong className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-brand" />
                  Raport spójności danych z chmurą
                </strong>
                <span className="text-[10px] text-text-muted tabular-nums">
                  {new Date(driveIntegrityReport.checkedAt).toLocaleTimeString("pl-PL")}
                </span>
              </div>
              <p className="leading-relaxed">{driveIntegrityReport.message}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40 text-[11px]">
                <div>
                  <span className="text-text-muted block">Profile lokalne:</span>
                  <span className="font-bold">{driveIntegrityReport.localProfilesCount ?? "-"}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Profile na Dysku:</span>
                  <span className="font-bold">{driveIntegrityReport.remoteProfilesCount ?? "-"}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Transakcje lokalne:</span>
                  <span className="font-bold">{driveIntegrityReport.localTxCount ?? "-"}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Transakcje na Dysku:</span>
                  <span className="font-bold">{driveIntegrityReport.remoteTxCount ?? "-"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: GOOGLE CALENDAR INTEGRATION */}
      <div className="bg-surface rounded-2xl border border-border/70 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-2 text-text-main flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-main">Kalendarz Google (Google Calendar)</h4>
              <p className="text-[11px] text-text-muted">Automatyczne przypomnienia o terminach rachunków i płatności</p>
            </div>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-surface-2 border border-border/70 text-text-muted">
            {calendarToken ? (
              <span className="text-success font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Uprawnienia aktywne
              </span>
            ) : (
              "Brak uprawnień"
            )}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-surface-2/60 border border-border/60 rounded-xl gap-4">
          <div className="space-y-1 max-w-xl">
            <span className="text-xs font-bold text-text-main block">
              Integracja z terminami rachunków
            </span>
            <p className="text-xs text-text-muted leading-relaxed">
              Zezwól Saldo na dodawanie wydarzeń do Twojego Kalendarza Google. W widoku Płatności możesz jednym kliknięciem utworzyć powiadomienie z przypomnieniem o zbliżającym się rachunku.
            </p>
          </div>

          {onConnectCalendar && (
            <button
              onClick={onConnectCalendar}
              disabled={isGoogleLoading}
              className="inline-flex items-center gap-2 bg-surface border border-border hover:border-brand/30 hover:text-brand font-bold py-2.5 px-4 rounded-xl text-xs active:scale-[0.98] transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
              id="btn-connect-google-calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-brand" />
              <span>{calendarToken ? "Odśwież uprawnienia Kalendarza" : "Połącz z Kalendarzem Google"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
