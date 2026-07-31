import { useI18n } from "../../i18n/I18nProvider";
import React, { memo } from "react";
import {} from "../../utils";
import { BudgetWarning } from "../../services/budgetCalculations";

interface BudgetWarningsWidgetProps {
  totalPlannedBudget: number;
  totalActualSpentInBudget: number;
  budgetWarnings: BudgetWarning[];
  onChangeView: (view: string) => void;
  onOpenBudgetModal: () => void;
}

export const BudgetWarningsWidget = memo(function BudgetWarningsWidget({
  totalPlannedBudget,
  totalActualSpentInBudget,
  budgetWarnings,
  onChangeView,
  onOpenBudgetModal
}: BudgetWarningsWidgetProps) {
  const { formatMoney } = useI18n();
  const globalBudgetRatio = totalPlannedBudget > 0 ? (totalActualSpentInBudget / totalPlannedBudget) * 100 : 0;
  
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-full" id="widget-content-budget-box">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Plan Budżetu</p>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Użycie budżetów</h3>
            <span className="text-[9px] uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-black">Ważne</span>
          </div>
        </div>
        <button
          onClick={() => onChangeView("budget")}
          className="text-[10px] font-bold text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition"
        >
          Szczegóły
        </button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-slate-700">Całkowity budżet</span>
          <span className="text-xs font-bold text-slate-900">{formatMoney(totalActualSpentInBudget)} <span className="text-slate-400 font-normal">/ {formatMoney(totalPlannedBudget)}</span></span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${globalBudgetRatio > 90 ? 'bg-rose-500' : globalBudgetRatio > 75 ? 'bg-amber-400' : 'bg-[#137566]'}`}
            style={{ width: `${Math.min(globalBudgetRatio, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-start overflow-hidden">
        {budgetWarnings.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 h-full flex flex-col justify-center">
            <span className="text-2xl mb-1 block opacity-50">💡</span>
            <p className="text-xs text-slate-500 font-bold">Brak budżetów</p>
            <p className="text-[10px] text-slate-400">Skonfiguruj budżety dla kategorii.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {budgetWarnings.map((w, i) => {
              const isCritical = w.status === 'exceeded';
              const isWarning = w.status === 'warning';
              
              const colorClass = isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600';
              const bgClass = isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500';
              const badgeClass = isCritical ? 'bg-rose-100 text-rose-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
              const statusLabel = isCritical ? 'Critical' : isWarning ? 'Warning' : 'Safe';

              return (
                <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-50 bg-white hover:bg-slate-50 transition shadow-sm">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${badgeClass}`}>
                        {statusLabel}
                      </span>
                      <span className="font-bold text-slate-800 truncate">{w.category}</span>
                    </div>
                    <span className={`font-black ${colorClass}`}>
                      {w.percent}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium px-0.5">
                    <span>{formatMoney(w.spent)}</span>
                    <span>Limit: {formatMoney(w.limit)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${bgClass}`}
                      style={{ width: `${Math.min(w.ratio * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100">
        <button
          onClick={onOpenBudgetModal}
          className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-200/60 shadow-sm"
        >
          Konfiguruj budżety
        </button>
      </div>
    </div>
  );
});
