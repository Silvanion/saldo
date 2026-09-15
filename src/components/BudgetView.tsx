import React, { useMemo, memo } from "react";
import { Profile } from "../types";
import { iconByCategory, budgetCategories, formatDate } from "../utils";
import { formatMoney } from "../utils/format";
import { SlidersHorizontal, AlertCircle, AlertTriangle } from "lucide-react";

interface BudgetViewProps {
  profile: Profile;
  selectedDate: Date;
  onOpenBudgetModal: () => void;
}

export const BudgetView = memo(function BudgetView({ profile, selectedDate, onOpenBudgetModal }: BudgetViewProps) {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider mb-0.5">
            Plan Kontroli Kosztów
          </p>
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-text-main truncate" title="Budżety miesięczne">
              Budżety miesięczne
            </h2>
            {totalPlannedBudget > 0 && (
              <span className={`text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold shrink-0 border ${
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted mt-1">
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0 w-full md:w-auto mt-3 md:mt-0 md:justify-end">
          <button
            onClick={onOpenBudgetModal}
            className="w-full sm:w-auto min-h-[44px] bg-brand text-text-inverse font-bold py-2.5 px-4 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs text-xs flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
            id="btn-edit-budget-limits"
          >
            <SlidersHorizontal className="w-4 h-4 text-text-inverse" />
            <span>Modyfikuj limity</span>
          </button>
        </div>
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
              className="bg-surface p-4 sm:p-5 rounded-xl border border-border/70 shadow-xs hover:shadow-md hover:border-brand/40 transition-all flex flex-col justify-between space-y-4 min-w-0"
            >
              <div className="min-w-0">
                <div className="flex justify-between items-start min-w-0 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-surface-2/60 border border-border/70 text-lg flex items-center justify-center shrink-0">
                      {iconByCategory[category] || "📂"}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-text-main truncate" title={category}>{category}</h4>
                      {limit > 0 ? (
                        <p className="text-xs text-text-faint truncate" title={`Wykorzystano ${percent}% limitu`}>
                          Wykorzystano <span className="tabular-nums font-semibold">{percent}%</span> limitu
                        </p>
                      ) : (
                        <p className="text-xs text-text-faint truncate">Bez ustalonego limitu</p>
                      )}
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
                <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden mt-3.5 border border-border/50" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    style={{ width: `${limit > 0 ? percent : 0}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? "bg-danger" : isClose ? "bg-warning" : "bg-brand"
                    }`}
                  ></div>
                </div>

                {isOver ? (
                  <div
                    className="mt-2.5 bg-danger-subtle border border-danger/30 text-danger rounded-xl p-2.5 text-xs font-semibold flex items-center gap-2 min-w-0"
                    id={`alert-budget-over-${category}`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
                    <p className="truncate min-w-0">
                      Przekroczono zaplanowany budżet o <span className="tabular-nums font-bold">{formatMoney(spent - limit, profile.currency || 'PLN')}</span>!
                    </p>
                  </div>
                ) : isClose ? (
                  <div
                    className="mt-2.5 bg-warning-subtle border border-warning/30 text-warning rounded-xl p-2.5 text-xs font-semibold flex items-center gap-2 min-w-0"
                    id={`alert-budget-close-${category}`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
                    <p className="truncate min-w-0">
                      Blisko limitu. Pozostało <span className="tabular-nums font-bold">{formatMoney(limit - spent, profile.currency || 'PLN')}</span>.
                    </p>
                  </div>
                ) : limit > 0 ? (
                  <div className="mt-2 flex justify-between items-center text-xs text-text-faint px-0.5">
                    <span>Pozostało do limitu:</span>
                    <span className="font-semibold text-text-muted tabular-nums">
                      {formatMoney(limit - spent, profile.currency || 'PLN')}
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-text-faint px-0.5">
                    Brak ustalonego limitu dla tej kategorii.
                  </div>
                )}
              </div>

              {/* Small list of category transactions */}
              <div className="border-t border-border/70 pt-3 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs uppercase font-semibold text-text-faint tracking-wider truncate" title="Ostatnie wydatki w tej kategorii">
                    Ostatnie wydatki
                  </p>
                  {catTransactions.length > 0 && (
                    <span className="text-xs font-semibold text-text-faint tabular-nums">
                      {catTransactions.length} {catTransactions.length === 1 ? 'wpis' : catTransactions.length < 5 ? 'wpisy' : 'wpisów'}
                    </span>
                  )}
                </div>

                {catTransactions.length === 0 ? (
                  <div className="bg-surface-2/30 rounded-xl p-2.5 border border-border/40 text-center">
                    <p className="text-xs text-text-faint truncate" title="Brak wydatków w tym miesiącu.">
                      Brak wydatków w tym miesiącu
                    </p>
                  </div>
                ) : (
                  <div className="bg-surface-2/40 rounded-xl p-2.5 border border-border/60 space-y-2">
                    {catTransactions.slice(0, 3).map((t) => (
                      <div key={t.id} className="flex justify-between items-center text-xs min-w-0 gap-2">
                        <div className="min-w-0 flex-1 flex items-center gap-1.5">
                          <span className="text-text-muted truncate font-medium" title={t.name}>{t.name}</span>
                          <span className="text-xs text-text-faint shrink-0 whitespace-nowrap">
                            {formatDate(t.isoDate)}
                          </span>
                        </div>
                        <span className="font-semibold text-text-main tabular-nums shrink-0 whitespace-nowrap" title={formatMoney(t.amount, profile.currency || 'PLN')}>
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
});
