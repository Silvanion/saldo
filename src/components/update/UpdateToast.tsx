import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight
} from "lucide-react";
import {
  UpdateManager,
  UpdateState,
  ReleaseInfo,
  DownloadProgress
} from "../../services/UpdateManager";

export const UpdateToast: React.FC = () => {
  const [state, setState] = useState<UpdateState>("IDLE");
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress>({
    downloadedBytes: 0,
    totalBytes: 0,
    percentage: 0,
    speedMBps: 0
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const manager = UpdateManager.getInstance();
    const unsubscribe = manager.subscribe({
      onStateChange: (newState) => {
        setState(newState);
        setReleaseInfo(manager.getReleaseInfo());
        if (newState === "AVAILABLE" || newState === "DOWNLOADING" || newState === "READY_TO_INSTALL") {
          setIsDismissed(false);
        }
      },
      onProgress: (prog) => {
        setProgress(prog);
      },
      onError: (err) => {
        setErrorMsg(err);
      }
    });

    // Nie robimy tutaj checkForUpdates() - to robi natywny electron-updater
    // w main process (setTimeout 3s w main.cjs). Tutaj tylko subskrybujemy stany.

    return () => {
      unsubscribe();
    };
  }, []);

  if (state === "IDLE" || isDismissed) {
    return null;
  }

  const handleStartDownload = () => {
    UpdateManager.getInstance().downloadAndVerifyUpdate();
  };

  const handleInstall = () => {
    UpdateManager.getInstance().installUpdate();
  };

  const handleRetry = () => {
    UpdateManager.getInstance().checkForUpdates(true);
  };

  const downloadedMB = (progress.downloadedBytes / (1024 * 1024)).toFixed(1);
  const totalMB = (progress.totalBytes / (1024 * 1024)).toFixed(1);

  return typeof document !== "undefined"
    ? createPortal(
        <aside aria-label="Powiadomienia o aktualizacjach" className="fixed bottom-5 right-5 z-[9999] max-w-sm w-[calc(100vw-40px)] pointer-events-none [-webkit-app-region:no-drag]">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto bg-surface/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-4 text-text-main ring-1 ring-black/5 dark:ring-white/10"
              id="floating-update-toast"
            >
              {/* STATE: AVAILABLE */}
              {state === "AVAILABLE" && releaseInfo && (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0 border border-brand/20">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold leading-none">Aktualizacja gotowa</h4>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">
                            {releaseInfo.version}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Dostępne jest nowe, szybsze wydanie Saldo.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsDismissed(true)}
                      className="text-text-muted hover:text-text-main p-1 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
                      title="Później"
                      aria-label="Zamknij"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {releaseInfo.releaseNotes && (
                    <div className="text-[11px] text-text-muted bg-surface-2/60 border border-border/50 rounded-xl p-2.5 max-h-20 overflow-y-auto leading-relaxed">
                      {releaseInfo.releaseNotes.slice(0, 140)}...
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setIsDismissed(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      Później
                    </button>
                    <button
                      onClick={handleStartDownload}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs cursor-pointer"
                      id="btn-update-download"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      <span>Pobierz i zaktualizuj</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STATE: DOWNLOADING */}
              {state === "DOWNLOADING" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-brand animate-spin" />
                      <h4 className="text-xs font-bold">Pobieranie aktualizacji...</h4>
                    </div>
                    <span className="text-xs font-bold font-mono text-brand">
                      {progress.percentage}%
                    </span>
                  </div>

                  {/* Pasek postępu */}
                  <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden border border-border/60">
                    <div
                      className="bg-brand h-full rounded-full transition-all duration-200"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
                    <span>
                      {downloadedMB} / {totalMB} MB
                    </span>
                    <span>{progress.speedMBps} MB/s</span>
                  </div>
                </div>
              )}

              {/* STATE: VERIFYING */}
              {state === "VERIFYING" && (
                <div className="flex items-center gap-3 py-1">
                  <RefreshCw className="w-4 h-4 text-brand animate-spin shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold">Weryfikacja integralności...</h4>
                    <p className="text-[11px] text-text-muted">
                      Obliczanie sumy kontrolnej SHA-256 pliku binarnego.
                    </p>
                  </div>
                </div>
              )}

              {/* STATE: READY_TO_INSTALL */}
              {state === "READY_TO_INSTALL" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">Aktualizacja pobrana</h4>
                      <p className="text-[11px] text-text-muted">
                        Gotowa do zainstalowania. Wymagane ponowne uruchomienie.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleInstall}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs cursor-pointer"
                    id="btn-update-install"
                  >
                    <span>Uruchom ponownie i zainstaluj</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* STATE: ERROR */}
              {state === "ERROR" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-danger">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <h4 className="text-xs font-bold">Błąd aktualizacji</h4>
                    </div>
                    <button
                      onClick={() => setIsDismissed(true)}
                      className="text-text-muted hover:text-text-main p-1 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {errorMsg || "Nie udało się pobrać aktualizacji z GitHuba."}
                  </p>

                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Spróbuj ponownie</span>
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </aside>,
        document.body
      )
    : null;
};
