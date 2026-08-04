import React, { useMemo } from "react";
import { Profile } from "../types";
import { iconByCategory, budgetCategories } from "../utils";
import { formatMoney } from "../utils/format";

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

  return (
    <div className="space-y-6" id="budget-view-container">
      {/* Overview header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-lg">
        <div>
          <p className="text-[10px] font-bold text-text-faint uppercase tracking-wider">Plan Kontroli Kosztów</p>
          <h2 className="text-xl font-bold text-white">Budżety miesięczne</h2>
          <p className="text-xs text-text-muted mt-1">
            Przeznaczono łącznie <strong>{formatMoney(totalPlannedBudget, profile.currency || 'PLN')}</strong> na ten miesiąc. Wydano dotychczas <strong>{formatMoney(totalActualSpent, profile.currency || 'PLN')}</strong>.
          </p>
        </div>
        <button
          onClick={onOpenBudgetModal}
          className="bg-emerald-50 text-emerald-700 font-bold py-2 px-5 rounded-xl hover:bg-emerald-50 border border-emerald-200 transition shadow-lg text-sm whitespace-nowrap self-start sm:self-auto "
          id="btn-edit-budget-limits"
        >
          Modyfikuj limity
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
            <div key={category} className="bg-surface p-5 rounded-2xl border border-border shadow-lg hover:shadow-xl hover:bg-surface transition flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-xl flex items-center justify-center">
                      {iconByCategory[category] || "📂"}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{category}</h4>
                      <p className="text-[10px] text-text-faint">Wykorzystano {percent}% limitu</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="block text-xs font-bold text-text-main">{formatMoney(spent, profile.currency || 'PLN')}</span>
                    <span className="text-[10px] text-text-faint">
                      {limit > 0 ? `Limit: ${formatMoney(limit, profile.currency || 'PLN')}` : "brak limitu"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-4" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    style={{ width: `${limit > 0 ? percent : 0}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? "bg-rose-500" : isClose ? "bg-amber-500" : "bg-teal-500"
                    }`}
                  ></div>
                </div>

                {isOver && (
                  <p className="text-[11px] text-rose-700 font-bold mt-2" id={`alert-budget-over-${category}`}>
                    Stan: Przekroczony. Przekroczyłeś zaplanowany budżet o {formatMoney(spent - limit, profile.currency || 'PLN')}!
                  </p>
                )}
                {isClose && (
                  <p className="text-[11px] text-amber-700 font-bold mt-2" id={`alert-budget-close-${category}`}>
                    Stan: Ostrzeżenie. Jesteś blisko wyczerpania limitu. Pozostało {formatMoney(limit - spent, profile.currency || 'PLN')}.
                  </p>
                )}
              </div>

              {/* Small list of category transactions */}
              <div className="border-t border-border pt-3">
                <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-2">Ostatnie wydatki w tej kategorii</p>
                {catTransactions.length === 0 ? (
                  <p className="text-[11px] text-text-muted italic">Brak wydatków w tym miesiącu.</p>
                ) : (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {catTransactions.slice(0, 3).map((t) => (
                      <div key={t.id} className="flex justify-between items-center text-xs">
                        <span className="text-text-muted truncate max-w-[150px]">{t.name}</span>
                        <span className="font-bold text-text-main">{formatMoney(t.amount, profile.currency || 'PLN')}</span>
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
