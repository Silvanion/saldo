import React, { useMemo } from "react";
import { Profile } from "../types";
import { formatPln, iconByCategory, budgetCategories } from "../utils";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan Kontroli Kosztów</p>
          <h2 className="text-xl font-bold text-[#153a35]">Budżety miesięczne</h2>
          <p className="text-xs text-slate-500 mt-1">
            Przeznaczono łącznie <strong>{formatPln(totalPlannedBudget)}</strong> na ten miesiąc. Wydano dotychczas <strong>{formatPln(totalActualSpent)}</strong>.
          </p>
        </div>
        <button
          onClick={onOpenBudgetModal}
          className="bg-[#137566] text-white font-bold py-2 px-5 rounded-xl hover:bg-[#0f5d51] transition shadow-md text-sm whitespace-nowrap self-start sm:self-auto"
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
            <div key={category} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow transition flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-[#e7f3f0] text-xl flex items-center justify-center">
                      {iconByCategory[category] || "📂"}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#153a35]">{category}</h4>
                      <p className="text-[10px] text-slate-400">Wykorzystano {percent}% limitu</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="block text-xs font-bold text-slate-800">{formatPln(spent)}</span>
                    <span className="text-[10px] text-slate-400">
                      {limit > 0 ? `Limit: ${formatPln(limit)}` : "brak limitu"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-4" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    style={{ width: `${limit > 0 ? percent : 0}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? "bg-[#d55e50]" : isClose ? "bg-amber-500" : "bg-[#137566]"
                    }`}
                  ></div>
                </div>

                {isOver && (
                  <p className="text-[11px] text-[#d55e50] font-bold mt-2" id={`alert-budget-over-${category}`}>
                    Stan: Przekroczony. Przekroczyłeś zaplanowany budżet o {formatPln(spent - limit)}!
                  </p>
                )}
                {isClose && (
                  <p className="text-[11px] text-amber-600 font-bold mt-2" id={`alert-budget-close-${category}`}>
                    Stan: Ostrzeżenie. Jesteś blisko wyczerpania limitu. Pozostało {formatPln(limit - spent)}.
                  </p>
                )}
              </div>

              {/* Small list of category transactions */}
              <div className="border-t border-slate-50 pt-3">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Ostatnie wydatki w tej kategorii</p>
                {catTransactions.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Brak wydatków w tym miesiącu.</p>
                ) : (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {catTransactions.slice(0, 3).map((t) => (
                      <div key={t.id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 truncate max-w-[150px]">{t.name}</span>
                        <span className="font-bold text-slate-700">{formatPln(t.amount)}</span>
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
