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
    <div className="bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-slate-700/50 shadow-2xl flex flex-col justify-between h-full relative overflow-hidden" id="widget-content-budget-box">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 drop-shadow-sm">Plan Budżetu</p>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100">Użycie budżetów</h3>
            <span className="text-[9px] uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-black shadow-[0_0_10px_rgba(245,158,11,0.1)]">Ważne</span>
          </div>
        </div>
        <button
          onClick={() => onChangeView("budget")}
          className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 transition backdrop-blur-md shadow-[0_0_10px_rgba(245,158,11,0.1)]"
        >
          Szczegóły
        </button>
      </div>

      <div className="mb-4 relative z-10">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-slate-300">Całkowity budżet</span>
          <span className="text-xs font-bold text-slate-100">{formatMoney(totalActualSpentInBudget, currency)} <span className="text-slate-500 font-normal">/ {formatMoney(totalPlannedBudget, currency)}</span></span>
        </div>
        <div className="h-2 w-full bg-slate-900/50 rounded-full overflow-hidden border border-slate-700/50">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${globalBudgetRatio > 90 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : globalBudgetRatio > 75 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'}`}
            style={{ width: `${Math.min(globalBudgetRatio, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-start overflow-hidden relative z-10">
        {budgetWarnings.length === 0 ? (
          <div className="text-center py-6 bg-slate-900/30 rounded-xl border border-dashed border-slate-600/50 h-full flex flex-col justify-center">
            <span className="text-2xl mb-1 block opacity-50 drop-shadow-md">💡</span>
            <p className="text-xs text-slate-400 font-bold">Brak budżetów</p>
            <p className="text-[10px] text-slate-500">Skonfiguruj budżety dla kategorii.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {budgetWarnings.map((w, i) => {
              const isCritical = w.status === 'exceeded';
              const isWarning = w.status === 'warning';
              
              const colorClass = isCritical ? 'text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.3)]' : isWarning ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]' : 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]';
              const bgClass = isCritical ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : isWarning ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]';
              const badgeClass = isCritical ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : isWarning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
              const statusLabel = isCritical ? 'Critical' : isWarning ? 'Warning' : 'Safe';

              return (
                <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-700/50 bg-slate-900/50 hover:bg-slate-800/80 transition shadow-inner group">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${badgeClass}`}>
                        {statusLabel}
                      </span>
                      <span className="font-bold text-slate-200 truncate group-hover:text-slate-100 transition-colors">{w.category}</span>
                    </div>
                    <span className={`font-black ${colorClass}`}>
                      {w.percent}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium px-0.5">
                    <span>{formatMoney(w.spent, currency)}</span>
                    <span>Limit: {formatMoney(w.limit, currency)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
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

      <div className="pt-4 mt-4 border-t border-slate-700/50 relative z-10">
        <button
          onClick={onOpenBudgetModal}
          className="w-full py-2.5 bg-slate-900/50 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-colors border border-slate-600/50 shadow-inner flex items-center justify-center hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:border-slate-500/50"
        >
          Konfiguruj budżety
        </button>
      </div>
    </div>
  );
});
