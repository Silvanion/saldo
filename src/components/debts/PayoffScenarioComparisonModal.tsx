import React, { useMemo, useEffect } from "react";
import { DebtItem, DebtPayoffScenario, SupportedCurrency } from "../../types";
import { formatMoney } from "../../utils/format";
import {
  calculatePortfolioPayoffStrategies,
  buildValidatedCustomOrder
} from "../../services/debtCalculations";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import {
  X,
  GitCompare,
  ShieldCheck,
  Layers,
  Percent,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Info,
  Calendar,
  TrendingDown
} from "lucide-react";

export interface PayoffScenarioComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: DebtPayoffScenario[];
  activeDebts: DebtItem[];
  currency: SupportedCurrency;
  onLoadScenario?: (scenario: DebtPayoffScenario) => void;
}

export function PayoffScenarioComparisonModal({
  isOpen,
  onClose,
  scenarios,
  activeDebts,
  currency,
  onLoadScenario
}: PayoffScenarioComparisonModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen, onClose);

  const getStrategyBadge = (strategy: string) => {
    switch (strategy) {
      case "avalanche":
        return { label: "Metoda Lawiny", icon: Percent, badge: "Matematyczna" };
      case "snowball":
        return { label: "Metoda Kuli Śnieżnej", icon: Sparkles, badge: "Motywacyjna" };
      case "custom":
        return { label: "Własna kolejność", icon: Layers, badge: "Elastyczna" };
      default:
        return { label: "Status Quo", icon: RotateCcw, badge: "Bazowa" };
    }
  };

  const simulatedScenarios = useMemo(() => {
    return scenarios.map((sc) => {
      const validatedOrder =
        sc.strategy === "custom"
          ? buildValidatedCustomOrder(activeDebts, sc.customDebtOrder)
          : undefined;
      if (!isOpen) {
        return {
          scenario: sc,
          result: undefined
        };
      }
      const comparison = calculatePortfolioPayoffStrategies(
        activeDebts,
        sc.extraMonthlyPayment || 0,
        undefined,
        validatedOrder,
        sc.oneTimeOverpayments ?? []
      );
      const res =
        sc.strategy === "avalanche"
          ? comparison.avalanche
          : sc.strategy === "snowball"
          ? comparison.snowball
          : sc.strategy === "custom"
          ? comparison.custom
          : comparison.baseline;
      return {
        scenario: sc,
        result: res
      };
    });
  }, [scenarios, activeDebts]);

  const decisionSummary = useMemo(() => {
    if (simulatedScenarios.length !== 2) return null;
    const [s1, s2] = simulatedScenarios;
    if (!s1.result || !s2.result) return null;

    const diffMonths = s1.result.totalMonths - s2.result.totalMonths;
    const diffInterest = s1.result.totalInterestPaid - s2.result.totalInterestPaid;
    const diffPayment = s1.scenario.extraMonthlyPayment - s2.scenario.extraMonthlyPayment;

    let timeComparisonText = "Oba scenariusze osiągają spłatę w tym samym terminie";
    if (diffMonths < 0) {
      timeComparisonText = `Scenariusz „${s1.scenario.name}” prowadzi do spłaty orientacyjnie ${Math.abs(diffMonths)} mies. wcześniej niż „${s2.scenario.name}”`;
    } else if (diffMonths > 0) {
      timeComparisonText = `Scenariusz „${s2.scenario.name}” prowadzi do spłaty orientacyjnie ${diffMonths} mies. wcześniej niż „${s1.scenario.name}”`;
    }

    let interestComparisonText = "Oba scenariusze dają zbliżony szacowany koszt odsetek";
    if (diffInterest < -1) {
      interestComparisonText = `Scenariusz „${s1.scenario.name}” wiąże się z niższym szacowanym kosztem odsetek o około ${formatMoney(Math.abs(diffInterest), currency)}`;
    } else if (diffInterest > 1) {
      interestComparisonText = `Scenariusz „${s2.scenario.name}” wiąże się z niższym szacowanym kosztem odsetek o około ${formatMoney(diffInterest, currency)}`;
    }

    let paymentComparisonText = "Oba scenariusze zakładają identyczną miesięczną nadpłatę";
    if (diffPayment !== 0) {
      paymentComparisonText = `Różnica w miesięcznej nadpłacie wynosi ${formatMoney(Math.abs(diffPayment), currency)} / mc`;
    }

    return {
      timeComparisonText,
      interestComparisonText,
      paymentComparisonText
    };
  }, [simulatedScenarios, currency]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        ref={modalRef}
        className="bg-surface border border-border rounded-2xl p-5 sm:p-6 w-full max-w-3xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scenario-comparison-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0 border border-brand/20">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h3 id="scenario-comparison-modal-title" className="text-base font-bold text-text-main">
                Porównanie scenariuszy spłaty
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Zestawienie parametrów wybranych scenariuszy spłaty
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            aria-label="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Educational note */}
        <div className="text-[11px] text-text-muted flex items-start gap-2.5 bg-surface-2 p-3.5 rounded-xl border border-border">
          <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            To zestawienie pokazuje parametry zapisanych scenariuszy. Nie jest prognozą ani indywidualną rekomendacją finansową. Ostateczny wynik zależy od aktualnych danych i przyjętych założeń.
          </p>
        </div>

        {/* Feature E: Neutral Decision Summary Box */}
        {decisionSummary && (
          <div className="p-4 rounded-xl bg-brand-subtle/30 border border-brand/20 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-text-main">
              <Info className="w-4 h-4 text-brand" />
              <span>Podsumowanie różnic między scenariuszami</span>
            </div>
            <ul className="space-y-1.5 pl-6 list-disc text-text-muted text-[11px] leading-relaxed">
              <li>{decisionSummary.timeComparisonText}</li>
              <li>{decisionSummary.interestComparisonText}</li>
              <li>{decisionSummary.paymentComparisonText}</li>
            </ul>
          </div>
        )}

        {/* Comparison Columns (1 or 2 scenarios) */}
        {simulatedScenarios.length < 2 ? (
          <p className="text-xs text-text-muted text-center py-6">
            Aby porównać, wybierz dokładnie dwa scenariusze.
          </p>
        ) : (
          <div className={`grid grid-cols-1 ${simulatedScenarios.length > 1 ? "sm:grid-cols-2" : ""} gap-4`}>
            {simulatedScenarios.map(({ scenario: sc, result }, index) => {
              const strategyInfo = getStrategyBadge(sc.strategy);
              const StrategyIcon = strategyInfo.icon;

              return (
                <div
                  key={sc.id}
                  className="p-4 sm:p-5 rounded-2xl bg-surface-2/40 border border-border flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="border-b border-border/60 pb-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                        Scenariusz #{index + 1}
                      </span>
                      <h4 className="text-sm font-bold text-text-main break-words">
                        {sc.name}
                      </h4>
                      {sc.createdAt && (
                        <span className="text-[10px] text-text-faint block mt-0.5">
                          Utworzono: {new Date(sc.createdAt).toLocaleDateString("pl-PL")}
                        </span>
                      )}
                    </div>

                    {/* Strategy parameter */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-text-faint block">
                        Strategia spłaty:
                      </span>
                      <div className="flex items-center gap-2">
                        <StrategyIcon className="w-3.5 h-3.5 text-brand shrink-0" />
                        <span className="text-xs font-bold text-text-main">
                          {strategyInfo.label}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                          {strategyInfo.badge}
                        </span>
                      </div>
                    </div>

                    {/* Extra payment parameter */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-text-faint block">
                        Miesięczna nadpłata:
                      </span>
                      <span className="text-sm font-black text-brand tabular-nums block">
                        +{formatMoney(sc.extraMonthlyPayment || 0, currency)} / mc
                      </span>
                    </div>

                    {/* Estimated Payoff & Interest details */}
                    {result && (
                      <div className="p-3 bg-surface rounded-xl border border-border/80 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-text-faint flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Termin spłaty:</span>
                          </span>
                          <strong className="text-text-main font-bold">{result.debtFreeDate}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-faint flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5 text-brand" />
                            <span>Szacowane odsetki:</span>
                          </span>
                          <strong className="text-text-main font-bold tabular-nums">
                            {formatMoney(result.totalInterestPaid, currency)}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* Payoff queue order parameter */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-text-faint block">
                        Kolejność spłaty:
                      </span>
                      {sc.strategy === "custom" && sc.customDebtOrder && sc.customDebtOrder.length > 0 ? (
                        <ol className="space-y-1 text-xs bg-surface p-2.5 rounded-xl border border-border/80">
                          {sc.customDebtOrder.map((debtId, idx) => {
                            const debt = activeDebts.find((d) => d.id === debtId);
                            const debtName = debt ? debt.name : debtId;
                            return (
                              <li key={debtId} className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-brand-subtle text-brand text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-text-main truncate">
                                  {debtName}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      ) : (
                        <p className="text-xs text-text-muted bg-surface p-2.5 rounded-xl border border-border/80 leading-relaxed">
                          Kolejność ustalana automatycznie przez metodę
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Column Action: Load Scenario */}
                  {onLoadScenario && (
                    <button
                      type="button"
                      onClick={() => {
                        onLoadScenario(sc);
                        onClose();
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-border bg-surface hover:bg-brand hover:text-text-inverse hover:border-brand transition text-xs font-bold text-text-main flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring mt-2"
                    >
                      <span>Wczytaj ten scenariusz</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-2 text-text-main hover:bg-surface-hover transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
