import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { X, History, RefreshCw, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { changelogData } from "../content/changelogData";
import { UpdateManager } from "../services/UpdateManager";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [checkState, setCheckState] = useState<"idle" | "checking" | "up-to-date" | "available" | "error">("idle");
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const handleCheckForUpdates = async () => {
    setCheckState("checking");
    setCheckMessage(null);
    const manager = UpdateManager.getInstance();
    const result = await manager.checkForUpdates(true);
    // UpdateToast (zamontowany globalnie w AppShell) nasłuchuje tego samego
    // singletona UpdateManager i samodzielnie pokaże pełny widok "dostępna
    // aktualizacja"/"błąd" z przyciskami pobierania/ponowienia — pokazujemy
    // tutaj lokalny baner tylko dla stanu "brak aktualizacji", jedynego,
    // którego UpdateToast celowo nie sygnalizuje (zostaje ukryty przy IDLE).
    if (result) {
      setCheckState("available");
      setCheckMessage("Sprawdzono — zobacz szczegóły w powiadomieniu w rogu ekranu.");
    } else if (manager.getErrorMessage()) {
      setCheckState("error");
      setCheckMessage("Sprawdzono — szczegóły błędu w powiadomieniu w rogu ekranu.");
    } else {
      setCheckState("up-to-date");
      setCheckMessage("Masz najnowszą wersję Saldo.");
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-modal-title"
        className="relative bg-bg-base/95 backdrop-blur-2xl rounded-xl w-full max-w-2xl border border-border/70 shadow-lg flex flex-col max-h-[90vh] overflow-hidden"
        ref={modalRef}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-6 border-b border-border/70 shrink-0 bg-bg-base/95 backdrop-blur-2xl sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle border border-brand/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-brand" />
            </div>
            <div className="min-w-0">
              <h2 id="changelog-modal-title" className="text-xl font-bold text-text-main truncate" title="Historia Zmian">Historia Zmian</h2>
              <p className="text-sm text-text-muted truncate" title="Co nowego w Saldo?">Co nowego w Saldo?</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCheckForUpdates}
              disabled={checkState === "checking"}
              id="btn-check-for-updates"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-text-main hover:bg-surface-offset active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brand ${checkState === "checking" ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">
                {checkState === "checking" ? "Sprawdzanie..." : `Wersja ${changelogData[0]?.version} • Sprawdź aktualizacje`}
              </span>
              <span className="sm:hidden">Sprawdź</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Zamknij"
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface-offset rounded-xl transition-all active:scale-[0.98] shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {checkMessage && (
          <div
            role="status"
            className={`mx-6 mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-medium shrink-0 ${
              checkState === "error"
                ? "border-danger/30 bg-danger-subtle text-danger"
                : checkState === "available"
                ? "border-brand/20 bg-brand-subtle text-brand"
                : "border-success/20 bg-success-subtle text-success"
            }`}
          >
            {checkState === "error" ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : checkState === "available" ? (
              <Sparkles className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{checkMessage}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 p-6 sm:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8">
          {changelogData.map((release, index) => (
            <div key={release.version} className="relative pl-6 sm:pl-8">
              {/* Timeline Line */}
              {index !== changelogData.length - 1 && (
                <div className="absolute left-2.5 sm:left-[21px] top-8 bottom-[-32px] w-0.5 bg-border" />
              )}
              
              {/* Timeline Dot/Icon */}
              <div className="absolute left-0 sm:left-3 top-1 w-6 h-6 rounded-full bg-surface border-[3px] border-border flex items-center justify-center z-10">
                <div className="w-2 h-2 rounded-full bg-text-muted" />
              </div>

              <div className="bg-bg-base border border-border/60 rounded-2xl p-5 hover:border-border transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-surface-2 text-text-main text-xs font-semibold font-mono border border-border/50">
                      {release.version}
                    </span>
                    <div className="flex items-center gap-2 text-text-main font-semibold text-base sm:text-lg">
                      <span className="text-text-muted">{release.icon}</span>
                      {release.title}
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-surface-2 text-xs font-semibold text-text-muted border border-border/50">
                    {release.date}
                  </span>
                </div>

                <ul className="space-y-2.5">
                  {release.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-text-muted">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-text-muted/30 shrink-0" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
