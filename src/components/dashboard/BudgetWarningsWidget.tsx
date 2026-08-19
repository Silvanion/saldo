import React, { memo } from "react";
import { BudgetWarning } from "../../services/budgetCalculations";
import { formatMoney } from "../../utils/format";
import { Settings } from "lucide-react";

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
    <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between h-full max-h-[440px] relative overflow-hidden" id="widget-content-budget-box">
      <div className="flex items-center justify-between gap-4 mb-4 relative z-10 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider mb-0.5 truncate" title="Plan Budżetu">Plan Budżetu</p>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-bold text-text-main truncate" title="Użycie budżetów">Użycie budżetów</h3>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shrink-0 border ${
              globalBudgetRatio > 100 ? "bg-danger-subtle text-danger border-danger/30" : globalBudgetRatio > 80 ? "bg-warning-subtle text-warning border-warning/30" : "bg-brand-subtle text-brand border-brand/20"
            }`}>
              {Math.round(globalBudgetRatio)}% planu
            </span>
          </div>
        </div>
        <button
          onClick={() => onChangeView("budget")}
          className="text-xs font-bold text-brand bg-brand-subtle border border-brand/20 px-2.5 py-1.5 rounded-lg hover:bg-brand-subtle active:scale-[0.98] transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          title="Szczegóły"
        >
          Szczegóły →
        </button>
      </div>

      {/* Global Budget Progress Bar */}
      <div className="mb-4 relative z-10 min-w-0 bg-surface-2 p-3 rounded-xl border border-border">
        <div className="flex justify-between items-end gap-2 mb-1.5 min-w-0">
          <span className="text-xs font-bold text-text-muted truncate">Łączny limit miesięczny</span>
          <span className="text-xs font-bold text-text-main truncate shrink-0">
            {formatMoney(totalActualSpentInBudget, currency)} <span className="text-text-faint font-normal">/ {formatMoney(totalPlannedBudget, currency)}</span>
          </span>
        </div>
        <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${globalBudgetRatio > 100 ? 'bg-danger' : globalBudgetRatio > 80 ? 'bg-warning' : 'bg-brand'}`}
            style={{ width: `${Math.min(globalBudgetRatio, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {budgetWarnings.length === 0 ? (
          <div className="text-center py-6 bg-bg-base/30 rounded-xl border border-dashed border-border h-full flex flex-col justify-center min-w-0">
            <div className="text-2xl mb-1 opacity-50 shrink-0">💡</div>
            <p className="text-xs text-text-muted font-medium truncate">Brak skonfigurowanych limitów</p>
            <p className="text-xs text-text-faint truncate">Ustaw budżety dla kategorii, by śledzić wydatki.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar min-w-0">
            {budgetWarnings.map((w) => {
              const isCritical = w.status === 'exceeded';
              const isWarning = w.status === 'warning';
              
              const colorClass = isCritical ? 'text-danger font-black' : isWarning ? 'text-warning font-bold' : 'text-text-muted font-bold';
              const bgClass = isCritical ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-brand';
              const badgeClass = isCritical ? 'bg-danger-subtle text-danger border-danger/30' : isWarning ? 'bg-warning-subtle text-warning border-warning/30' : 'bg-brand-subtle text-brand border-brand/20';
              const statusLabel = isCritical ? 'Przekroczony' : isWarning ? 'Uwaga' : 'W normie';

              return (
                <div key={w.category} className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-surface hover:bg-surface-offset transition-colors shadow-sm group min-w-0">
                  <div className="flex justify-between items-center text-xs gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wider shrink-0 ${badgeClass}`}>
                        {statusLabel}
                      </span>
                      <span className="font-bold text-text-main group-hover:text-brand transition-colors truncate" title={w.category}>{w.category}</span>
                    </div>
                    <span className={`shrink-0 ${colorClass}`}>
                      {w.percent}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-text-muted font-medium px-0.5 gap-2 min-w-0">
                    <span className="truncate" title={formatMoney(w.spent, currency)}>{formatMoney(w.spent, currency)}</span>
                    <span className="truncate shrink-0 text-text-faint" title={`Limit: ${formatMoney(w.limit, currency)}`}>Limit: {formatMoney(w.limit, currency)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden border border-border shrink-0">
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

      <div className="pt-3 mt-3 border-t border-border relative z-10">
        <button
          onClick={onOpenBudgetModal}
          className="w-full py-2.5 bg-surface hover:bg-surface-offset text-text-main text-xs font-bold rounded-xl active:scale-[0.98] transition-all border border-border flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-sm"
          title="Konfiguruj budżety"
        >
          <Settings className="w-4 h-4" />
          <span>Konfiguruj budżety</span>
        </button>
      </div>
    </div>
  );
});

