import { auth } from "../firebase";
import { Camera, Loader2, Lock, AlertTriangle, Download } from "lucide-react";
import { callAiApi, getAiConfig } from "../services/aiClient";
import { useApp } from "../app/providers/AppContext";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Profile } from "../types";
import { expenseCategories, incomeCategories, budgetCategories, iconByCategory, getLocalDateIso } from "../utils";
import { checkDuplicate } from "../services/duplicateDetector";

export * from "./TransactionModal";


export * from "./PaymentModal";

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; target: number }) => void;
}

export function GoalModal({ isOpen, onClose, onSave }: GoalModalProps) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const numTgt = parseFloat(target.replace(",", "."));
    if (isNaN(numTgt) || numTgt <= 0) return;
    setIsSubmitting(true);
    onSave({ name, target: numTgt });
    onClose();
    setName("");
    setTarget("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="goal-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-bg-base/95 backdrop-blur-2xl border border-border p-6 shadow-sm"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-text-muted hover:text-text-faint" id="close-goal-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Oszczędności</p>
        <h2 className="text-2xl font-bold text-white mb-4">Nowy cel oszczędnościowy</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Nazwa celu (np. Wakacje)</label>
            <input
              required
              maxLength={120}
              placeholder="np. Poduszka finansowa, Remont, Nowy laptop"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border p-2.5 outline-none focus:border-emerald-500/50"
              id="input-goal-name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">Kwota docelowa (zł)</label>
            <input
              required
              type="number"
              min="1"
              placeholder="np. 15000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-xl border border-border p-2.5 outline-none focus:border-emerald-500/50"
              id="input-goal-target"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-bg-base py-3 text-sm font-bold text-white shadow-lg hover:bg-surface-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-goal-submit"
          >
            {isSubmitting ? "Tworzenie..." : "Utwórz cel"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface GoalDepositModalProps {
  isOpen: boolean;
  goalName: string;
  onClose: () => void;
  onSave: (amount: number) => void;
}

export function GoalDepositModal({ isOpen, goalName, onClose, onSave }: GoalDepositModalProps) {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const numAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmt) || numAmt === 0) return; // allow negative
    setIsSubmitting(true);
    onSave(numAmt);
    onClose();
    setAmount("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="goal-deposit-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-bg-base/95 backdrop-blur-2xl border border-border p-6 shadow-sm"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-text-muted hover:text-text-faint" id="close-goal-deposit-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Transfer Celu</p>
        <h2 className="text-2xl font-bold text-white mb-4">Transfer: {goalName}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Kwota (wpłata lub wypłata)</label>
            <input
              required
              type="number"
              step="0.01"
              placeholder="np. 100 (wpłata) lub -50 (wypłata)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-border p-2.5 outline-none focus:border-emerald-500/50"
              id="input-goal-deposit-amount"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-bg-base py-3 text-sm font-bold text-white shadow-lg hover:bg-surface-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-goal-deposit-submit"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz wpłatę"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudgets: Record<string, number>;
  onSave: (budgets: Record<string, number>) => void;
}

export function BudgetModal({ isOpen, onClose, currentBudgets, onSave }: BudgetModalProps) {
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const initialized: Record<string, string> = {};
    budgetCategories.forEach((cat) => {
      initialized[cat] = currentBudgets[cat] ? String(currentBudgets[cat]) : "";
    });
    setBudgets(initialized);
  }, [currentBudgets, isOpen]);

  if (!isOpen) return null;

  const handleChange = (cat: string, val: string) => {
    setBudgets((prev) => ({ ...prev, [cat]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const finalBudgets: Record<string, number> = {};
    budgetCategories.forEach((cat) => {
      const num = parseFloat(budgets[cat]?.replace(",", "."));
      finalBudgets[cat] = isNaN(num) || num < 0 ? 0 : num;
    });
    setIsSubmitting(true);
    onSave(finalBudgets);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="budget-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-bg-base/95 backdrop-blur-2xl border border-border p-6 shadow-sm"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-text-muted hover:text-text-faint" id="close-budget-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Limity Miesięczne</p>
        <h2 className="text-2xl font-bold text-white mb-4">Ustaw limity wydatków</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {budgetCategories.map((category) => (
              <div key={category}>
                <label className="block text-xs font-semibold text-white mb-1">{category} (zł)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Brak limitu"
                  value={budgets[category] || ""}
                  onChange={(e) => handleChange(category, e.target.value)}
                  className="w-full rounded-xl border border-border p-2.5 outline-none focus:border-emerald-500/50"
                  id={`input-budget-${category}`}
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-bg-base py-3 text-sm font-bold text-white shadow-lg hover:bg-surface-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-budget-submit"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz limity"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export * from "./ProfileModal";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pin: string) => void;
  onExportData?: () => void;
}

export function PinModal({ isOpen, onClose, onSave, onExportData }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [hasAcceptedWarning, setHasAcceptedWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setHasAcceptedWarning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAcceptedWarning) return;
    if (!/^\d{4,8}$/.test(pin)) return;
    onSave(pin);
    onClose();
    setPin("");
    setHasAcceptedWarning(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="pin-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-bg-base/95 backdrop-blur-2xl border border-border p-6 shadow-sm"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-text-muted hover:text-text-faint cursor-pointer" id="close-pin-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Ochrona profilu</p>
        <h2 className="text-2xl font-bold text-white mb-3">Ustaw kod PIN</h2>

        {/* Warning Copy Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Ostrzeżenie o braku odzyskiwania PIN</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Kod PIN służy do lokalnego szyfrowania danych profilu (AES-GCM / PBKDF2). Aplikacja działa w modelu zero-knowledge – <strong>Twój PIN nie jest przechowywany na żadnym serwerze</strong>.
          </p>
          <p className="text-[11px] font-semibold text-amber-900">
            W przypadku utraty PIN-u dostęp do danych profilu zostanie trwale zablokowany bez możliwości resetu.
          </p>

          {/* Export backup button */}
          {onExportData && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onExportData}
                className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-2 border border-amber-300/60 shadow-2xs cursor-pointer"
                id="btn-export-backup-before-pin"
              >
                <Download className="w-3.5 h-3.5 text-amber-800" />
                Najpierw eksportuj backup (.json)
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Kod PIN (4-8 cyfr)</label>
            <input
              required
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              placeholder="np. 1234"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-xl border border-border p-3 text-center text-xl tracking-widest outline-none focus:border-emerald-500/50"
              id="input-pin-code"
            />
          </div>

          <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-surface cursor-pointer text-xs text-text-main font-medium">
            <input
              type="checkbox"
              checked={hasAcceptedWarning}
              onChange={(e) => setHasAcceptedWarning(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-white focus:ring-emerald-500/50"
              id="checkbox-pin-recovery-warning"
            />
            <span>Rozumiem, że utrata PIN = utrata danych profilu</span>
          </label>

          <button
            type="submit"
            disabled={!hasAcceptedWarning || !/^\d{4,8}$/.test(pin)}
            className="w-full rounded-xl bg-bg-base py-3 text-sm font-bold text-white shadow-lg hover:bg-surface-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            id="btn-pin-submit"
          >
            Zapisz PIN
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface UnlockModalProps {
  isOpen: boolean;
  profileName: string;
  onUnlock: (pin: string) => Promise<boolean>;
  onSelectOtherProfile: () => void;
}

export function UnlockModal({ isOpen, profileName, onUnlock, onSelectOtherProfile }: UnlockModalProps) {
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const success = await onUnlock(pin);
    if (success) {
      setPin("");
    } else {
      setErrorMsg("Nieprawidłowy kod PIN. Spróbuj ponownie.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/95 p-4 backdrop-blur-xs"
      id="unlock-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-sm rounded-3xl bg-bg-base/95 backdrop-blur-2xl border border-border p-8 shadow-sm ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center text-white">
            <Lock className="w-8 h-8" />
          </div>
        </div>
        
        <p className="text-[10px] font-bold uppercase tracking-wider text-center text-[#849590]">Zabezpieczony Profil</p>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Podaj PIN</h2>
        <p className="text-sm text-text-faint text-center mb-8">Profil <strong>{profileName}</strong> wymaga autoryzacji.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              required
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              placeholder="••••"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={`w-full rounded-xl border-2 p-4 text-center text-3xl tracking-[1em] outline-none transition ${errorMsg ? 'border-red-300 focus:border-red-500 text-red-600 bg-red-50' : 'border-border focus:border-emerald-500/50 text-text-main'}`}
              id="input-unlock-pin"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-center text-[#d55e50] font-bold animate-fade-in" id="unlock-error-msg">
              {errorMsg}
            </p>
          )}

          <div className="pt-4 space-y-3">
            <button
              type="submit"
              className="w-full rounded-xl bg-bg-base py-4 text-sm font-bold text-white shadow-lg hover:bg-surface-2 hover:scale-[1.02] transition-all"
              id="btn-unlock-submit"
            >
              Odblokuj profil
            </button>
            
            <button
              type="button"
              onClick={onSelectOtherProfile}
              className="w-full rounded-xl py-3 text-sm font-semibold text-text-faint hover:text-text-main transition"
              id="btn-unlock-other"
            >
              Wróć do wyboru profili
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export { ChangelogModal } from "./ChangelogModal";
