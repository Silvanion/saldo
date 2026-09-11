import React, { useRef } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { X, History } from "lucide-react";
import { changelogData } from "../content/changelogData";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-modal-title"
        className="relative bg-bg-base/95 backdrop-blur-2xl rounded-xl w-full max-w-2xl border border-border/70 shadow-lg flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        ref={modalRef}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/70 shrink-0 bg-bg-base/95 backdrop-blur-2xl sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle border border-brand/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-brand" />
            </div>
            <div className="min-w-0">
              <h2 id="changelog-modal-title" className="text-xl font-bold text-text-main truncate" title="Historia Zmian">Historia Zmian</h2>
              <p className="text-sm text-text-muted truncate" title="Co nowego w Saldo?">Co nowego w Saldo?</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Zamknij"
            className="p-2 text-text-muted hover:text-text-main hover:bg-surface-offset rounded-xl transition-colors active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
      </div>
    </div>
  );
}
