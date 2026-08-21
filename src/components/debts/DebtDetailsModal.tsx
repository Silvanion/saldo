import React, { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Home,
  CreditCard,
  Banknote,
  Percent,
  Sparkles,
  Layers,
  Scale,
  Calendar,
  Clock,
  ArrowRight,
  Info,
  CheckCircle2,
  FileText
} from "lucide-react";
import { DebtItem } from "../../types";
import { formatMoney } from "../../utils/format";
import {
  calculateAmortizationSchedule,
  calculateDebtAmortizationSchedule,
  calculateOverpayment,
  calculateRefinanceComparison
} from "../../services/debtCalculations";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export type DebtDetailTab = "overview" | "schedule" | "overpayment" | "refinance" | "terms";

interface DebtDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtItem | null;
  initialTab?: DebtDetailTab;
  onOpenOverpaymentModal?: (debt: DebtItem) => void;
  onOpenRefinanceModal?: (debt: DebtItem) => void;
}

export function DebtDetailsModal({
  isOpen,
  onClose,
  debt,
  initialTab = "overview",
  onOpenOverpaymentModal,
  onOpenRefinanceModal
}: DebtDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [activeTab, setActiveTab] = useState<DebtDetailTab>(initialTab);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const amortization = useMemo(() => {
    return calculateDebtAmortizationSchedule(debt);
  }, [debt]);

  const overpaymentQuickA = useMemo(() => {
    if (!debt) return null;
    return calculateOverpayment({
      balance: debt.balance,
      annualRatePct: debt.interestRate,
      monthlyPayment: debt.monthlyPayment,
      overpaymentAmount: 500,
      frequency: "monthly",
      targetStrategy: "reduce_term"
    });
  }, [debt]);

  const overpaymentQuickB = useMemo(() => {
    if (!debt) return null;
    return calculateOverpayment({
      balance: debt.balance,
      annualRatePct: debt.interestRate,
      monthlyPayment: debt.monthlyPayment,
      overpaymentAmount: 1000,
      frequency: "monthly",
      targetStrategy: "reduce_term"
    });
  }, [debt]);

  const refinancePreview = useMemo(() => {
    if (!debt || debt.type !== "mortgage") return null;
    const targetRate = Math.max(1, Math.round((debt.interestRate - 1.0) * 100) / 100);
    return calculateRefinanceComparison({
      balance: debt.balance,
      currentRate: debt.interestRate,
      currentMonthlyPayment: debt.monthlyPayment,
      currentRemainingMonths: debt.remainingMonths,
      newRate: targetRate,
      closingCosts: 4500
    });
  }, [debt]);

  if (!isOpen || !debt || typeof document === "undefined") return null;

  const currency = debt.currency || "PLN";

  // First month split
  const monthlyRate = (debt.interestRate / 100) / 12;
  const currentInterestPortion = Math.min(debt.monthlyPayment, Math.round(debt.balance * monthlyRate * 100) / 100);
  const currentPrincipalPortion = Math.max(0, Math.round((debt.monthlyPayment - currentInterestPortion) * 100) / 100);
  const interestPct = debt.monthlyPayment > 0 ? Math.round((currentInterestPortion / debt.monthlyPayment) * 100) : 0;
  const principalPct = Math.max(0, 100 - interestPct);

  // Derived LTV
  const ltv =
    debt.propertyValue && debt.propertyValue > 0
      ? Math.round((debt.balance / debt.propertyValue) * 100)
      : null;

  const getTypeLabel = () => {
    switch (debt.type) {
      case "mortgage":
        return "Kredyt hipoteczny";
      case "credit_card":
        return "Karta kredytowa";
      case "cash_loan":
        return "Kredyt gotówkowy";
      case "revolving":
        return "Limit odnawialny";
      case "bnpl":
        return "Raty 0% / BNPL";
      default:
        return "Zobowiązanie";
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Header */}
          <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between shrink-0 bg-surface-2/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <Home className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-text-main truncate">
                    {debt.name}
                  </h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-brand-subtle text-brand border border-brand/20">
                    {getTypeLabel()}
                  </span>
                  {debt.status === "closed" && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-surface-2 text-text-muted border border-border">
                      Zamknięte
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted truncate">
                  {debt.institution} • Saldo: {formatMoney(debt.balance, currency)} • Rata:{" "}
                  {formatMoney(debt.monthlyPayment, currency)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-full transition cursor-pointer"
              aria-label="Zamknij szczegóły"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Internal Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 px-5 sm:px-6 border-b border-border bg-surface-2/20 overflow-x-auto custom-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "overview"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Przegląd
            </button>

            <button
              onClick={() => setActiveTab("schedule")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "schedule"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Harmonogram spłat
            </button>

            {(debt.type === "mortgage" || debt.type === "cash_loan") && (
              <button
                onClick={() => setActiveTab("overpayment")}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "overpayment"
                    ? "border-brand text-brand"
                    : "border-transparent text-text-muted hover:text-text-main"
                }`}
              >
                Nadpłata
              </button>
            )}

            {debt.type === "mortgage" && (
              <button
                onClick={() => setActiveTab("refinance")}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "refinance"
                    ? "border-brand text-brand"
                    : "border-transparent text-text-muted hover:text-text-main"
                }`}
              >
                Refinansowanie (Podgląd)
              </button>
            )}

            <button
              onClick={() => setActiveTab("terms")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "terms"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Warunki i parametry
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-fade-in">
                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Pozostały kapitał
                    </span>
                    <span className="text-lg sm:text-xl font-black text-text-main tabular-nums">
                      {formatMoney(debt.balance, currency)}
                    </span>
                    {debt.originalAmount && (
                      <span className="text-[10px] text-text-muted block mt-0.5">
                        z {formatMoney(debt.originalAmount, currency)}
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Bieżąca rata
                    </span>
                    <span className="text-lg sm:text-xl font-black text-text-main tabular-nums">
                      {formatMoney(debt.monthlyPayment, currency)}
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">miesięcznie</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Oprocentowanie / APR
                    </span>
                    <span className="text-lg sm:text-xl font-black text-brand tabular-nums">
                      {debt.interestRate.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      {debt.rateType === "fixed" ? "Stała stopa" : "Stawka zmienna"}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Wskaźnik LTV
                    </span>
                    <span className="text-lg sm:text-xl font-black text-text-main tabular-nums">
                      {ltv !== null ? `${ltv}%` : "—"}
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      {debt.propertyValue ? `Wartość: ${formatMoney(debt.propertyValue, currency)}` : "Brak wyceny"}
                    </span>
                  </div>
                </div>

                {/* Capital vs Interest breakdown */}
                {debt.monthlyPayment > 0 && debt.interestRate > 0 && (
                  <div className="p-5 bg-surface border border-border rounded-2xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-3">
                      Struktura najbliższej raty: Kapitał vs Odsetki
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-text-muted">Część odsetkowa ({interestPct}%)</span>
                          <span className="text-danger">{formatMoney(currentInterestPortion, currency)}</span>
                        </div>
                        <div className="w-full h-3 bg-surface-offset rounded-full overflow-hidden">
                          <div
                            className="h-full bg-danger/80 rounded-full transition-all"
                            style={{ width: `${interestPct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-text-muted">Część kapitałowa ({principalPct}%)</span>
                          <span className="text-brand">{formatMoney(currentPrincipalPortion, currency)}</span>
                        </div>
                        <div className="w-full h-3 bg-surface-offset rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full transition-all"
                            style={{ width: `${principalPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes or Key Insights */}
                {debt.notes && (
                  <div className="p-4 bg-surface-2 border border-border rounded-2xl text-xs text-text-muted">
                    <span className="font-bold text-text-main block mb-1">Notatki do umowy:</span>
                    <p>{debt.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SCHEDULE */}
            {activeTab === "schedule" && (
              <div className="space-y-4 animate-fade-in">
                {!amortization.isEligible ? (
                  <div className="p-6 bg-surface-2/60 border border-border rounded-2xl text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center border border-border text-text-muted">
                      <Info className="w-6 h-6" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h4 className="text-sm font-bold text-text-main">
                        Harmonogram niedostępny
                      </h4>
                      <p className="text-xs text-text-muted leading-relaxed">
                        {amortization.errorMessage || "Brak wystarczających parametrów do wygenerowania harmonogramu spłat."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Header & Mode info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                      <div>
                        <h3 className="text-sm font-bold text-text-main">Harmonogram spłat i analiza kosztu</h3>
                        <p className="text-xs text-text-muted">Szacunek na podstawie podanych danych — orientacyjny plan amortyzacji</p>
                      </div>

                      {amortization.rows.length > 24 && (
                        <button
                          type="button"
                          onClick={() => setShowFullSchedule(!showFullSchedule)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer bg-surface-2 hover:bg-surface-hover text-text-main border border-border shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          {showFullSchedule
                            ? "Pokaż 24 miesiące"
                            : `Pokaż pełny harmonogram (${amortization.rows.length} rat)`}
                        </button>
                      )}
                    </div>

                    {/* Summary KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Szacowana rata
                        </span>
                        <span className="text-sm font-black text-text-main tabular-nums">
                          {formatMoney(amortization.estimatedMonthlyPayment, currency)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Kapitał (1. rata)
                        </span>
                        <span className="text-sm font-black text-brand tabular-nums">
                          {formatMoney(amortization.firstMonthPrincipal, currency)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Odsetki (1. rata)
                        </span>
                        <span className="text-sm font-black text-danger tabular-nums">
                          {formatMoney(amortization.firstMonthInterest, currency)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Odsetki łącznie
                        </span>
                        <span className="text-sm font-black text-text-main tabular-nums">
                          {formatMoney(amortization.estimatedTotalInterest, currency)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Spłata końcowa
                        </span>
                        <span className="text-sm font-black text-text-main tabular-nums">
                          {formatMoney(amortization.estimatedTotalRepayment, currency)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Pozostały okres
                        </span>
                        <span className="text-sm font-black text-text-main tabular-nums">
                          {amortization.estimatedMonths} mc.
                        </span>
                      </div>
                    </div>

                    {/* Schedule Table */}
                    <div className="overflow-x-auto border border-border rounded-xl">
                      <table className="w-full text-left text-xs" aria-label="Tabela harmonogramu spłat">
                        <thead className="bg-surface-2 text-text-faint font-bold border-b border-border uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Miesiąc</th>
                            <th className="py-2.5 px-3 text-right">Rata</th>
                            <th className="py-2.5 px-3 text-right">Kapitał</th>
                            <th className="py-2.5 px-3 text-right">Odsetki</th>
                            <th className="py-2.5 px-3 text-right">Pozostałe saldo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-medium">
                          {(showFullSchedule ? amortization.rows : amortization.rows.slice(0, 24)).map((row) => (
                            <tr key={row.monthIndex} className="hover:bg-surface-hover transition-colors">
                              <td className="py-2.5 px-3 font-bold text-text-main">Miesiąc {row.monthIndex}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-text-main tabular-nums">
                                {formatMoney(row.installment, currency)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-brand font-bold tabular-nums">
                                {formatMoney(row.principal, currency)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-text-muted tabular-nums">
                                {formatMoney(row.interest, currency)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-text-main tabular-nums">
                                {formatMoney(row.balance, currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[11px] text-text-faint text-center leading-relaxed">
                      {showFullSchedule
                        ? `Wyświetlono pełny harmonogram (${amortization.rows.length} rat).`
                        : `Wyświetlono pierwsze ${Math.min(24, amortization.rows.length)} z ${amortization.rows.length} rat.`}{" "}
                      Szacunek na podstawie podanych danych — rzeczywiste wartości mogą różnić się od symulacji.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: OVERPAYMENT */}
            {activeTab === "overpayment" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-surface-2/60 border border-border p-5 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold text-text-main">Kalkulator nadpłat dla tego długu</h3>
                    <p className="text-xs text-text-muted">
                      Sprawdź ile zyskasz skracając czas spłaty lub obniżając miesięczną ratę.
                    </p>
                  </div>
                  {onOpenOverpaymentModal && (
                    <button
                      onClick={() => onOpenOverpaymentModal(debt)}
                      className="px-4 py-2 bg-brand text-text-inverse text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-[0.98] transition cursor-pointer"
                    >
                      Otwórz pełny symulator
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {overpaymentQuickA && (
                    <div className="p-4 bg-surface border border-border rounded-xl">
                      <span className="text-xs font-bold text-text-faint uppercase block mb-1">
                        Scenariusz A: Nadpłata 500 zł / mc
                      </span>
                      <span className="text-xl font-black text-brand block mb-1">
                        -{overpaymentQuickA.savings.monthsSaved} mies. ({overpaymentQuickA.savings.yearsSaved} lat)
                      </span>
                      <p className="text-xs text-text-muted">
                        Oszczędność odsetek: {formatMoney(overpaymentQuickA.savings.interestSaved, currency)}
                      </p>
                    </div>
                  )}

                  {overpaymentQuickB && (
                    <div className="p-4 bg-surface border border-brand/30 rounded-xl">
                      <span className="text-xs font-bold text-brand uppercase block mb-1">
                        Scenariusz B: Nadpłata 1 000 zł / mc
                      </span>
                      <span className="text-xl font-black text-brand block mb-1">
                        -{overpaymentQuickB.savings.monthsSaved} mies. ({overpaymentQuickB.savings.yearsSaved} lat)
                      </span>
                      <p className="text-xs text-text-muted">
                        Oszczędność odsetek: {formatMoney(overpaymentQuickB.savings.interestSaved, currency)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: REFINANCE */}
            {activeTab === "refinance" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-surface-2/60 border border-border p-5 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold text-text-main">Analiza opłacalności refinansowania</h3>
                    <p className="text-xs text-text-muted">
                      Obecna stawka: {debt.interestRate.toFixed(2)}% • Symulacja przy obniżeniu o 1.0 p.p.
                    </p>
                  </div>
                  {onOpenRefinanceModal && (
                    <button
                      onClick={() => onOpenRefinanceModal(debt)}
                      className="px-4 py-2 bg-brand text-text-inverse text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-[0.98] transition cursor-pointer"
                    >
                      Otwórz kalkulator refinansowania
                    </button>
                  )}
                </div>

                {refinancePreview && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-surface border border-border rounded-xl">
                      <span className="text-xs font-bold text-text-faint uppercase block mb-1">
                        Szacowany czas zwrotu
                      </span>
                      <span className="text-xl font-black text-text-main block mb-1">
                        {refinancePreview.comparison.breakEvenMonths !== null
                          ? `${refinancePreview.comparison.breakEvenMonths} mies.`
                          : "Brak zwrotu"}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        przy kosztach wejścia {formatMoney(4500, currency)}
                      </span>
                    </div>

                    <div className="p-4 bg-surface border border-border rounded-xl">
                      <span className="text-xs font-bold text-text-faint uppercase block mb-1">
                        Miesięczna ulga w racie
                      </span>
                      <span className="text-xl font-black text-success block mb-1">
                        -{formatMoney(refinancePreview.comparison.monthlyDifference, currency)}
                      </span>
                      <span className="text-[11px] text-text-muted">co miesiąc w budżecie</span>
                    </div>

                    <div className="p-4 bg-surface border border-brand/30 rounded-xl">
                      <span className="text-xs font-bold text-brand uppercase block mb-1">
                        Oszczędność netto
                      </span>
                      <span className="text-xl font-black text-brand block mb-1">
                        +{formatMoney(refinancePreview.comparison.netLifetimeSavings, currency)}
                      </span>
                      <span className="text-[11px] text-text-muted">w całym okresie po kosztach</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: TERMS */}
            {activeTab === "terms" && (
              <div className="space-y-4 animate-fade-in text-xs">
                <h3 className="text-sm font-bold text-text-main">Parametry i warunki umowy kredytowej</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">
                      Rodzaj oprocentowania
                    </span>
                    <span className="font-bold text-text-main">
                      {debt.rateType === "fixed"
                        ? `Stałe ${debt.interestRate}% ${debt.fixedRateEndDate ? `(do ${debt.fixedRateEndDate})` : ""}`
                        : `Zmienne ${debt.interestRate}%`}
                    </span>
                  </div>

                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">
                      Horyzont spłaty
                    </span>
                    <span className="font-bold text-text-main">{debt.endDate || "Nie określono"}</span>
                  </div>

                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">
                      Najbliższa płatność
                    </span>
                    <span className="font-bold text-text-main">{debt.nextPaymentDate || "Bieżący miesiąc"}</span>
                  </div>

                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">
                      Instytucja finansowa
                    </span>
                    <span className="font-bold text-text-main">{debt.institution}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border flex items-center justify-between gap-3 bg-surface-2/20 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main rounded-xl hover:bg-surface-2 transition cursor-pointer"
            >
              Zamknij
            </button>

            {(debt.type === "mortgage" || debt.type === "cash_loan") && (
              <button
                onClick={() => onOpenOverpaymentModal?.(debt)}
                className="px-4 py-2 bg-brand-subtle text-brand hover:bg-brand-subtle/80 text-xs font-bold rounded-xl border border-brand/20 transition cursor-pointer"
              >
                Przelicz nadpłatę
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
