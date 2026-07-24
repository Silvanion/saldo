import React, { memo } from "react";
import { formatPln } from "../../utils";
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
  const globalBudgetRatio = totalPlannedBudget > 0 ? (totalActualSpentInBudget / totalPlannedBudget) * 100 : 0;
  
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-full" id="widget-content-budget-box">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan Budżetu</p>
          <h3 className="text-base font-bold text-gray-800">Użycie budżetów</h3>
        </div>
        <button
          onClick={() => onChangeView("budget")}
          className="text-[11px] font-bold text-[#137566] bg-[#137566]/10 px-2 py-1 rounded-lg hover:bg-[#137566]/20 transition"
        >
          Szczegóły
        </button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-gray-700">Całkowity budżet</span>
          <span className="text-xs font-bold text-gray-900">{formatPln(totalActualSpentInBudget)} <span className="text-gray-400 font-normal">/ {formatPln(totalPlannedBudget)}</span></span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${globalBudgetRatio > 90 ? 'bg-rose-500' : globalBudgetRatio > 75 ? 'bg-amber-400' : 'bg-[#137566]'}`}
            style={{ width: `${Math.min(globalBudgetRatio, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-start">
        {budgetWarnings.length === 0 ? (
          <div className="text-center py-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-xl mb-1 block">🏆</span>
            <p className="text-xs text-emerald-800 font-bold">Wszystkie budżety w normie</p>
            <p className="text-[10px] text-emerald-600">Trzymasz się planu!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Uwaga na te kategorie:</p>
            {budgetWarnings.slice(0, 3).map((w, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-gray-700 truncate pr-2">{w.category}</span>
                  <span className={`font-bold ${w.status === 'exceeded' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {w.percent}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${w.status === 'exceeded' ? 'bg-rose-500' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(w.ratio * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-gray-100">
        <button
          onClick={onOpenBudgetModal}
          className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl transition border border-gray-100"
        >
          Konfiguruj budżety
        </button>
      </div>
    </div>
  );
});
