import React, { useMemo, useState, useEffect } from "react";
import { Profile } from "../types";
import { formatPln, getMonthNamePl, generateReportPdf, expenseCategories, budgetCategories } from "../utils";
import { Settings2, Check } from "lucide-react";
import { generateMonthlyDigest } from "../services/monthlyDigest";

interface AnalysisViewProps {
  profile: Profile;
  selectedDate: Date;
}

export function AnalysisView({ profile, selectedDate }: AnalysisViewProps) {
  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();
  const monthName = getMonthNamePl(currentMonthIdx);

  // Filter transactions for this month
  const thisMonthTransactions = useMemo(() => {
    return profile.transactions.filter((t) => {
      const d = new Date(`${t.isoDate}T12:00:00`);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx;
    });
  }, [profile.transactions, currentYear, currentMonthIdx]);

  const incomeTxs = useMemo(() => {
    return thisMonthTransactions.filter((t) => t.type === "income");
  }, [thisMonthTransactions]);

  const expenseTxs = useMemo(() => {
    return thisMonthTransactions.filter((t) => t.type === "expense");
  }, [thisMonthTransactions]);

  const totalIncome = useMemo(() => {
    return incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  }, [incomeTxs]);

  const totalExpense = useMemo(() => {
    return expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  }, [expenseTxs]);

  const savings = useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);
  const savingsRate = useMemo(() => {
    return totalIncome > 0 ? Math.max(0, Math.round((savings / totalIncome) * 100)) : 0;
  }, [totalIncome, savings]);

  const lastMonthExpense = useMemo(() => {
    let lastM = currentMonthIdx - 1;
    let lastY = currentYear;
    if (lastM < 0) {
      lastM = 11;
      lastY--;
    }
    return profile.transactions
      .filter((t) => {
        const d = new Date(`${t.isoDate}T12:00:00`);
        return d.getFullYear() === lastY && d.getMonth() === lastM && t.type === "expense";
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [profile.transactions, currentYear, currentMonthIdx]);

  const expenseChange = useMemo(() => {
    if (lastMonthExpense === 0) return 0;
    return Math.round(((totalExpense - lastMonthExpense) / lastMonthExpense) * 100);
  }, [totalExpense, lastMonthExpense]);

  const [userToggles, setUserToggles] = useState<Record<string, boolean>>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    setUserToggles({});
  }, [currentMonthIdx, currentYear]);

  const monthlyDigest = useMemo(() => {
    return generateMonthlyDigest(profile.transactions, currentYear, currentMonthIdx);
  }, [profile.transactions, currentYear, currentMonthIdx]);

  // Category expense breakdown
  const categorySummary = useMemo(() => {
    return expenseCategories.map((cat) => {
      const spent = expenseTxs.filter((t) => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
      const limit = profile.budgets[cat] || 0;
      return {
        name: cat,
        spent,
        limit
      };
    })
    .filter(cat => {
      const userToggle = userToggles[cat.name];
      if (userToggle === true) return true;
      if (userToggle === false) return false;
      return cat.spent > 0;
    })
    .map(cat => ({
      ...cat,
      pctOfExpense: totalExpense > 0 ? Math.round((cat.spent / totalExpense) * 100) : 0
    }))
    .sort((a, b) => b.spent - a.spent);
  }, [expenseTxs, profile.budgets, totalExpense, userToggles]);

  const totalPlannedBudget = useMemo(() => {
    return budgetCategories.reduce((s, c) => s + (profile.budgets[c] || 0), 0);
  }, [profile.budgets]);

  const totalActualSpent = useMemo(() => {
    return budgetCategories.reduce((s, c) => s + (expenseTxs.filter(t => t.category === c).reduce((sum, t) => sum + t.amount, 0)), 0);
  }, [expenseTxs]);

  // Dynamic advice generation
  const insightsList = useMemo(() => {
    const insights = [];

    // Savings rate advice
    if (totalIncome > 0) {
      if (savingsRate >= 20) {
        insights.push({
          type: "success",
          title: "Świetna stopa oszczędności!",
          desc: `Oszczędzasz obecnie ${savingsRate}% swoich dochodów (${formatPln(savings)}). To powyżej zalecanego minimum 15%!`
        });
      } else if (savingsRate > 0 && savingsRate < 20) {
        insights.push({
          type: "info",
          title: "Dobry kierunek oszczędzania",
          desc: `Oszczędzasz ${savingsRate}% dochodów. Spróbuj zbliżyć się do poziomu 20%, odkładając stałą kwotę zaraz po wypłacie.`
        });
      } else {
        insights.push({
          type: "warning",
          title: "Deficyt budżetowy",
          desc: `Twoje wydatki w tym miesiącu przewyższyły przychody o ${formatPln(Math.abs(savings))}. Przejrzyj kategorie Rozrywka i Inne, aby znaleźć oszczędności.`
        });
      }
    } else {
      insights.push({
        type: "info",
        title: "Brak dochodów w wybranym miesiącu",
        desc: "Wprowadź swoje stałe lub dodatkowe dochody, by system mógł wyliczyć stopę oszczędności i przeanalizować bilans."
      });
    }

    // Category alert
    const topCategory = categorySummary[0];
    if (topCategory && topCategory.spent > 0) {
      insights.push({
        type: "info",
        title: `Największy wydatek: ${topCategory.name}`,
        desc: `Kategoria "${topCategory.name}" stanowi ${topCategory.pctOfExpense}% wszystkich Twoich wydatków w tym miesiącu (${formatPln(topCategory.spent)}).`
      });
    }

    // MoM Expense Change
    if (lastMonthExpense > 0) {
      if (expenseChange > 5) {
        insights.push({
          type: "warning",
          title: "Wzrost wydatków",
          desc: `Wydałeś w tym miesiącu o ${expenseChange}% więcej niż w zeszłym (${formatPln(totalExpense)} vs ${formatPln(lastMonthExpense)}). Zwróć uwagę na rosnące koszty.`
        });
      } else if (expenseChange < -5) {
        insights.push({
          type: "success",
          title: "Redukcja wydatków",
          desc: `Udało Ci się obniżyć wydatki o ${Math.abs(expenseChange)}% w porównaniu do zeszłego miesiąca. Świetna robota!`
        });
      }
    }

    // Budget overruns alert
    const overruns = categorySummary.filter(c => c.limit > 0 && c.spent > c.limit);
    if (overruns.length > 0) {
      insights.push({
        type: "warning",
        title: "Przekroczone limity budżetowe",
        desc: `Przekroczyłeś limity w następujących kategoriach: ${overruns.map(o => o.name).join(", ")}. W kolejnym miesiącu spróbuj dostosować kwotę lub baczniej kontrolować koszty.`
      });
    } else if (totalPlannedBudget > 0 && totalActualSpent <= totalPlannedBudget) {
      insights.push({
        type: "success",
        title: "Budżety pod pełną kontrolą!",
        desc: "Gratulacje! Wszystkie kategorie mieszczą się w wyznaczonych limitach budżetowych."
      });
    }

    return insights;
  }, [totalIncome, savingsRate, savings, categorySummary, totalPlannedBudget, totalActualSpent]);

  return (
    <div className="space-y-6" id="analysis-view-container">
      {/* Report download header */}
      <div className="bg-gradient-to-r from-[#137566] to-[#155e51] p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Miesięczny Raport PDF</h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Pobierz oficjalny, zoptymalizowany i przejrzyście sformatowany dokument PDF zawierający pełną strukturę Twoich wydatków, stan opłat i oszczędności w wybranym miesiącu. Idealny do wydruku lub archiwizacji.
          </p>
        </div>
        <button
          onClick={() => generateReportPdf(profile, currentYear, currentMonthIdx)}
          className="bg-white text-[#137566] font-bold py-2.5 px-6 rounded-xl hover:bg-emerald-50 transition shadow self-start md:self-auto text-sm"
          id="btn-download-pdf-report"
        >
          📥 Pobierz raport (PDF)
        </button>
      </div>

      {/* Analysis body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advice and alerts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#153a35]">Miesięczny przegląd (bez AI)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Przychody</p>
                <p className="text-sm font-bold text-emerald-600">{formatPln(monthlyDigest.totalIncome)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Wydatki</p>
                <p className="text-sm font-bold text-rose-600">{formatPln(monthlyDigest.totalExpenses)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Bilans</p>
                <p className={`text-sm font-bold ${monthlyDigest.balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatPln(monthlyDigest.balance)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Oszczędności</p>
                <p className="text-sm font-bold text-slate-700">
                  {monthlyDigest.savingsRate !== null ? `${Math.round(monthlyDigest.savingsRate)}%` : "-"}
                </p>
              </div>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 text-sm leading-relaxed">
              {monthlyDigest.summaryText}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-[#153a35]">Wnioski i podpowiedzi</h3>
          <div className="space-y-3">
            {insightsList.map((ins, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition ${
                  ins.type === "success"
                    ? "bg-emerald-50/80 border-emerald-100 text-emerald-950"
                    : ins.type === "warning"
                    ? "bg-rose-50/80 border-rose-100 text-rose-950"
                    : "bg-blue-50/80 border-blue-100 text-blue-950"
                }`}
              >
                <span className="text-lg">
                  {ins.type === "success" ? "✓" : ins.type === "warning" ? "⚠️" : "💡"}
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-1">{ins.title}</h4>
                  <p className="text-xs leading-relaxed opacity-90">{ins.desc}</p>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Breakdown box */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-[#153a35]">Struktura wydatków</h3>
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Dostosuj
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-700">
                    Widoczne kategorie
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                    {expenseCategories.map(cat => {
                      const isVisible = userToggles[cat] !== undefined 
                        ? userToggles[cat] 
                        : expenseTxs.some(t => t.category === cat && t.amount > 0);
                      
                      return (
                        <label key={cat} className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-xl cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={isVisible}
                            onChange={(e) => setUserToggles(prev => ({ ...prev, [cat]: e.target.checked }))}
                          />
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isVisible ? 'bg-[#137566] border-[#137566] text-white' : 'border-slate-300'}`}>
                            {isVisible && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-xs text-slate-700">{cat}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {categorySummary.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">Brak widocznych kategorii w wybranym miesiącu.</p>
            ) : (
              categorySummary.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-bold">{cat.name}</span>
                    <span className="text-slate-500">
                      {formatPln(cat.spent)} ({cat.pctOfExpense}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${cat.pctOfExpense}%` }}
                      className="bg-[#137566] h-full rounded-full"
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalIncome > 0 && (
            <div className="border-t border-slate-100 mt-5 pt-4">
              <h4 className="text-xs font-bold text-[#153a35] mb-2">Stopa oszczędności</h4>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-[#e7f3f0] flex items-center justify-center font-bold text-[#137566] text-sm flex-shrink-0">
                  {savingsRate}%
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Zabezpieczasz <strong>{formatPln(savings)}</strong> z miesięcznych przychodów rzędu <strong>{formatPln(totalIncome)}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
