import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight, CheckCircle2, TrendingDown, Scale, AlertCircle, Building2, HelpCircle } from "lucide-react";
import { MockDebtItem } from "./mockData";
import { formatMoney } from "../../utils/format";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface RefinanceComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: MockDebtItem | null;
}

export function RefinanceComparisonModal({
  isOpen,
  onClose,
  debt
}: RefinanceComparisonModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [newRate, setNewRate] = useState("5.90");
  const [closingCosts, setClosingCosts] = useState("11500");
  const [newTermYears, setNewTermYears] = useState("25");

  if (!isOpen || !debt) return null;

  const currentRate = debt.interestRate;
  const currentMonthly = debt.monthlyPayment;
  const currentRemainingCost = debt.remainingInterest;

  // Mock computed calculations
  const parsedNewRate = parseFloat(newRate.replace(",", ".")) || 0;
  const parsedCosts = parseFloat(closingCosts.replace(",", ".")) || 0;
  const simulatedNewMonthly = Math.round(currentMonthly * (parsedNewRate / currentRate) + 80);
  const monthlySavings = Math.max(0, currentMonthly - simulatedNewMonthly);
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(parsedCosts / monthlySavings) : 0;
  const total5YearGain = monthlySavings * 60 - parsedCosts;
  const totalLifetimeGain = 44200;

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
                  Porównanie refinansowania i nowych ofert
                </h2>
                <p className="text-xs text-text-muted">
                  Analiza opłacalności przeniesienia kredytu do innego banku
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
                Parametry nowej oferty
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1">
                    Nowe oprocentowanie (stałe / zmienne)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-8"
                    />
                    <span className="absolute right-3 top-2 text-xs text-text-muted font-bold pointer-events-none">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1">
                    Koszty wejścia / prowizje
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={closingCosts}
                      onChange={(e) => setClosingCosts(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                    />
                    <span className="absolute right-3 top-2 text-xs text-text-muted font-bold pointer-events-none">PLN</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1">
                    Nowy okres spłaty
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={newTermYears}
                      onChange={(e) => setNewTermYears(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-8"
                    />
                    <span className="absolute right-3 top-2 text-xs text-text-muted font-bold pointer-events-none">lat</span>
                  </div>
                </div>
              </div>
            </div>

            {/* High-trust Side-by-Side Comparison Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Loan */}
              <div className="p-5 bg-surface border border-border rounded-2xl">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block">Obecny kredyt</span>
                    <h4 className="text-sm font-bold text-text-main">{debt.name}</h4>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 text-text-muted">
                    {debt.institution}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Oprocentowanie:</span>
                    <span className="font-bold text-text-main tabular-nums">{currentRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Rata miesięczna:</span>
                    <span className="font-bold text-text-main tabular-nums">{formatMoney(currentMonthly, "PLN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Pozostały koszt odsetek:</span>
                    <span className="font-bold text-text-main tabular-nums">{formatMoney(currentRemainingCost, "PLN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Koszty przeniesienia:</span>
                    <span className="font-bold text-text-muted">0 PLN</span>
                  </div>
                </div>
              </div>

              {/* Proposed Refinanced Offer */}
              <div className="p-5 bg-brand-subtle/50 border border-brand/40 rounded-2xl relative">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-brand/20">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand block">Nowa propozycja</span>
                    <h4 className="text-sm font-bold text-text-main">Oferta refinansowa (Bank B)</h4>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand text-text-inverse">
                    -0.95 p.p.
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Oprocentowanie:</span>
                    <span className="font-bold text-brand tabular-nums">{parsedNewRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Nowa rata miesięczna:</span>
                    <span className="font-bold text-brand tabular-nums">{formatMoney(simulatedNewMonthly, "PLN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Szacowany koszt odsetek:</span>
                    <span className="font-bold text-brand tabular-nums">{formatMoney(126000, "PLN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Koszty startowe (prowizja, wycena):</span>
                    <span className="font-bold text-text-main tabular-nums">{formatMoney(parsedCosts, "PLN")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-surface-2 border border-border rounded-xl text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                  Zwrot kosztów (Break-Even)
                </span>
                <span className="text-xl font-black text-brand tabular-nums">
                  {breakEvenMonths} mies.
                </span>
                <span className="text-[10px] text-text-muted block mt-0.5">czas zwrotu prowizji</span>
              </div>

              <div className="p-4 bg-surface-2 border border-border rounded-xl text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                  Zysk po 5 latach
                </span>
                <span className="text-xl font-black text-text-main tabular-nums">
                  {formatMoney(total5YearGain, "PLN")}
                </span>
                <span className="text-[10px] text-text-muted block mt-0.5">po potrąceniu kosztów</span>
              </div>

              <div className="p-4 bg-surface-2 border border-border rounded-xl text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                  Zysk w pełnym okresie
                </span>
                <span className="text-xl font-black text-brand tabular-nums">
                  {formatMoney(totalLifetimeGain, "PLN")}
                </span>
                <span className="text-[10px] text-text-muted block mt-0.5">całkowita oszczędność</span>
              </div>
            </div>

            {/* Educational / Context warning */}
            <div className="p-3.5 bg-surface rounded-xl border border-border text-xs text-text-muted flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <div>
                <strong>Rekomendacja analityczna:</strong> Ponieważ obecna stała stopa wygasa za 18 miesięcy, refinansowanie już teraz zablokuje niższą stawkę i zwróci koszty operacyjne w 19 miesięcy.
              </div>
            </div>
          </div>

          {/* Footer */}
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
              Zapisz jako scenariusz oferty
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
