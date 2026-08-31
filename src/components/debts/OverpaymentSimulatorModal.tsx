import React, { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, TrendingDown, Clock, ArrowRight, ShieldAlert } from "lucide-react";
import { DebtItem } from "../../types";
import { formatMoney, parseAmountInput } from "../../utils/format";
import { calculateOverpayment, calculateDebtAmortizationSchedule } from "../../services/debtCalculations";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface OverpaymentSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtItem | null;
  initialAmount?: number;
  initialFrequency?: "monthly" | "one_time" | "yearly";
}

export function OverpaymentSimulatorModal({
  isOpen,
  onClose,
  debt,
  initialAmount,
  initialFrequency
}: OverpaymentSimulatorModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [amount, setAmount] = useState(() => (initialAmount !== undefined ? String(initialAmount) : "1000"));
  const [frequency, setFrequency] = useState<"monthly" | "one_time" | "yearly">(() => initialFrequency || "monthly");
  const [targetStrategy, setTargetStrategy] = useState<"reduce_term" | "reduce_payment">("reduce_term");

  React.useEffect(() => {
    if (isOpen) {
      if (initialAmount !== undefined) {
        setAmount(String(initialAmount));
      }
      if (initialFrequency) {
        setFrequency(initialFrequency);
      }
    }
  }, [isOpen, initialAmount, initialFrequency]);

  const parsedAmount = Math.max(0, parseAmountInput(amount) ?? 0);

  const simulation = useMemo(() => {
    if (!debt) return null;

    return calculateOverpayment({
      balance: debt.balance,
      annualRatePct: debt.interestRate,
      monthlyPayment: debt.monthlyPayment,
      overpaymentAmount: parsedAmount,
      frequency,
      targetStrategy
    });
  }, [debt, parsedAmount, frequency, targetStrategy]);

  const amortizationCheck = useMemo(() => {
    if (!debt) return null;
    return calculateDebtAmortizationSchedule(debt);
  }, [debt]);

  if (!isOpen || !debt || typeof document === "undefined") return null;

  const currency = debt.currency || "PLN";

  const baselineYears = simulation ? Math.round((simulation.baseline.months / 12) * 10) / 10 : 0;
  const withOverpaymentYears = simulation ? Math.round((simulation.withOverpayment.months / 12) * 10) / 10 : 0;

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
          aria-labelledby="overpayment-modal-title"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between shrink-0 bg-surface-2/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 id="overpayment-modal-title" className="text-base sm:text-lg font-bold text-text-main">
                  Symulator nadpłaty zobowiązania
                </h2>
                <p className="text-xs text-text-muted">
                  {debt.name} ({debt.institution}) • Saldo: {formatMoney(debt.balance, currency)} • Rata:{" "}
                  {formatMoney(debt.monthlyPayment, currency)}
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
                <label htmlFor="overpayment-amount-input" className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Kwota nadpłaty
                </label>
                <div className="relative">
                  <input
                    id="overpayment-amount-input"
                    type="number"
                    min="0"
                    step="50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                    placeholder="1000"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-text-muted font-bold pointer-events-none">
                    {currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Częstotliwość
                </label>
                <select
                  value={frequency}
                  disabled={targetStrategy === "reduce_payment"}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="monthly">Miesięczna</option>
                  <option value="one_time">Jednorazowa</option>
                  <option value="yearly">Roczna</option>
                </select>
                {targetStrategy === "reduce_payment" && (
                  <p className="text-[10px] text-text-faint mt-1">
                    Zmniejszenie raty liczy się zawsze jako jednorazowa wpłata — cykliczna nadpłata z definicji skraca okres spłaty, nie obniża raty.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Cel / Efekt
                </label>
                <select
                  value={targetStrategy}
                  onChange={(e) => {
                    const next = e.target.value as "reduce_term" | "reduce_payment";
                    setTargetStrategy(next);
                    if (next === "reduce_payment") {
                      setFrequency("one_time");
                    }
                  }}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                >
                  <option value="reduce_term">Skrócenie okresu spłaty</option>
                  <option value="reduce_payment">Zmniejszenie raty</option>
                </select>
              </div>
            </div>

            {/* Comparison Table / Box: Baseline vs Po nadpłacie */}
            {(() => {
              if (amortizationCheck && !amortizationCheck.isEligible) {
                return (
                  <div className="p-4 bg-surface-2 border border-border rounded-xl text-center">
                    <p className="text-[11px] text-text-muted">
                      {amortizationCheck.errorMessage || "Przy obecnych parametrach nie da się oszacować wpływu nadpłaty."}
                    </p>
                  </div>
                );
              }
              if (parsedAmount === 0) {
                return (
                  <div className="p-4 bg-surface-2 border border-border rounded-xl text-center">
                    <p className="text-[11px] text-text-muted">
                      Wprowadź kwotę nadpłaty, aby zobaczyć porównanie.
                    </p>
                  </div>
                );
              }
              if (!simulation) return null;

              // Check if we can safely compute percent saved
              const totalBaselineInterest = simulation.baseline.totalInterest;
              const interestSaved = simulation.savings.interestSaved;
              const interestSavedPct = totalBaselineInterest > 0 
                ? Math.round((interestSaved / totalBaselineInterest) * 100) 
                : null;

              return (
                <div className="bg-surface-2/70 border border-border/80 rounded-2xl p-4 sm:p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-4">
                    Efekt nadpłaty
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Baseline Column */}
                    <div className="p-4 bg-surface rounded-xl border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-text-faint uppercase tracking-wider">
                          Scenariusz bazowy
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-offset text-text-muted">
                          Bez nadpłat
                        </span>
                      </div>

                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Rata miesięczna:</span>
                          <span className="font-bold text-text-main tabular-nums">
                            {formatMoney(simulation.baseline.monthlyPayment, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Czas do spłaty:</span>
                          <span className="font-bold text-text-main">
                            {simulation.baseline.months} mies.
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Szacowane odsetki:</span>
                          <span className="font-bold text-text-main tabular-nums">
                            {formatMoney(simulation.baseline.totalInterest, currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Overpayment Column */}
                    <div className="p-4 bg-brand-subtle/50 rounded-xl border border-brand/30 relative">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Scenariusz po nadpłacie
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand text-text-inverse">
                          Symulacja
                        </span>
                      </div>

                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Nowa rata:</span>
                          <span className="font-bold text-brand tabular-nums">
                            {formatMoney(simulation.withOverpayment.monthlyPayment, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Nowy czas spłaty:</span>
                          <span className="font-bold text-brand tabular-nums">
                            {simulation.withOverpayment.months} mies.
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Nowe odsetki:</span>
                          <span className="font-bold text-brand tabular-nums">
                            {formatMoney(simulation.withOverpayment.totalInterest, currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Highlight summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div className="p-3 bg-brand text-text-inverse rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TrendingDown className="w-6 h-6 shrink-0 opacity-90" />
                        <div>
                          <span className="text-[11px] font-medium opacity-80 block">Oszczędność odsetek</span>
                          <span className="text-lg font-black tracking-tight">
                            {formatMoney(simulation.savings.interestSaved, currency)}
                          </span>
                        </div>
                      </div>
                      {interestSavedPct !== null && interestSavedPct > 0 && (
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">
                          -{interestSavedPct}%
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-surface border border-brand/30 text-text-main rounded-xl flex items-center gap-3">
                      <Clock className="w-6 h-6 text-brand shrink-0" />
                      <div>
                        <span className="text-[11px] font-medium text-text-muted block">
                          {targetStrategy === "reduce_term" ? "Oszczędność czasu" : "Zmniejszenie raty"}
                        </span>
                        <span className="text-lg font-black tracking-tight text-brand">
                          {targetStrategy === "reduce_term"
                            ? `${simulation.savings.monthsSaved} mies.`
                            : `-${formatMoney(simulation.savings.monthlyReduction, currency)} / mc`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Note & Rules check */}
            <div className="text-xs text-text-muted flex items-start gap-2 bg-surface-2 p-3 rounded-xl border border-border">
              <ShieldAlert className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <p>
                <strong>Zasada działania:</strong> Obliczenia opierają się na standardowej formule annuitetowej i deterministycznym rozbiciu kapitału i odsetek. Wszelkie nadpłaty zmniejszają bazę kapitałową kredytu.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-border flex items-center justify-end gap-3 bg-surface-2/20">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-text-inverse text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              Zamknij
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
