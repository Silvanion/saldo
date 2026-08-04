import React from "react";
import { motion } from "motion/react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { useApp } from "../app/providers/AppContext";
import { securityFeatures } from "../content/securityContent";

export function SecurityInfoModal() {
  const { isSecurityInfoOpen, toggleSecurityInfo } = useApp();

  if (!isSecurityInfoOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="security-info-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg rounded-3xl bg-bg-base/95 backdrop-blur-2xl p-6 md:p-8 shadow-sm overflow-y-auto max-h-[90vh]"
      >
        <button
          onClick={() => toggleSecurityInfo(false)}
          className="absolute top-4 right-4 text-2xl text-text-muted hover:text-text-muted transition"
          id="close-security-modal"
        >
          &times;
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-slate-100 text-text-muted rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-text-main">Szczegóły Ochrony</h2>
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Lokalne Saldo Security</p>
          </div>
        </div>

        <div className="space-y-4">
          {securityFeatures.map((feature, idx) => (
            <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-surface border border-border">
              {feature.icon}
              <div>
                <h3 className="text-sm font-bold text-text-main mb-1">{feature.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            Ochrona aktywna
          </span>
          <button
            onClick={() => toggleSecurityInfo(false)}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-main font-bold text-xs transition"
          >
            Zamknij
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
