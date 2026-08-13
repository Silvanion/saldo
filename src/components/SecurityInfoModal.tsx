import React, { useRef } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { motion } from "motion/react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { useApp } from "../app/providers/AppContext";
import { securityFeatures } from "../content/securityContent";

export function SecurityInfoModal() {
  const modalRef = useRef<HTMLDivElement>(null);
  const { isSecurityInfoOpen, toggleSecurityInfo } = useApp();
  
  useScrollLock(isSecurityInfoOpen);
  useFocusTrap(modalRef, isSecurityInfoOpen, toggleSecurityInfo);

  if (!isSecurityInfoOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
      id="security-info-modal"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-info-title"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg rounded-3xl bg-bg-base/95 backdrop-blur-2xl shadow-sm flex flex-col max-h-[90vh] overflow-hidden"
       ref={modalRef}>
        <div className="shrink-0 p-6 md:p-8 pb-4 border-b border-border relative">
          <button
            onClick={() => toggleSecurityInfo(false)}
            aria-label="Zamknij"
            className="absolute top-5 right-5 text-2xl leading-none text-text-muted hover:text-text-main hover:bg-surface-offset w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="close-security-modal"
          >
            &times;
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-surface-2 text-text-muted rounded-xl shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 id="security-info-title" className="text-xl font-extrabold text-text-main truncate" title="Szczegóły Ochrony">Szczegóły Ochrony</h2>
              <p className="text-sm font-medium text-text-muted truncate" title="Lokalne Saldo Security">Lokalne Saldo Security</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar min-w-0 p-6 md:p-8 space-y-4">
          {securityFeatures.map((feature, idx) => (
            <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-surface border border-border min-w-0">
              <div className="shrink-0">{feature.icon}</div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-text-main mb-1">{feature.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 p-6 md:p-8 pt-4 border-t border-border bg-bg-base/95 backdrop-blur-2xl rounded-b-3xl flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand truncate" title="Ochrona aktywna">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Ochrona aktywna</span>
          </span>
          <button
            onClick={() => toggleSecurityInfo(false)}
            className="px-5 py-2.5 rounded-xl bg-surface-offset hover:bg-border text-text-main font-bold text-xs active:scale-[0.98] transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Zamknij
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
