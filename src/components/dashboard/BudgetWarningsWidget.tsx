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
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5 ">Plan Budżetu</p>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text-main">Użycie budżetów</h3>
            <span className="text-[9px] uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md font-black ">Ważne</span>
          </div>
        </div>
        <button
          onClick={() => onChangeView("budget")}
          className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition  "
        >
          Szczegóły
        </button>
      </div>

      <div className="mb-4 relative z-10">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-text-muted">Całkowity budżet</span>
          <span className="text-xs font-bold text-text-main">{formatMoney(totalActualSpentInBudget, currency)} <span className="text-text-faint font-normal">/ {formatMoney(totalPlannedBudget, currency)}</span></span>
        </div>
        <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${globalBudgetRatio > 90 ? 'bg-rose-500 ' : globalBudgetRatio > 75 ? 'bg-amber-400 ' : 'bg-emerald-400 '}`}
            style={{ width: `${Math.min(globalBudgetRatio, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-start overflow-hidden relative z-10">
        {budgetWarnings.length === 0 ? (
          <div className="text-center py-6 bg-bg-base/30 rounded-xl border border-dashed border-slate-200 h-full flex flex-col justify-center">
            <span className="text-2xl mb-1 block opacity-50 ">💡</span>
            <p className="text-xs text-text-muted font-bold">Brak budżetów</p>
            <p className="text-[10px] text-text-faint">Skonfiguruj budżety dla kategorii.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {budgetWarnings.map((w, i) => {
              const isCritical = w.status === 'exceeded';
              const isWarning = w.status === 'warning';
              
              const colorClass = isCritical ? 'text-rose-700 drop-' : isWarning ? 'text-amber-700 drop-' : 'text-emerald-700 drop-';
              const bgClass = isCritical ? 'bg-rose-500 ' : isWarning ? 'bg-amber-400 ' : 'bg-emerald-400 ';
              const badgeClass = isCritical ? 'bg-rose-50 text-rose-700 border border-rose-200' : isWarning ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
              const statusLabel = isCritical ? 'Critical' : isWarning ? 'Warning' : 'Safe';

              return (
                <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-surface hover:bg-surface-2 transition shadow-inner group">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${badgeClass}`}>
                        {statusLabel}
                      </span>
                      <span className="font-bold text-text-main truncate group-hover:text-text-main transition-colors">{w.category}</span>
                    </div>
                    <span className={`font-black ${colorClass}`}>
                      {w.percent}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-text-muted font-medium px-0.5">
                    <span>{formatMoney(w.spent, currency)}</span>
                    <span>Limit: {formatMoney(w.limit, currency)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden border border-border">
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
          className="w-full py-2.5 bg-surface hover:bg-surface-2 text-text-muted text-xs font-bold rounded-xl transition-colors border border-slate-200 shadow-inner flex items-center justify-center hover: hover:border-slate-300/50"
        >
          Konfiguruj budżety
        </button>
      </div>
    </div>
  );
});
