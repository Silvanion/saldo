import React, { memo } from "react";
import {} from "../../utils";
import { BudgetWarning } from "../../services/budgetCalculations";
import { formatMoney } from "../../utils/format";

interface BudgetWarningsWidgetProps {
  currency: string;
  totalPlannedBudget: number;
  totalActualSpentInBudget: number;
  budgetWarnings: BudgetWarning[];
  onChangeView: (view: string) => void;
  onOpenBudgetModal: () => void;
}

export const BudgetWarningsWidget = memo(function BudgetWarningsWidget({
  currency,
  totalPlannedBudget,
  totalActualSpentInBudget,
  budgetWarnings,
  onChangeView,
  onOpenBudgetModal
}: BudgetWarningsWidgetProps) {
  const globalBudgetRatio = totalPlannedBudget > 0 ? (totalActualSpentInBudget / totalPlannedBudget) * 100 : 0;
  
  return (
    <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between h-full relative overflow-hidden" id="widget-content-budget-box">
      <div className="absolute inset-0  pointer-events-none" />
      <div className="flex items-center justify-between gap-4 mb-5 relative z-10 min-w-0">
        <div className="min-w-0">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5 truncate" title="Plan Budżetu">Plan Budżetu</p>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-bold text-text-main truncate" title="Użycie budżetów">Użycie budżetów</h3>
            <span className="text-xs uppercase tracking-wider bg-warning-subtle text-warning border border-warning/20 px-1.5 py-0.5 rounded-md font-black shrink-0">Ważne</span>
          </div>
        </div>
        <button
          onClick={() => onChangeView("budget")}
          className="text-xs font-bold text-warning bg-warning-subtle border border-warning/20 px-2.5 py-1.5 rounded-lg hover:bg-warning-subtle active:scale-[0.98] transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
        >
          Szczegóły
        </button>
      </div>

      <div className="mb-4 relative z-10 min-w-0">
        <div className="flex justify-between items-end gap-2 mb-1 min-w-0">
          <span className="text-xs font-bold text-text-muted truncate" title="Całkowity budżet">Całkowity budżet</span>
          <span className="text-xs font-bold text-text-main truncate shrink-0" title={`${formatMoney(totalActualSpentInBudget, currency)} / ${formatMoney(totalPlannedBudget, currency)}`}>{formatMoney(totalActualSpentInBudget, currency)} <span className="text-text-faint font-normal">/ {formatMoney(totalPlannedBudget, currency)}</span></span>
        </div>
        <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${globalBudgetRatio > 90 ? 'bg-danger ' : globalBudgetRatio > 75 ? 'bg-warning ' : 'bg-brand '}`}
            style={{ width: `${Math.min(globalBudgetRatio, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-start overflow-hidden relative z-10">
        {budgetWarnings.length === 0 ? (
          <div className="text-center py-6 bg-surface-2 rounded-xl border border-dashed border-border h-full flex flex-col justify-center">
            <span className="text-2xl mb-1 block opacity-50 ">💡</span>
            <p className="text-xs text-text-muted font-bold">Brak budżetów</p>
            <p className="text-xs text-text-faint">Skonfiguruj budżety dla kategorii.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar min-w-0">
            {budgetWarnings.map((w, i) => {
              const isCritical = w.status === 'exceeded';
              const isWarning = w.status === 'warning';
              
              const colorClass = isCritical ? 'text-danger drop-' : isWarning ? 'text-warning drop-' : 'text-brand drop-';
              const bgClass = isCritical ? 'bg-danger ' : isWarning ? 'bg-warning ' : 'bg-brand ';
              const badgeClass = isCritical ? 'bg-danger-subtle text-danger border border-danger/20' : isWarning ? 'bg-warning-subtle text-warning border border-warning/20' : 'bg-brand-subtle text-brand border border-brand/20';
              const statusLabel = isCritical ? 'Critical' : isWarning ? 'Warning' : 'Safe';

              return (
                <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-surface hover:bg-surface-offset transition-colors shadow-inner group min-w-0">
                  <div className="flex justify-between items-center text-xs gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${badgeClass}`}>
                        {statusLabel}
                      </span>
                      <span className="font-bold text-text-main truncate group-hover:text-text-main transition-colors" title={w.category}>{w.category}</span>
                    </div>
                    <span className={`font-black shrink-0 ${colorClass}`}>
                      {w.percent}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-text-muted font-medium px-0.5 gap-2 min-w-0">
                    <span className="truncate" title={formatMoney(w.spent, currency)}>{formatMoney(w.spent, currency)}</span>
                    <span className="truncate shrink-0" title={`Limit: ${formatMoney(w.limit, currency)}`}>Limit: {formatMoney(w.limit, currency)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden border border-border shrink-0">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${bgClass}`}
                      style={{ width: `${Math.min(w.ratio * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-border relative z-10">
        <button
          onClick={onOpenBudgetModal}
          className="w-full py-2.5 bg-surface hover:bg-surface-offset text-text-main text-xs font-bold rounded-xl active:scale-[0.98] transition-all border border-border shadow-inner flex items-center justify-center min-w-0 shrink-0 px-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Konfiguruj budżety
        </button>
      </div>
    </div>
  );
});
