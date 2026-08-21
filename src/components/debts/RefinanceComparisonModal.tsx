import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ArrowRight,
  TrendingDown,
  Scale,
  AlertCircle,
  Building2,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Layers
} from "lucide-react";
import { DebtItem } from "../../types";
import { formatMoney } from "../../utils/format";
import { calculateRefinanceComparison } from "../../services/debtCalculations";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface RefinanceComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtItem | null;
}

export function RefinanceComparisonModal({
  isOpen,
  onClose,
  debt
}: RefinanceComparisonModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [newRate, setNewRate] = useState("5.85");
  const [closingCosts, setClosingCosts] = useState("4500");
  const [newTermYears, setNewTermYears] = useState("20");

  useEffect(() => {
    if (isOpen && debt) {
      const suggestedRate = Math.max(1, Math.round((debt.interestRate - 1.0) * 100) / 100);
      setNewRate(String(suggestedRate));
      const years = debt.remainingMonths ? Math.round(debt.remainingMonths / 12) : 20;
      setNewTermYears(String(Math.max(1, years)));
      setClosingCosts("4500");
    }
  }, [isOpen, debt]);

  const parsedNewRate = Math.max(0, parseFloat(newRate.replace(",", ".")) || 0);
  const parsedCosts = Math.max(0, parseFloat(closingCosts.replace(",", ".")) || 0);
  const parsedTermYears = Math.max(1, parseFloat(newTermYears.replace(",", ".")) || 1);
  const parsedTermMonths = Math.round(parsedTermYears * 12);

  const comparison = useMemo(() => {
    if (!debt) return null;

    return calculateRefinanceComparison({
      balance: debt.balance,
      currentRate: debt.interestRate,
      currentMonthlyPayment: debt.monthlyPayment,
      currentRemainingMonths: debt.remainingMonths,
      newRate: parsedNewRate,
      newTermMonths: parsedTermMonths,
      closingCosts: parsedCosts
    });
  }, [debt, parsedNewRate, parsedTermMonths, parsedCosts]);

  if (!isOpen || !debt || typeof document === "undefined") return null;

  const currency = debt.currency || "PLN";

  const getStatusBadge = (status: "likely_beneficial" | "marginal" | "not_beneficial") => {
    switch (status) {
      case "likely_beneficial":
        return {
          label: "Prawdopodobnie korzystne (szacunek)",
          className: "bg-success-subtle text-success border-success/30",
          icon: <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
        };
      case "marginal":
        return {
          label: "Umiarkowana korzyść / Neutralne",
          className: "bg-warning-subtle text-warning border-warning/30",
          icon: <AlertCircle className="w-4 h-4 text-warning shrink-0" />
        };
      case "not_beneficial":
      default:
        return {
          label: "Nieopłacalne na tych warunkach",
          className: "bg-danger-subtle text-danger border-danger/30",
          icon: <AlertCircle className="w-4 h-4 text-danger shrink-0" />
        };
    }
  };

  const statusBadge = comparison ? getStatusBadge(comparison.comparison.benefitStatus) : null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between shrink-0 bg-surface-2/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-main">
                  Kalkulator opłacalności refinansowania
                </h2>
                <p className="text-xs text-text-muted">
                  {debt.name} ({debt.institution}) • Saldo: {formatMoney(debt.balance, currency)} • Obecne oprocentowanie: {debt.interestRate.toFixed(2)}%
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

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
            {/* Input controls for new offer */}
            <div className="bg-surface-2/40 border border-border/80 rounded-2xl p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-3">
                Wprowadź parametry nowej propozycji / oferty
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                    Nowe oprocentowanie (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-8"
                      placeholder="5.85"
                    />
                    <span className="absolute right-3 top-2 text-xs text-text-muted font-bold pointer-events-none">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                    Koszty przejścia / opłaty
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={closingCosts}
                      onChange={(e) => setClosingCosts(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                      placeholder="4500"
                    />
                    <span className="absolute right-3 top-2 text-xs text-text-muted font-bold pointer-events-none">
                      {currency}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-faint block mt-1">wycena, prowizja, opłaty sądowe</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                    Nowy okres spłaty (lata)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="35"
                    value={newTermYears}
                    onChange={(e) => setNewTermYears(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums"
                    placeholder="20"
                  />
                  <span className="text-[10px] text-text-faint block mt-1">{parsedTermMonths} miesięcy</span>
                </div>
              </div>
            </div>

            {/* Evaluation Status Banner */}
            {statusBadge && comparison && (
              <div className={`p-4 rounded-2xl border flex items-start gap-3 ${statusBadge.className}`}>
                {statusBadge.icon}
                <div className="text-xs">
                  <span className="font-black uppercase tracking-wider block text-[11px] mb-0.5">
                    {statusBadge.label}
                  </span>
                  <p className="font-medium opacity-90 leading-relaxed">
                    {comparison.comparison.statusReason}
                  </p>
                </div>
              </div>
            )}

            {/* Comparison Columns: Current vs Refinanced */}
            {comparison && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Current */}
                <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-text-faint uppercase tracking-wider">
                        Obecne warunki
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-2 text-text-muted">
                        {debt.institution}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-xs text-text-muted">Oprocentowanie:</span>
                        <span className="font-bold text-text-main tabular-nums">{debt.interestRate.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-xs text-text-muted">Miesięczna rata:</span>
                        <span className="font-bold text-text-main tabular-nums">{formatMoney(comparison.current.monthlyPayment, currency)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-xs text-text-muted">Pozostałe odsetki:</span>
                        <span className="font-bold text-text-main tabular-nums">{formatMoney(comparison.current.remainingTotalInterest, currency)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-xs text-text-muted">Całkowity koszt pozostały:</span>
                        <span className="font-black text-text-main tabular-nums">{formatMoney(comparison.current.remainingTotalCost, currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Proposed Refinance */}
                <div className="p-4 sm:p-5 rounded-2xl bg-brand-subtle/40 border border-brand/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Nowa propozycja
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand text-text-inverse">
                        Refinansowanie
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-1 border-b border-brand/20">
                        <span className="text-xs text-text-muted">Nowa stawka:</span>
                        <span className="font-bold text-brand tabular-nums">{parsedNewRate.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-brand/20">
                        <span className="text-xs text-text-muted">Nowa rata:</span>
                        <span className="font-bold text-brand tabular-nums">{formatMoney(comparison.refinanced.monthlyPayment, currency)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-brand/20">
                        <span className="text-xs text-text-muted">Nowe odsetki + koszty:</span>
                        <span className="font-bold text-brand tabular-nums">
                          {formatMoney(comparison.refinanced.totalInterest, currency)} + {formatMoney(comparison.refinanced.closingCosts, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-xs text-text-muted">Nowy koszt całkowity:</span>
                        <span className="font-black text-brand tabular-nums">{formatMoney(comparison.refinanced.totalCost, currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Key KPI Strip: Break-Even, 5Y Savings, Lifetime Gain */}
            {comparison && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-surface border border-border rounded-2xl">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                    Punkt zwrotu kosztów
                  </span>
                  <span className="text-lg sm:text-xl font-black text-text-main tabular-nums block">
                    {comparison.comparison.breakEvenMonths !== null
                      ? `${comparison.comparison.breakEvenMonths} mies.`
                      : "Brak zwrotu"}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {comparison.comparison.breakEvenMonths !== null
                      ? `~${Math.round((comparison.comparison.breakEvenMonths / 12) * 10) / 10} lat do odrobienia opłat`
                      : "koszty przewyższają oszczędności"}
                  </span>
                </div>

                <div className="p-3.5 bg-surface border border-border rounded-2xl">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                    Miesięczna różnica w racie
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-black tabular-nums block ${
                      comparison.comparison.monthlyDifference > 0 ? "text-success" : "text-text-main"
                    }`}
                  >
                    {comparison.comparison.monthlyDifference > 0 ? "-" : "+"}
                    {formatMoney(Math.abs(comparison.comparison.monthlyDifference), currency)}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {comparison.comparison.monthlyDifference > 0 ? "ulga w budżecie co miesiąc" : "wyższa rata przy krótszym okresie"}
                  </span>
                </div>

                <div className="p-3.5 bg-surface border border-border rounded-2xl">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                    Zysk netto w całym okresie
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-black tabular-nums block ${
                      comparison.comparison.netLifetimeSavings > 0 ? "text-brand" : "text-danger"
                    }`}
                  >
                    {comparison.comparison.netLifetimeSavings > 0 ? "+" : ""}
                    {formatMoney(comparison.comparison.netLifetimeSavings, currency)}
                  </span>
                  <span className="text-[10px] text-text-muted">po uwzględnieniu opłat wejściowych</span>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="text-xs text-text-muted flex items-start gap-2 bg-surface-2 p-3 rounded-xl border border-border">
              <ShieldAlert className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <p>
                <strong>Zastrzeżenie:</strong> Obliczenia mają charakter orientacyjny i symulacyjny na podstawie formuły annuitetowej. Banki mogą stosować dodatkowe wymogi (np. ubezpieczenia pomostowe, prowizje za wcześniejszą spłatę starego kredytu).
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border flex items-center justify-end gap-3 bg-surface-2/20 shrink-0">
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
