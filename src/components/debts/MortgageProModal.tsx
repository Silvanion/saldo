import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Landmark,
  ShieldAlert,
  Percent,
  TrendingDown,
  TrendingUp,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ArrowRight,
  Info,
  ChevronDown,
  Download
} from "lucide-react";
import { DebtItem } from "../../types";
import { formatMoney, parseAmountInput } from "../../utils/format";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { generateMortgageReportPdf } from "../../services/pdfGenerator";
import {
  calculateLtvMetrics,
  calculateInterestRateStressTest,
  calculateCreditVacationImpact,
  compareAnnuityVsDecreasing
} from "../../services/mortgageCalculations";

export type MortgageProTab = "stress_test" | "vacation" | "annuity_vs_decreasing" | "ltv";

export interface MortgageProModalProps {
  isOpen: boolean;
  onClose: () => void;
  debts: DebtItem[];
  initialDebtId?: string;
  initialTab?: MortgageProTab;
  onUpdateDebt?: (debtId: string, updates: Partial<DebtItem>) => void;
}

export function MortgageProModal({
  isOpen,
  onClose,
  debts,
  initialDebtId,
  initialTab = "stress_test",
  onUpdateDebt
}: MortgageProModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const mortgageDebts = useMemo(() => {
    return debts.filter((d) => d.type === "mortgage" && d.status !== "closed");
  }, [debts]);

  const [selectedDebtId, setSelectedDebtId] = useState<string>(() => {
    if (initialDebtId && mortgageDebts.some((d) => d.id === initialDebtId)) {
      return initialDebtId;
    }
    return mortgageDebts[0]?.id || "";
  });

  const [activeTab, setActiveTab] = useState<MortgageProTab>(initialTab);

  // Tab 1: Stress Test State
  const [selectedDelta, setSelectedDelta] = useState<number>(3.0); // Domyślnie test KNF +300 pb

  // Tab 2: Credit Vacation State
  const [vacationMonths, setVacationMonths] = useState<number>(4);
  const [reinvestInOverpayment, setReinvestInOverpayment] = useState<boolean>(true);

  // Tab 4: LTV editable property value
  const [editingPropertyValue, setEditingPropertyValue] = useState<string>("");
  const [isEditingPropertyValue, setIsEditingPropertyValue] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (initialDebtId && mortgageDebts.some((d) => d.id === initialDebtId)) {
        setSelectedDebtId(initialDebtId);
      } else if (!selectedDebtId && mortgageDebts.length > 0) {
        setSelectedDebtId(mortgageDebts[0].id);
      }
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialDebtId, initialTab, mortgageDebts]);

  const currentDebt = useMemo(() => {
    return mortgageDebts.find((d) => d.id === selectedDebtId) || mortgageDebts[0] || null;
  }, [mortgageDebts, selectedDebtId]);

  useEffect(() => {
    if (currentDebt) {
      setEditingPropertyValue(String(currentDebt.propertyValue || ""));
      setIsEditingPropertyValue(false);
    }
  }, [currentDebt?.id]);

  // Tab 1: Stress test calculation
  const stressTest = useMemo(() => {
    if (!currentDebt) return null;
    return calculateInterestRateStressTest(
      currentDebt.balance,
      currentDebt.interestRate,
      currentDebt.remainingMonths || 240,
      currentDebt.monthlyPayment
    );
  }, [currentDebt]);

  const activeScenario = useMemo(() => {
    if (!stressTest) return null;
    return (
      stressTest.scenarios.find((s) => s.rateDelta === selectedDelta) ||
      stressTest.scenarios.find((s) => s.rateDelta === 0) ||
      stressTest.scenarios[0]
    );
  }, [stressTest, selectedDelta]);

  // Tab 2: Credit Vacation calculation
  const vacationImpact = useMemo(() => {
    if (!currentDebt) return null;
    return calculateCreditVacationImpact(currentDebt, vacationMonths, reinvestInOverpayment);
  }, [currentDebt, vacationMonths, reinvestInOverpayment]);

  // Tab 3: Annuity vs Decreasing calculation
  const comparison = useMemo(() => {
    if (!currentDebt) return null;
    return compareAnnuityVsDecreasing(
      currentDebt.balance,
      currentDebt.interestRate,
      currentDebt.remainingMonths || 240
    );
  }, [currentDebt]);

  // Tab 4: LTV calculation
  const ltvMetrics = useMemo(() => {
    if (!currentDebt) return null;
    return calculateLtvMetrics(currentDebt.balance, currentDebt.propertyValue);
  }, [currentDebt]);

  if (!isOpen || typeof document === "undefined") return null;

  const currency = currentDebt?.currency || "PLN";

  const handleSavePropertyValue = () => {
    if (!currentDebt || !onUpdateDebt) return;
    const parsedVal = parseAmountInput(editingPropertyValue) ?? 0;
    if (parsedVal > 0) {
      onUpdateDebt(currentDebt.id, { propertyValue: parsedVal });
      setIsEditingPropertyValue(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="bg-surface border border-border/70 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mortgage-pro-modal-title"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between shrink-0 bg-surface-2/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
                <Landmark className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="mortgage-pro-modal-title" className="text-base sm:text-lg font-black text-text-main tracking-tight truncate">
                    Centrum Hipoteczne Mortgage Pro
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-brand-subtle text-brand text-[10px] font-bold border border-brand/20 uppercase tracking-wider">
                    PRO
                  </span>
                </div>
                <p className="text-xs text-text-muted truncate">
                  Zaawansowana analityka stóp procentowych, wakacji kredytowych, rat malejących i LTV
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentDebt && (
                <button
                  onClick={() => generateMortgageReportPdf(currentDebt, currency)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-2 border border-border/80 text-text-main text-xs font-bold active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
                  id="btn-export-mortgage-pdf"
                  title="Pobierz pełny raport PDF dla doradcy lub banku"
                >
                  <Download className="w-3.5 h-3.5 text-brand" />
                  <span className="hidden sm:inline">Pobierz raport PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0"
                aria-label="Zamknij"
                id="btn-close-mortgage-pro"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Debt Selector Bar (if mortgages exist) */}
          {mortgageDebts.length > 0 && (
            <div className="px-4 sm:px-6 py-2.5 bg-surface-2/60 border-b border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-text-muted font-medium">Analizowany kredyt:</span>
                {mortgageDebts.length > 1 ? (
                  <select
                    value={selectedDebtId}
                    onChange={(e) => setSelectedDebtId(e.target.value)}
                    className="bg-surface text-text-main font-bold px-3 py-1 rounded-lg border border-border/80 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                    id="select-mortgage-pro-debt"
                  >
                    {mortgageDebts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.institution}) – Saldo: {formatMoney(d.balance, d.currency || "PLN")}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold text-text-main">
                    {currentDebt?.name} ({currentDebt?.institution})
                  </span>
                )}
              </div>

              {currentDebt && (
                <div className="flex items-center gap-3 text-text-muted tabular-nums">
                  <span>Saldo: <strong className="text-text-main font-semibold">{formatMoney(currentDebt.balance, currency)}</strong></span>
                  <span>Oprocentowanie: <strong className="text-text-main font-semibold">{currentDebt.interestRate}%</strong></span>
                  <span>Rata: <strong className="text-brand font-semibold">{formatMoney(currentDebt.monthlyPayment, currency)}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center border-b border-border/60 bg-surface px-4 sm:px-6 overflow-x-auto shrink-0 gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("stress_test")}
              className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring flex items-center gap-2 ${
                activeTab === "stress_test"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
              id="tab-mortgage-stress-test"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Stress-Test Stóp (KNF)</span>
            </button>

            <button
              onClick={() => setActiveTab("vacation")}
              className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring flex items-center gap-2 ${
                activeTab === "vacation"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
              id="tab-mortgage-vacation"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Wakacje Kredytowe</span>
            </button>

            <button
              onClick={() => setActiveTab("annuity_vs_decreasing")}
              className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring flex items-center gap-2 ${
                activeTab === "annuity_vs_decreasing"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
              id="tab-mortgage-annuity-vs-decreasing"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Raty Równe vs Malejące</span>
            </button>

            <button
              onClick={() => setActiveTab("ltv")}
              className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring flex items-center gap-2 ${
                activeTab === "ltv"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
              id="tab-mortgage-ltv"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Monitor LTV i Marży</span>
            </button>
          </div>

          {/* Modal Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {!currentDebt ? (
              <div className="text-center py-12 text-text-muted">
                <Landmark className="w-12 h-12 mx-auto mb-3 opacity-40 text-brand" />
                <p className="text-sm font-semibold text-text-main mb-1">Brak aktywnego kredytu hipotecznego</p>
                <p className="text-xs">Dodaj kredyt hipoteczny w sekcji Kredyty, aby skorzystać z zaawansowanych symulacji Mortgage Pro.</p>
              </div>
            ) : (
              <>
                {/* TAB 1: STRESS TEST */}
                {activeTab === "stress_test" && stressTest && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* KNF Recommendation 300 pb Card */}
                    <div className="bg-brand-subtle/40 border border-brand/20 rounded-xl p-4 flex items-start gap-3.5 shadow-xs">
                      <Sparkles className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <strong className="font-bold text-text-main block">
                          Bufor ostrożnościowy KNF (+3.00 p.p. / +300 pb)
                        </strong>
                        <p className="text-text-muted leading-relaxed">
                          Komisja Nadzoru Finansowego nakazuje bankom testować odporność kredytobiorców na skok stóp o 300 pb.
                          Przy stopie <strong className="text-text-main font-semibold tabular-nums">{stressTest.baseRate + 3.0}%</strong> Twoja rata wzrośnie z{" "}
                          <strong className="text-text-main font-semibold tabular-nums">{formatMoney(stressTest.currentPayment, currency)}</strong> do{" "}
                          <strong className="text-brand font-bold tabular-nums">{formatMoney(stressTest.knfPlus300PbPayment, currency)}</strong>{" "}
                          (wzrost o <strong className="text-brand font-bold tabular-nums">{formatMoney(stressTest.knfPlus300PbDiff, currency)}/mc</strong>, czyli{" "}
                          <strong className="text-brand font-bold tabular-nums">{formatMoney(stressTest.knfPlus300PbDiff * 12, currency)}/rok</strong>).
                        </p>
                      </div>
                    </div>

                    {/* Interactive Scenario Buttons */}
                    <div>
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
                        Wybierz symulowaną zmianę stóp procentowych:
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
                        {stressTest.scenarios.map((sc) => (
                          <button
                            key={sc.rateDelta}
                            onClick={() => setSelectedDelta(sc.rateDelta)}
                            className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${
                              selectedDelta === sc.rateDelta
                                ? "bg-brand text-text-inverse border-brand shadow-xs"
                                : "bg-surface-2/70 text-text-muted hover:text-text-main hover:bg-surface-2 border-border/60"
                            }`}
                          >
                            <span className="block truncate">
                              {sc.rateDelta > 0 ? `+${sc.rateDelta}%` : sc.rateDelta === 0 ? "0%" : `${sc.rateDelta}%`}
                            </span>
                            <span className="text-[10px] opacity-75 block mt-0.5 tabular-nums">
                              {sc.simulatedRate}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Scenario Result Cards */}
                    {activeScenario && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-surface border border-border/70 rounded-xl p-4 shadow-xs">
                          <span className="text-[11px] font-semibold text-text-muted block mb-1">
                            Symulowana rata miesięczna
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-text-main tabular-nums block">
                            {formatMoney(activeScenario.simulatedMonthlyPayment, currency)}
                          </span>
                          <span className="text-xs text-text-faint mt-1 block">
                            Stopa: {activeScenario.simulatedRate}%
                          </span>
                        </div>

                        <div className="bg-surface border border-border/70 rounded-xl p-4 shadow-xs">
                          <span className="text-[11px] font-semibold text-text-muted block mb-1">
                            Różnica względem obecnej raty
                          </span>
                          <div className="flex items-center gap-1.5">
                            {activeScenario.paymentDiff > 0 ? (
                              <TrendingUp className="w-5 h-5 text-danger" />
                            ) : activeScenario.paymentDiff < 0 ? (
                              <TrendingDown className="w-5 h-5 text-emerald-500" />
                            ) : null}
                            <span
                              className={`text-xl sm:text-2xl font-black tabular-nums ${
                                activeScenario.paymentDiff > 0
                                  ? "text-danger"
                                  : activeScenario.paymentDiff < 0
                                  ? "text-emerald-500"
                                  : "text-text-main"
                              }`}
                            >
                              {activeScenario.paymentDiff > 0 ? `+${formatMoney(activeScenario.paymentDiff, currency)}` : formatMoney(activeScenario.paymentDiff, currency)}
                            </span>
                          </div>
                          <span className="text-xs text-text-faint mt-1 block tabular-nums">
                            {activeScenario.percentageChange > 0 ? `+${activeScenario.percentageChange}%` : `${activeScenario.percentageChange}%`} raty
                          </span>
                        </div>

                        <div className="bg-surface border border-border/70 rounded-xl p-4 shadow-xs">
                          <span className="text-[11px] font-semibold text-text-muted block mb-1">
                            Wpływ na budżet domowy (rok)
                          </span>
                          <span
                            className={`text-xl sm:text-2xl font-black tabular-nums block ${
                              activeScenario.annualBudgetImpact > 0
                                ? "text-danger"
                                : activeScenario.annualBudgetImpact < 0
                                ? "text-emerald-500"
                                : "text-text-main"
                            }`}
                          >
                            {activeScenario.annualBudgetImpact > 0 ? `+${formatMoney(activeScenario.annualBudgetImpact, currency)}` : formatMoney(activeScenario.annualBudgetImpact, currency)}
                          </span>
                          <span className="text-xs text-text-faint mt-1 block">
                            rocznie z domowego portfela
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Scenarios Table */}
                    <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs">
                      <div className="px-4 py-3 bg-surface-2/60 border-b border-border/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-text-main uppercase tracking-wider">
                          Pełna macierz wrażliwości stóp procentowych
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-surface-2/30 text-text-muted uppercase text-[10px] font-bold border-b border-border/50">
                            <tr>
                              <th className="px-4 py-2.5">Zmiana stopy</th>
                              <th className="px-4 py-2.5">Stopa symulowana</th>
                              <th className="px-4 py-2.5">Nowa rata</th>
                              <th className="px-4 py-2.5">Różnica / mc</th>
                              <th className="px-4 py-2.5">Roczny koszt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 font-medium tabular-nums">
                            {stressTest.scenarios.map((sc) => (
                              <tr
                                key={sc.rateDelta}
                                className={`hover:bg-surface-2/50 transition-colors ${
                                  sc.rateDelta === selectedDelta ? "bg-brand-subtle/30 font-bold" : ""
                                }`}
                              >
                                <td className="px-4 py-2.5 font-bold">
                                  {sc.rateDelta > 0 ? `+${sc.rateDelta}%` : sc.rateDelta === 0 ? "Obecna stopa" : `${sc.rateDelta}%`}
                                </td>
                                <td className="px-4 py-2.5">{sc.simulatedRate}%</td>
                                <td className="px-4 py-2.5">{formatMoney(sc.simulatedMonthlyPayment, currency)}</td>
                                <td
                                  className={`px-4 py-2.5 ${
                                    sc.paymentDiff > 0 ? "text-danger" : sc.paymentDiff < 0 ? "text-emerald-500" : "text-text-muted"
                                  }`}
                                >
                                  {sc.paymentDiff > 0 ? `+${formatMoney(sc.paymentDiff, currency)}` : formatMoney(sc.paymentDiff, currency)}
                                </td>
                                <td
                                  className={`px-4 py-2.5 ${
                                    sc.annualBudgetImpact > 0 ? "text-danger" : sc.annualBudgetImpact < 0 ? "text-emerald-500" : "text-text-muted"
                                  }`}
                                >
                                  {sc.annualBudgetImpact > 0 ? `+${formatMoney(sc.annualBudgetImpact, currency)}` : formatMoney(sc.annualBudgetImpact, currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: WAKACJE KREDYTOWE */}
                {activeTab === "vacation" && vacationImpact && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div className="bg-surface border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-text-main">
                            Konfiguracja zawieszenia rat
                          </h3>
                          <p className="text-xs text-text-muted">
                            Wybierz liczbę zawieszonych rat w bieżącym roku rozliczeniowym
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {[1, 2, 4].map((m) => (
                            <button
                              key={m}
                              onClick={() => setVacationMonths(m)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                vacationMonths === m
                                  ? "bg-brand text-text-inverse border-brand shadow-2xs"
                                  : "bg-surface-2 text-text-muted hover:text-text-main border-border/70"
                              }`}
                            >
                              {m} {m === 1 ? "miesiąc" : "miesiące"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reinvest Toggle */}
                      <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-bold text-text-main block">
                            Dźwignia Finansowa: Wpłać zawieszone raty jako natychmiastową nadpłatę kapitału
                          </span>
                          <span className="text-xs text-text-muted block mt-0.5">
                            Zamiast „przejadać” zawieszone raty, przeznaczasz je w 100% na spłatę kapitału, radykalnie tnąc przyszłe odsetki.
                          </span>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={reinvestInOverpayment}
                            onChange={(e) => setReinvestInOverpayment(e.target.checked)}
                            className="sr-only peer"
                            id="toggle-reinvest-vacation"
                          />
                          <div className="w-11 h-6 bg-surface-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                        </label>
                      </div>
                    </div>

                    {/* Results Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-surface border border-border/70 rounded-xl p-4 shadow-xs">
                        <span className="text-[11px] font-semibold text-text-muted block mb-1">
                          Uwolniona gotówka z rat
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-text-main tabular-nums block">
                          {formatMoney(vacationImpact.totalSuspendedAmount, currency)}
                        </span>
                        <span className="text-xs text-text-faint mt-1 block">
                          za {vacationImpact.vacationMonthsCount} {vacationImpact.vacationMonthsCount === 1 ? "miesiąc" : "miesiące"}
                        </span>
                      </div>

                      <div className="bg-surface border border-border/70 rounded-xl p-4 shadow-xs">
                        <span className="text-[11px] font-semibold text-text-muted block mb-1">
                          Zaoszczędzone odsetki
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-500 tabular-nums block">
                          {reinvestInOverpayment ? formatMoney(vacationImpact.interestSaved, currency) : "0 PLN"}
                        </span>
                        <span className="text-xs text-text-faint mt-1 block">
                          {reinvestInOverpayment ? "czysta oszczędność na kapitale" : "brak nadpłaty"}
                        </span>
                      </div>

                      <div className="bg-surface border border-border/70 rounded-xl p-4 shadow-xs">
                        <span className="text-[11px] font-semibold text-text-muted block mb-1">
                          Skrócenie okresu kredytu
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-brand tabular-nums block">
                          {reinvestInOverpayment ? `${vacationImpact.monthsShortened} mies.` : "Wydłużenie"}
                        </span>
                        <span className="text-xs text-text-faint mt-1 block">
                          {reinvestInOverpayment
                            ? `(ok. ${(vacationImpact.monthsShortened / 12).toFixed(1)} roku wcześniej)`
                            : `spłata wydłuży się o ${vacationImpact.vacationMonthsCount} mies.`}
                        </span>
                      </div>
                    </div>

                    {/* Strategy Advice Banner */}
                    <div className="bg-surface border border-border/70 rounded-xl p-4 flex items-start gap-3 shadow-xs">
                      <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                      <div className="text-xs text-text-muted space-y-1">
                        <strong className="text-text-main font-semibold block">Wskazówka eksperta Saldo:</strong>
                        <p>
                          {reinvestInOverpayment ? (
                            <>
                              Przeznaczając <strong className="text-text-main font-semibold tabular-nums">{formatMoney(vacationImpact.totalSuspendedAmount, currency)}</strong> na jednorazową nadpłatę,
                              Twoje nowe saldo wyniesie <strong className="text-text-main font-semibold tabular-nums">{formatMoney(vacationImpact.newBalanceAfterOverpayment, currency)}</strong>.
                              Dzięki temu bank przestanie naliczać odsetki od tej kwoty, co przyniesie Ci aż <strong className="text-emerald-500 font-bold tabular-nums">{formatMoney(vacationImpact.interestSaved, currency)}</strong> czystego zysku!
                            </>
                          ) : (
                            <>
                              Zawieszenie rat bez nadpłaty pozwala zachować <strong className="text-text-main font-semibold tabular-nums">{formatMoney(vacationImpact.totalSuspendedAmount, currency)}</strong> w kieszeni na bieżące wydatki lub poduszkę finansową, jednak harmonogram spłaty kredytu ulega wydłużeniu o {vacationImpact.vacationMonthsCount} miesięcy.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ANNUITY VS DECREASING */}
                {activeTab === "annuity_vs_decreasing" && comparison && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Summary Highlight */}
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 shadow-xs flex items-start gap-3.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <strong className="text-sm font-bold text-text-main block">
                          Zysk z rat malejących: {formatMoney(comparison.interestDifference, currency)} ({comparison.savingsPercent}% mniej odsetek)
                        </strong>
                        <p className="text-text-muted leading-relaxed">
                          W ratach malejących od pierwszego miesiąca spłacasz równą część kapitału, dzięki czemu dług topnieje znacznie szybciej niż przy ratach równych (annuitetowych).
                          Pierwsza rata jest wyższa o <strong className="text-text-main font-semibold tabular-nums">{formatMoney(comparison.firstInstallmentPremium, currency)}</strong>, ale każda kolejna systematycznie spada aż do <strong className="text-emerald-500 font-bold tabular-nums">{formatMoney(comparison.decreasing.lastInstallment, currency)}</strong>!
                        </p>
                      </div>
                    </div>

                    {/* Comparison Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Annuity Card */}
                      <div className="bg-surface border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-text-main">Raty Równe (Annuitetowe)</h4>
                          <span className="px-2 py-0.5 rounded-full bg-surface-2 text-text-muted text-[10px] font-bold">Standard</span>
                        </div>
                        <div className="space-y-2.5 text-xs pt-2 border-t border-border/50">
                          <div className="flex justify-between">
                            <span className="text-text-muted">Stała rata miesięczna:</span>
                            <strong className="font-bold text-text-main tabular-nums">{formatMoney(comparison.annuity.monthlyPayment, currency)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Suma odsetek dla banku:</span>
                            <strong className="font-bold text-danger tabular-nums">{formatMoney(comparison.annuity.totalInterest, currency)}</strong>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-border/40">
                            <span className="text-text-muted">Łączny koszt kredytu:</span>
                            <strong className="font-black text-text-main tabular-nums">{formatMoney(comparison.annuity.totalRepayment, currency)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Decreasing Card */}
                      <div className="bg-surface border border-brand/30 rounded-xl p-5 shadow-xs space-y-4 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-brand">Raty Malejące (Kapitałowe)</h4>
                          <span className="px-2 py-0.5 rounded-full bg-brand-subtle text-brand text-[10px] font-bold">Najtańsze</span>
                        </div>
                        <div className="space-y-2.5 text-xs pt-2 border-t border-border/50">
                          <div className="flex justify-between">
                            <span className="text-text-muted">Pierwsza rata (najwyższa):</span>
                            <strong className="font-bold text-text-main tabular-nums">{formatMoney(comparison.decreasing.firstInstallment, currency)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Ostatnia rata (najniższa):</span>
                            <strong className="font-bold text-emerald-500 tabular-nums">{formatMoney(comparison.decreasing.lastInstallment, currency)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Średnia rata:</span>
                            <strong className="font-bold text-text-main tabular-nums">{formatMoney(comparison.decreasing.averageInstallment, currency)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Suma odsetek dla banku:</span>
                            <strong className="font-bold text-emerald-500 tabular-nums">{formatMoney(comparison.decreasing.totalInterest, currency)}</strong>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-border/40">
                            <span className="text-text-muted">Łączny koszt kredytu:</span>
                            <strong className="font-black text-brand tabular-nums">{formatMoney(comparison.decreasing.totalRepayment, currency)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: LTV MONITOR */}
                {activeTab === "ltv" && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Property Value Settings Header */}
                    <div className="bg-surface border border-border/70 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs text-text-muted block">Wartość nieruchomości jako zabezpieczenia</span>
                        <div className="flex items-center gap-2 mt-1">
                          {isEditingPropertyValue ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingPropertyValue}
                                onChange={(e) => setEditingPropertyValue(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring w-40"
                                placeholder="Wartość w PLN"
                                id="input-mortgage-pro-property-val"
                              />
                              <button
                                onClick={handleSavePropertyValue}
                                className="px-3 py-1.5 rounded-lg bg-brand text-text-inverse text-xs font-bold hover:bg-brand/90 cursor-pointer"
                              >
                                Zapisz
                              </button>
                              <button
                                onClick={() => setIsEditingPropertyValue(false)}
                                className="px-2.5 py-1.5 rounded-lg bg-surface-2 text-text-muted text-xs hover:text-text-main cursor-pointer"
                              >
                                Anuluj
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xl sm:text-2xl font-black text-text-main tabular-nums">
                                {currentDebt.propertyValue && currentDebt.propertyValue > 0
                                  ? formatMoney(currentDebt.propertyValue, currency)
                                  : "Brak zdefiniowanej wartości"}
                              </span>
                              {onUpdateDebt && (
                                <button
                                  onClick={() => setIsEditingPropertyValue(true)}
                                  className="text-xs font-bold text-brand hover:underline cursor-pointer"
                                  id="btn-edit-property-val"
                                >
                                  Zmień
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-text-muted text-right">
                        <span>Aktualne saldo zadłużenia:</span>
                        <strong className="block text-sm font-bold text-text-main tabular-nums">
                          {formatMoney(currentDebt.balance, currency)}
                        </strong>
                      </div>
                    </div>

                    {/* LTV Meter Card */}
                    {ltvMetrics ? (
                      <div className="bg-surface border border-border/70 rounded-xl p-5 shadow-xs space-y-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-text-main">Wskaźnik LTV (Loan to Value)</h4>
                            <p className="text-xs text-text-muted">Stosunek kwoty kredytu do wartości nieruchomości</p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black tabular-nums border ${
                              ltvMetrics.status === "safe"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : ltvMetrics.status === "warning"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-danger-subtle text-danger border-danger/20"
                            }`}
                          >
                            LTV: {ltvMetrics.ltvPercent}%
                          </span>
                        </div>

                        {/* Progress Bar with 80% & 90% markers */}
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-full bg-surface-2 rounded-full overflow-hidden relative border border-border/60">
                            <div
                              className={`h-full transition-all duration-300 ${
                                ltvMetrics.status === "safe"
                                  ? "bg-emerald-500"
                                  : ltvMetrics.status === "warning"
                                  ? "bg-amber-500"
                                  : "bg-danger"
                              }`}
                              style={{ width: `${Math.min(100, ltvMetrics.ltvPercent)}%` }}
                            />
                            {/* 80% Marker */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-text-main/50 z-10"
                              style={{ left: "80%" }}
                              title="Próg 80% LTV"
                            />
                            {/* 90% Marker */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-text-main/50 z-10"
                              style={{ left: "90%" }}
                              title="Próg 90% LTV"
                            />
                          </div>

                          <div className="flex justify-between text-[10px] text-text-faint font-medium">
                            <span>0%</span>
                            <span className="font-bold text-emerald-600">80% (Bezpieczny próg banku)</span>
                            <span className="font-bold text-amber-600">90% (Maksymalny KNF)</span>
                            <span>100%</span>
                          </div>
                        </div>

                        {/* Recommendation Advice */}
                        <div className="p-4 rounded-xl border text-xs space-y-1.5 leading-relaxed bg-surface-2/40 border-border/50">
                          {ltvMetrics.status === "safe" ? (
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-text-main font-bold block">
                                  Bezpieczna strefa LTV (&le; 80%)
                                </strong>
                                <p className="text-text-muted">
                                  Twój kredyt znajduje się w bezpiecznej strefie. Nie ponosisz kosztów ubezpieczenia niskiego wkładu własnego ani podwyższonej marży pomostowej. Masz najwyższą siłę przetargową przy negocjowaniu marży lub refinansowaniu!
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-text-main font-bold block">
                                  Potencjał obniżenia marży banku (LTV &gt; 80%)
                                </strong>
                                <p className="text-text-muted">
                                  Aby zejść poniżej 80% LTV i zawnioskować o zniesienie podwyższonej marży/ubezpieczenia, wystarczy nadpłacić kapitał o kwotę{" "}
                                  <strong className="text-brand font-bold tabular-nums">
                                    {formatMoney(ltvMetrics.overpaymentTo80Ltv, currency)}
                                  </strong>.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-surface border border-border/70 rounded-xl p-5 text-xs text-text-muted space-y-2">
                        <ShieldAlert className="w-8 h-8 text-brand mx-auto opacity-50" />
                        <p className="font-semibold text-text-main">Wartość nieruchomości nie została podana</p>
                        <p>Kliknij przycisk „Zmień” powyżej, aby wprowadzić wartość nieruchomości i odblokować analizator LTV oraz marży.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border/60 bg-surface-2/30 flex items-center justify-between shrink-0 gap-3">
            <span className="text-xs text-text-faint truncate">
              Wszystkie obliczenia wykonywane są lokalnie na Twoim urządzeniu.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {currentDebt && (
                <button
                  onClick={() => generateMortgageReportPdf(currentDebt, currency)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-2 border border-border text-text-main rounded-xl text-xs font-bold active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                  id="btn-export-mortgage-pdf-footer"
                >
                  <Download className="w-3.5 h-3.5 text-brand" />
                  <span>Raport PDF</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-surface hover:bg-surface-2 border border-border text-text-main rounded-xl text-xs font-bold active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Zamknij
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
