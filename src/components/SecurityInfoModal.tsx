import React from "react";
import { motion } from "motion/react";
import { ShieldCheck, Lock, Database, FileKey, CheckCircle2 } from "lucide-react";
import { useApp } from "../app/providers/AppContext";

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
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <button
          onClick={() => toggleSecurityInfo(false)}
          className="absolute top-4 right-4 text-2xl text-slate-400 hover:text-slate-600 transition"
          id="close-security-modal"
        >
          &times;
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Szczegóły Ochrony</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lokalne Saldo Security</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <Lock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Szyfrowanie End-to-End</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Twoje dane finansowe są w pełni szyfrowane na urządzeniu przed wysłaniem do chmury Firebase. 
                Nawet administratorzy nie mają wglądu w kwoty, nazwy transakcji czy budżety.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <FileKey className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Klucze Kryptograficzne</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Klucz do odszyfrowania danych powstaje na bazie Twojego numeru PIN oraz lokalnego <code>saltu</code>. 
                Utrata PIN-u oznacza brak możliwości odszyfrowania profili zabezpieczonych hasłem.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <Database className="w-5 h-5 text-[#137566] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Autozapis i Baza Danych</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aplikacja wykorzystuje technologię Local-First. Zmiany są zapisywane w pamięci podręcznej i 
                wysyłane do bezpiecznej chmury Firestore (w modelu prywatnego dokumentu użytkownika).
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            Ochrona aktywna
          </span>
          <button
            onClick={() => toggleSecurityInfo(false)}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Zamknij
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
