import { auth } from "../firebase";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { Camera, Loader2, Lock, AlertTriangle, Download } from "lucide-react";
import { callAiApi, getAiConfig } from "../services/aiClient";
import { useApp } from "../app/providers/AppContext";
import React, { useState, useEffect, useRef } from "react";
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
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
      id="goal-modal"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-bg-base/95 backdrop-blur-2xl border border-border flex flex-col max-h-[90vh] shadow-sm overflow-hidden"
       ref={modalRef}>
        <div className="shrink-0 p-6 pb-4 border-b border-border flex items-start justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted truncate" title="Oszczędności">Oszczędności</p>
            <h2 id="goal-modal-title" className="text-2xl font-bold text-text-main truncate" title="Nowy cel oszczędnościowy">Nowy cel oszczędnościowy</h2>
          </div>
          <button onClick={onClose} aria-label="Zamknij" className="text-2xl text-text-muted hover:text-text-main hover:bg-surface-offset w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ml-4 shrink-0 leading-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring" id="close-goal-modal">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-w-0 p-6 custom-scrollbar">
          <form id="goal-modal-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1 truncate" title="Nazwa celu (np. Wakacje)">Nazwa celu (np. Wakacje)</label>
              <input
                required
                maxLength={120}
                placeholder="np. Poduszka finansowa, Remont, Nowy laptop"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
                id="input-goal-name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1 truncate" title="Kwota docelowa (zł)">Kwota docelowa (zł)</label>
              <input
                required
                type="number"
                min="1"
                placeholder="np. 15000"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
                id="input-goal-target"
              />
            </div>
          </form>
        </div>

        <div className="shrink-0 p-6 pt-4 border-t border-border bg-bg-base/95 rounded-b-2xl">
          <button
            type="submit"
            form="goal-modal-form"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-text-inverse shadow-lg hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-goal-submit"
          >
            {isSubmitting ? "Tworzenie..." : "Utwórz cel"}
          </button>
        </div>
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
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
      id="goal-deposit-modal"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-deposit-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-bg-base/95 backdrop-blur-2xl border border-border flex flex-col max-h-[90vh] shadow-sm overflow-hidden"
       ref={modalRef}>
        <div className="shrink-0 p-6 pb-4 border-b border-border flex items-start justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted truncate" title="Transfer Celu">Transfer Celu</p>
            <h2 id="goal-deposit-modal-title" className="text-2xl font-bold text-text-main truncate" title={`Transfer: ${goalName}`}>Transfer: {goalName}</h2>
          </div>
          <button onClick={onClose} aria-label="Zamknij" className="text-2xl text-text-muted hover:text-text-main hover:bg-surface-offset w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ml-4 shrink-0 leading-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring" id="close-goal-deposit-modal">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-w-0 p-6 custom-scrollbar">
          <form id="goal-deposit-modal-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1 truncate" title="Kwota (wpłata lub wypłata)">Kwota (wpłata lub wypłata)</label>
              <input
                required
                type="number"
                step="0.01"
                placeholder="np. 100 (wpłata) lub -50 (wypłata)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
                id="input-goal-deposit-amount"
              />
            </div>
          </form>
        </div>

        <div className="shrink-0 p-6 pt-4 border-t border-border bg-bg-base/95 rounded-b-2xl">
          <button
            type="submit"
            form="goal-deposit-modal-form"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-text-inverse shadow-lg hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-goal-deposit-submit"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz wpłatę"}
          </button>
        </div>
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
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
      id="budget-modal"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-bg-base/95 backdrop-blur-2xl border border-border flex flex-col max-h-[90vh] shadow-sm overflow-hidden"
       ref={modalRef}>
        <div className="shrink-0 p-6 pb-4 border-b border-border flex items-start justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted truncate" title="Limity Miesięczne">Limity Miesięczne</p>
            <h2 id="budget-modal-title" className="text-2xl font-bold text-text-main truncate" title="Ustaw limity wydatków">Ustaw limity wydatków</h2>
          </div>
          <button onClick={onClose} aria-label="Zamknij" className="text-2xl text-text-muted hover:text-text-main hover:bg-surface-offset w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ml-4 shrink-0 leading-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring" id="close-budget-modal">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-w-0 p-6 custom-scrollbar">
          <form id="budget-modal-form" onSubmit={handleSubmit} className="space-y-3">
            {budgetCategories.map((category) => (
              <div key={category}>
                <label className="block text-xs font-medium text-text-muted mb-1 truncate" title={`${category} (zł)`}>{category} (zł)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Brak limitu"
                  value={budgets[category] || ""}
                  onChange={(e) => handleChange(category, e.target.value)}
                  className="w-full rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
                  id={`input-budget-${category}`}
                />
              </div>
            ))}
          </form>
        </div>

        <div className="shrink-0 p-6 pt-4 border-t border-border bg-bg-base/95 rounded-b-2xl">
          <button
            type="submit"
            form="budget-modal-form"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-text-inverse shadow-lg hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-budget-submit"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz limity"}
          </button>
        </div>
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
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
      id="pin-modal"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-bg-base/95 backdrop-blur-2xl border border-border flex flex-col max-h-[90vh] shadow-sm overflow-hidden"
       ref={modalRef}>
        <div className="shrink-0 p-6 pb-4 border-b border-border flex items-start justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted truncate" title="Ochrona profilu">Ochrona profilu</p>
            <h2 id="pin-modal-title" className="text-2xl font-bold text-text-main truncate" title="Ustaw kod PIN">Ustaw kod PIN</h2>
          </div>
          <button onClick={onClose} aria-label="Zamknij" className="text-2xl text-text-muted hover:text-text-main hover:bg-surface-offset w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ml-4 shrink-0 leading-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring" id="close-pin-modal">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-w-0 p-6 custom-scrollbar">
          {/* Warning Copy Box */}
          <div className="bg-warning-subtle border border-warning/20 rounded-xl p-4 mb-4 text-xs text-warning space-y-2">
            <div className="flex items-center gap-2 font-bold text-warning min-w-0">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
              <span className="truncate">Ostrzeżenie o braku odzyskiwania PIN</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Kod PIN służy do lokalnego szyfrowania danych profilu (AES-GCM / PBKDF2). Aplikacja działa w modelu zero-knowledge – <strong>Twój PIN nie jest przechowywany na żadnym serwerze</strong>.
            </p>
            <p className="text-xs font-semibold text-warning">
              W przypadku utraty PIN-u dostęp do danych profilu zostanie trwale zablokowany bez możliwości resetu.
            </p>

            {/* Export backup button */}
            {onExportData && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onExportData}
                  className="w-full bg-surface border border-border text-text-main hover:bg-surface-2 font-bold py-2 px-3 rounded-lg text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer min-w-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
                  id="btn-export-backup-before-pin"
                >
                  <Download className="w-3.5 h-3.5 text-text-main shrink-0" />
                  <span className="truncate">Najpierw eksportuj backup (.json)</span>
                </button>
              </div>
            )}
          </div>

          <form id="pin-modal-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1 truncate" title="Kod PIN (4-8 cyfr)">Kod PIN (4-8 cyfr)</label>
              <input
                required
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4,8}"
                placeholder="np. 1234"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full rounded-xl border border-border p-3 text-center text-xl tracking-widest focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
                id="input-pin-code"
              />
            </div>

            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-surface hover:bg-surface-offset transition-colors cursor-pointer text-xs text-text-main font-medium min-w-0">
              <input
                type="checkbox"
                checked={hasAcceptedWarning}
                onChange={(e) => setHasAcceptedWarning(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-brand focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0"
                id="checkbox-pin-recovery-warning"
              />
              <span className="truncate" title="Rozumiem, że utrata PIN = utrata danych profilu">Rozumiem, że utrata PIN = utrata danych profilu</span>
            </label>
          </form>
        </div>

        <div className="shrink-0 p-6 pt-4 border-t border-border bg-bg-base/95 rounded-b-2xl">
          <button
            type="submit"
            form="pin-modal-form"
            disabled={!hasAcceptedWarning || !/^\d{4,8}$/.test(pin)}
            className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-text-inverse shadow-lg hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-pin-submit"
          >
            Zapisz PIN
          </button>
        </div>
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
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen);
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
      id="unlock-modal"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-sm rounded-3xl bg-bg-base/95 backdrop-blur-2xl border border-border flex flex-col max-h-[90vh] shadow-sm overflow-hidden ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
       ref={modalRef}>
        <div className="flex-1 overflow-y-auto min-w-0 p-8 custom-scrollbar flex flex-col">
          <div className="flex justify-center mb-6 shrink-0">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center text-text-main">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          
          <div className="shrink-0">
            <p className="text-xs font-medium text-center text-text-muted truncate" title="Zabezpieczony Profil">Zabezpieczony Profil</p>
            <h2 id="unlock-modal-title" className="text-2xl font-bold text-text-main text-center mb-2 truncate" title="Podaj PIN">Podaj PIN</h2>
            <p className="text-sm text-text-faint text-center mb-8 line-clamp-2" title={`Profil ${profileName} wymaga autoryzacji.`}>
              Profil <strong>{profileName}</strong> wymaga autoryzacji.
            </p>
          </div>

          <form id="unlock-modal-form" onSubmit={handleSubmit} className="space-y-4 shrink-0">
            <div>
              <input
                required
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4,8}"
                placeholder="••••"
                aria-label="Wprowadź kod PIN"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className={`w-full rounded-xl border-2 p-4 text-center text-3xl tracking-[1em] transition-colors ${errorMsg ? 'border-danger focus-visible:ring-2 focus-visible:ring-danger text-danger bg-danger-subtle' : 'border-border focus-visible:ring-2 focus-visible:ring-focus-ring text-text-main'}`}
                id="input-unlock-pin"
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-center text-danger font-bold animate-fade-in" id="unlock-error-msg">
                {errorMsg}
              </p>
            )}
          </form>
        </div>

        <div className="shrink-0 p-8 pt-4 border-t border-border bg-bg-base/95 rounded-b-3xl">
          <div className="space-y-3">
            <button
              type="submit"
              form="unlock-modal-form"
              className="w-full rounded-xl bg-brand py-4 text-sm font-bold text-text-inverse shadow-lg hover:bg-brand-hover active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-unlock-submit"
            >
              Odblokuj profil
            </button>
            
            <button
              type="button"
              onClick={onSelectOtherProfile}
              className="w-full rounded-xl py-3 text-sm font-semibold text-text-faint hover:text-text-main hover:bg-surface-offset active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-unlock-other"
            >
              Wróć do wyboru profili
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export { ChangelogModal } from "./ChangelogModal";
