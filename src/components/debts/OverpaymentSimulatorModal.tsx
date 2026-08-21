import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, TrendingDown, Clock, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { MockDebtItem } from "./mockData";
import { formatMoney } from "../../utils/format";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface OverpaymentSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: MockDebtItem | null;
}

export function OverpaymentSimulatorModal({
  isOpen,
  onClose,
  debt
}: OverpaymentSimulatorModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [amount, setAmount] = useState("1000");
  const [frequency, setFrequency] = useState<"monthly" | "one_time" | "yearly">("monthly");
  const [targetStrategy, setTargetStrategy] = useState<"reduce_term" | "reduce_payment">("reduce_term");

  if (!isOpen || !debt) return null;

  const currentMonthly = debt.monthlyPayment;
  const currentInterest = debt.remainingInterest;
  const currentEndYear = 2051;

  // Mock computed outputs based on current inputs
  const parsedAmount = parseFloat(amount.replace(",", ".")) || 0;
  const simulatedYearsSaved = targetStrategy === "reduce_term" 
    ? Math.min(14, Math.max(1, Math.round((parsedAmount / 200) * 1.2)))
    : 0;
  const simulatedNewEndYear = currentEndYear - simulatedYearsSaved;
  const simulatedInterestSaved = Math.round(parsedAmount * 38.5 + 5000);
  const simulatedNewPayment = targetStrategy === "reduce_payment"
    ? Math.max(800, currentMonthly - Math.round(parsedAmount * 0.38))
    : currentMonthly;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between shrink-0 bg-surface-2/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-main">
                  Symulator nadpłaty kredytu
                </h2>
                <p className="text-xs text-text-muted">
                  {debt.name} ({debt.institution}) • Saldo: {formatMoney(debt.balance, "PLN")}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-full transition cursor-pointer"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form & Simulation Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
            {/* Input Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Kwota nadpłaty
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                    placeholder="1000"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-text-muted font-bold pointer-events-none">
                    PLN
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Częstotliwość
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                >
                  <option value="monthly">Miesięczna</option>
                  <option value="one_time">Jednorazowa</option>
                  <option value="yearly">Roczna</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Cel / Efekt
                </label>
                <select
                  value={targetStrategy}
                  onChange={(e) => setTargetStrategy(e.target.value as any)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                >
                  <option value="reduce_term">Skrócenie okresu spłaty</option>
                  <option value="reduce_payment">Zmniejszenie raty</option>
                </select>
              </div>
            </div>

            {/* Comparison Table / Box: Baseline vs Po nadpłacie */}
            <div className="bg-surface-2/70 border border-border/80 rounded-2xl p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-4">
                Porównanie scenariuszy
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Baseline Column */}
                <div className="p-4 bg-surface rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-text-faint uppercase tracking-wider">
                      Stan obecny (Baseline)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-offset text-text-muted">
                      Bez nadpłat
                    </span>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Rata miesięczna:</span>
                      <span className="font-bold text-text-main tabular-nums">{formatMoney(currentMonthly, "PLN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Koniec spłaty:</span>
                      <span className="font-bold text-text-main">{currentEndYear} (25 lat)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Pozostałe odsetki:</span>
                      <span className="font-bold text-text-main tabular-nums">{formatMoney(currentInterest, "PLN")}</span>
                    </div>
                  </div>
                </div>

                {/* Overpayment Column */}
                <div className="p-4 bg-brand-subtle/50 rounded-xl border border-brand/30 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Po nadpłacaniu
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand text-text-inverse">
                      Zoptymalizowany
                    </span>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Nowa rata:</span>
                      <span className="font-bold text-brand tabular-nums">{formatMoney(simulatedNewPayment, "PLN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Nowy koniec spłaty:</span>
                      <span className="font-bold text-brand tabular-nums">{simulatedNewEndYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Nowe odsetki:</span>
                      <span className="font-bold text-brand tabular-nums">
                        {formatMoney(Math.max(0, currentInterest - simulatedInterestSaved), "PLN")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlight summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="p-3 bg-brand text-text-inverse rounded-xl flex items-center gap-3">
                  <TrendingDown className="w-6 h-6 shrink-0 opacity-90" />
                  <div>
                    <span className="text-[11px] font-medium opacity-80 block">Zaoszczędzone odsetki</span>
                    <span className="text-lg font-black tracking-tight">{formatMoney(simulatedInterestSaved, "PLN")}</span>
                  </div>
                </div>

                <div className="p-3 bg-surface border border-brand/30 text-text-main rounded-xl flex items-center gap-3">
                  <Clock className="w-6 h-6 text-brand shrink-0" />
                  <div>
                    <span className="text-[11px] font-medium text-text-muted block">Zyskany czas</span>
                    <span className="text-lg font-black tracking-tight text-brand">
                      {targetStrategy === "reduce_term" ? `${simulatedYearsSaved} lat wcześniej` : "Niższa rata"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note & Rules check */}
            <div className="text-xs text-text-muted flex items-start gap-2 bg-surface-2 p-3 rounded-xl border border-border">
              <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p>
                <strong>Warunki umowy:</strong> PKO BP dopuszcza bezpłatną nadpłatę do 100% salda kredytu po 36 miesiącach od uruchomienia bez prowizji za wcześniejszą spłatę.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-border flex items-center justify-between gap-3 bg-surface-2/20">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main rounded-xl hover:bg-surface-2 transition cursor-pointer"
            >
              Zamknij
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-text-inverse text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              Zapisz jako aktywny scenariusz
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
