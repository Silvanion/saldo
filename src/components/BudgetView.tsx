import React, { useMemo } from "react";
import { Profile } from "../types";
import { iconByCategory, budgetCategories } from "../utils";
import { formatMoney } from "../utils/format";
import { SlidersHorizontal, AlertCircle, AlertTriangle } from "lucide-react";

interface BudgetViewProps {
  profile: Profile;
  selectedDate: Date;
  onOpenBudgetModal: () => void;
}

export function BudgetView({ profile, selectedDate, onOpenBudgetModal }: BudgetViewProps) {
  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();

  // Filter transactions for selected period
  const thisMonthExpenses = useMemo(() => {
    return profile.transactions.filter((t) => {
      const d = new Date(`${t.isoDate}T12:00:00`);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx && t.type === "expense";
    });
  }, [profile.transactions, currentYear, currentMonthIdx]);

  // Precomputed category spent lookup table for O(1) rendering access
  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    thisMonthExpenses.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return map;
  }, [thisMonthExpenses]);

  const categorySpent = (categoryName: string) => {
    return categorySpentMap[categoryName] || 0;
  };

  const totalPlannedBudget = useMemo(() => {
    return budgetCategories.reduce(
      (sum, cat) => sum + (profile.budgets[cat] || 0),
      0
    );
  }, [profile.budgets]);
  
  const totalActualSpent = useMemo(() => {
    return budgetCategories.reduce(
      (sum, cat) => sum + categorySpent(cat),
      0
    );
  }, [categorySpentMap]);

  const globalBudgetRatio = totalPlannedBudget > 0 ? (totalActualSpent / totalPlannedBudget) * 100 : 0;
  const globalRemaining = totalPlannedBudget - totalActualSpent;

  return (
    <div className="space-y-6" id="budget-view-container">
      {/* Overview header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 sm:p-6 rounded-2xl border border-border shadow-sm min-w-0">
        <div className="min-w-0">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider mb-0.5 truncate" title="Plan Kontroli Kosztów">
            Plan Kontroli Kosztów
          </p>
          <div className="flex items-center gap-2 mb-1.5 min-w-0">
            <h2 className="text-xl font-bold text-text-main truncate" title="Budżety miesięczne">
              Budżety miesięczne
            </h2>
            {totalPlannedBudget > 0 && (
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shrink-0 border ${
                globalBudgetRatio > 100
                  ? "bg-danger-subtle text-danger border-danger/30"
                  : globalBudgetRatio > 80
                    ? "bg-warning-subtle text-warning border-warning/30"
                    : "bg-brand-subtle text-brand border-brand/20"
              }`}>
                {Math.round(globalBudgetRatio)}% planu
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span>
              Zaplanowano: <strong className="text-text-main tabular-nums font-bold">{formatMoney(totalPlannedBudget, profile.currency || 'PLN')}</strong>
            </span>
            <span className="text-border">•</span>
            <span>
              Wydano: <strong className={`tabular-nums font-bold ${totalActualSpent > totalPlannedBudget && totalPlannedBudget > 0 ? 'text-danger' : 'text-text-main'}`}>{formatMoney(totalActualSpent, profile.currency || 'PLN')}</strong>
            </span>
            {totalPlannedBudget > 0 && (
              <>
                <span className="text-border">•</span>
                <span>
                  {globalRemaining >= 0 ? "Pozostało: " : "Przekroczenie: "}
                  <strong className={`tabular-nums font-bold ${globalRemaining < 0 ? 'text-danger' : 'text-brand'}`}>
                    {formatMoney(Math.abs(globalRemaining), profile.currency || 'PLN')}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={onOpenBudgetModal}
          className="bg-brand text-text-inverse font-bold py-2.5 px-4 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-sm text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          id="btn-edit-budget-limits"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Modyfikuj limity</span>
        </button>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetCategories.map((category) => {
          const spent = categorySpent(category);
          const limit = profile.budgets[category] || 0;
          const ratio = limit > 0 ? spent / limit : 0;
          const percent = limit > 0 ? Math.min(100, Math.round(ratio * 100)) : 0;
          const isOver = limit > 0 && ratio >= 1;
          const isClose = limit > 0 && ratio >= 0.8 && ratio < 1;

          // Transactions in this category
          const catTransactions = thisMonthExpenses.filter((t) => t.category === category);

          return (
            <div
              key={category}
              className="bg-surface p-5 rounded-2xl border border-border shadow-sm hover:border-brand/30 transition-colors flex flex-col justify-between space-y-4 min-w-0"
            >
              <div className="min-w-0">
                <div className="flex justify-between items-start min-w-0 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-surface-2 border border-border text-xl flex items-center justify-center shrink-0">
                      {iconByCategory[category] || "📂"}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-text-main truncate" title={category}>{category}</h4>
                      <p className="text-xs text-text-faint truncate" title={`Wykorzystano ${percent}% limitu`}>
                        Wykorzystano <span className="tabular-nums font-semibold">{percent}%</span> limitu
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0 min-w-0">
                    <span className={`block text-xs font-bold tabular-nums truncate max-w-[120px] ${isOver ? 'text-danger' : 'text-text-main'}`} title={formatMoney(spent, profile.currency || 'PLN')}>
                      {formatMoney(spent, profile.currency || 'PLN')}
                    </span>
                    <span className="text-xs text-text-faint tabular-nums truncate block max-w-[120px]" title={limit > 0 ? `Limit: ${formatMoney(limit, profile.currency || 'PLN')}` : "brak limitu"}>
                      {limit > 0 ? `Limit: ${formatMoney(limit, profile.currency || 'PLN')}` : "brak limitu"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-surface-2 h-2.5 rounded-full overflow-hidden mt-3.5 border border-border/50" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    style={{ width: `${limit > 0 ? percent : 0}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? "bg-danger" : isClose ? "bg-warning" : "bg-brand"
                    }`}
                  ></div>
                </div>

                {isOver && (
                  <div
                    className="mt-3 bg-danger-subtle border border-danger/30 text-danger rounded-xl p-2.5 text-xs font-semibold flex items-center gap-2 min-w-0"
                    id={`alert-budget-over-${category}`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
                    <p className="truncate min-w-0">
                      Przekroczono zaplanowany budżet o <span className="tabular-nums font-bold">{formatMoney(spent - limit, profile.currency || 'PLN')}</span>!
                    </p>
                  </div>
                )}
                {isClose && (
                  <div
                    className="mt-3 bg-warning-subtle border border-warning/30 text-warning rounded-xl p-2.5 text-xs font-semibold flex items-center gap-2 min-w-0"
                    id={`alert-budget-close-${category}`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
                    <p className="truncate min-w-0">
                      Blisko limitu. Pozostało <span className="tabular-nums font-bold">{formatMoney(limit - spent, profile.currency || 'PLN')}</span>.
                    </p>
                  </div>
                )}
              </div>

              {/* Small list of category transactions */}
              <div className="border-t border-border pt-3 min-w-0">
                <p className="text-[10px] uppercase font-bold text-text-faint tracking-wider mb-2 truncate" title="Ostatnie wydatki w tej kategorii">
                  Ostatnie wydatki w tej kategorii
                </p>
                {catTransactions.length === 0 ? (
                  <p className="text-xs text-text-faint truncate" title="Brak wydatków w tym miesiącu.">
                    Brak wydatków w tym miesiącu.
                  </p>
                ) : (
                  <div className="space-y-1.5 pr-1">
                    {catTransactions.slice(0, 3).map((t) => (
                      <div key={t.id} className="flex justify-between items-center text-xs min-w-0 gap-2">
                        <span className="text-text-muted flex-1 min-w-0 truncate" title={t.name}>{t.name}</span>
                        <span className="font-bold text-text-main tabular-nums shrink-0 whitespace-nowrap" title={formatMoney(t.amount, profile.currency || 'PLN')}>
                          {formatMoney(t.amount, profile.currency || 'PLN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
