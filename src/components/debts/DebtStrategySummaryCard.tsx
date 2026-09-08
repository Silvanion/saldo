import React from "react";
import {
  DebtPayoffStrategyType,
  DebtPayoffStrategyResult
} from "../../services/debtCalculations";
import { SupportedCurrency } from "../../types";
import { formatMoney } from "../../utils/format";

export interface DebtStrategySummaryCardProps {
  strategy: DebtPayoffStrategyType;
  result: DebtPayoffStrategyResult;
  isSelected: boolean;
  isRecommended?: boolean;
  currency: SupportedCurrency;
  onSelect: (strategy: DebtPayoffStrategyType) => void;
}

export function DebtStrategySummaryCard({
  strategy,
  result,
  isSelected,
  isRecommended,
  currency,
  onSelect
}: DebtStrategySummaryCardProps) {
  const isBaseline = strategy === "baseline";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(strategy)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(strategy);
        }
      }}
      className={`p-5 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.99] ${
        isSelected
          ? "bg-brand-subtle/50 border-brand shadow-md ring-2 ring-brand/20"
          : "bg-surface border-border hover:border-brand/40"
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-surface text-text-main border border-border">
            {result.strategyBadge}
          </span>
          {isRecommended && (
            <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-brand text-text-inverse">
              Rekomendacja
            </span>
          )}
        </div>

        <h4 className="text-sm font-bold text-text-main mt-2 mb-1">
          {result.strategyLabel}
        </h4>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          {strategy === "custom"
            ? "Elastyczna — samodzielnie ustalasz priorytety spłaty. Cała nadwyżka budżetowa trafia na cel nr 1, a po jego zamknięciu uwolniona rata zasila kolejne pozycje."
            : result.strategyDescription}
        </p>
      </div>

      <div className="space-y-2 pt-3 border-t border-border/50 text-xs">
        <div className="flex justify-between">
          <span className="text-text-faint">Wolność od długu:</span>
          <span className="font-bold text-text-main">{result.debtFreeDate}</span>
        </div>

        {isBaseline ? (
          <>
            <div className="flex justify-between">
              <span className="text-text-faint">Łączny koszt odsetek:</span>
              <span className="font-bold text-text-muted">
                {formatMoney(result.totalInterestPaid, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-faint">Oszczędność:</span>
              <span className="font-medium text-text-muted">Punkt odniesienia</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-text-faint" title="Porównanie względem scenariusza bazowego">Odsetki vs Status Quo:</span>
              <span className="font-bold text-brand">
                +{formatMoney(result.interestSavedVsBaseline, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-faint" title="Porównanie względem scenariusza bazowego">Czas vs Status Quo:</span>
              <span className="font-bold text-success">
                {result.monthsSavedVsBaseline > 0
                  ? `-${result.monthsSavedVsBaseline} mies.`
                  : "0 mies."}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
