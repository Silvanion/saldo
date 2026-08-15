import React, { useMemo, useState, useEffect } from "react";
import { Profile } from "../types";
import { getMonthName, expenseCategories, budgetCategories } from "../utils";
import { generateReportPdf } from "../services/pdfGenerator";
import { Settings2, Check, Scale } from "lucide-react";
import { generateMonthlyDigest } from "../services/monthlyDigest";
import { calculate503020 } from "../services/budgetCalculations";
import { formatMoney } from "../utils/format";

interface AnalysisViewProps {
  profile: Profile;
  selectedDate: Date;
}

export function AnalysisView({ profile, selectedDate }: AnalysisViewProps) {
  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();
  const monthName = getMonthName(currentMonthIdx);

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

  const breakdown503020 = useMemo(() => {
    return calculate503020(profile.transactions, selectedDate);
  }, [profile.transactions, selectedDate]);

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
          desc: `Oszczędzasz obecnie ${savingsRate}% swoich dochodów (${formatMoney(savings, profile.currency || 'PLN')}). To powyżej zalecanego minimum 15%!`
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
          desc: `Twoje wydatki w tym miesiącu przewyższyły przychody o ${formatMoney(Math.abs(savings), profile.currency || 'PLN')}. Przejrzyj kategorie Rozrywka i Inne, aby znaleźć oszczędności.`
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
        desc: `Kategoria "${topCategory.name}" stanowi ${topCategory.pctOfExpense}% wszystkich Twoich wydatków w tym miesiącu (${formatMoney(topCategory.spent, profile.currency || 'PLN')}).`
      });
    }

    // MoM Expense Change
    if (lastMonthExpense > 0) {
      if (expenseChange > 5) {
        insights.push({
          type: "warning",
          title: "Wzrost wydatków",
          desc: `Wydałeś w tym miesiącu o ${expenseChange}% więcej niż w zeszłym (${formatMoney(totalExpense, profile.currency || 'PLN')} vs ${formatMoney(lastMonthExpense, profile.currency || 'PLN')}). Zwróć uwagę na rosnące koszty.`
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
  }, [totalIncome, savingsRate, savings, categorySummary, totalPlannedBudget, totalActualSpent, lastMonthExpense, expenseChange, totalExpense, profile.currency]);

  return (
    <div className="space-y-6 pb-12" id="analysis-view-container">
      {/* Report download header */}
      <div className="bg-brand-subtle border border-brand/20 p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-brand truncate" title="Miesięczny Raport PDF">Miesięczny Raport PDF</h2>
          <p className="text-xs text-text-main mt-1 max-w-xl">
            Pobierz oficjalny, zoptymalizowany i przejrzyście sformatowany dokument PDF zawierający pełną strukturę Twoich wydatków, stan opłat i oszczędności w wybranym miesiącu. Idealny do wydruku lub archiwizacji.
          </p>
        </div>
        <button
          onClick={() => generateReportPdf(profile, currentYear, currentMonthIdx, profile.currency || "PLN")}
          className="bg-surface text-brand border border-border font-bold py-2.5 px-6 rounded-xl hover:bg-surface-2 active:scale-[0.98] transition-all shadow-sm self-start md:self-auto text-sm shrink-0 whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          id="btn-download-pdf-report"
          title="Pobierz raport (PDF)"
        >
          📥 Pobierz raport (PDF)
        </button>
      </div>

      {/* 50/30/20 Rule Breakdown Section */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                Reguła 50 / 30 / 20 (Wzorzec Budżetowy)
              </h3>
              <p className="text-xs text-text-muted">
                Zalecany podział: 50% Potrzeby (rachunki, jedzenie, dom), 30% Zachcianki (rozrywka, wyjścia), 20% Oszczędności i spłata długu.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-surface-2 px-2.5 py-1 rounded-md text-text-muted shrink-0">
            Suma wydatków: {formatMoney(breakdown503020.totalExpense, profile.currency || "PLN")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Needs (50%) */}
          <div className="p-4 rounded-xl border border-border bg-surface-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-text-main">🟢 Potrzeby (Needs)</span>
              <span className="text-text-muted font-bold">Cel: 50%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-brand">{breakdown503020.needs.percentage}%</span>
              <span className="text-xs font-bold text-text-muted">
                {formatMoney(breakdown503020.needs.amount, profile.currency || "PLN")}
              </span>
            </div>
            <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(100, breakdown503020.needs.percentage)}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  breakdown503020.needs.percentage > 60 ? "bg-warning" : "bg-brand"
                }`}
              />
            </div>
          </div>

          {/* Wants (30%) */}
          <div className="p-4 rounded-xl border border-border bg-surface-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-text-main">🔵 Zachcianki (Wants)</span>
              <span className="text-text-muted font-bold">Cel: 30%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-indigo-400">{breakdown503020.wants.percentage}%</span>
              <span className="text-xs font-bold text-text-muted">
                {formatMoney(breakdown503020.wants.amount, profile.currency || "PLN")}
              </span>
            </div>
            <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(100, breakdown503020.wants.percentage)}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  breakdown503020.wants.percentage > 40 ? "bg-danger" : "bg-indigo-400"
                }`}
              />
            </div>
          </div>

          {/* Savings (20%) */}
          <div className="p-4 rounded-xl border border-border bg-surface-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-text-main">🟣 Oszczędności i Dług (Savings)</span>
              <span className="text-text-muted font-bold">Cel: 20%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-purple-400">{breakdown503020.savings.percentage}%</span>
              <span className="text-xs font-bold text-text-muted">
                {formatMoney(breakdown503020.savings.amount, profile.currency || "PLN")}
              </span>
            </div>
            <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(100, breakdown503020.savings.percentage)}%` }}
                className="h-full rounded-full bg-purple-400 transition-all duration-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Analysis body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advice and alerts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-text-main">Miesięczny przegląd (bez AI)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 min-w-0">
              <div className="p-3 bg-surface rounded-xl min-w-0">
                <p className="text-xs uppercase text-text-muted font-bold mb-1 truncate" title="Przychody">Przychody</p>
                <p className="text-sm font-bold text-brand truncate" title={formatMoney(monthlyDigest.totalIncome, profile.currency || 'PLN')}>{formatMoney(monthlyDigest.totalIncome, profile.currency || 'PLN')}</p>
              </div>
              <div className="p-3 bg-surface rounded-xl min-w-0">
                <p className="text-xs uppercase text-text-muted font-bold mb-1 truncate" title="Wydatki">Wydatki</p>
                <p className="text-sm font-bold text-danger truncate" title={formatMoney(monthlyDigest.totalExpenses, profile.currency || 'PLN')}>{formatMoney(monthlyDigest.totalExpenses, profile.currency || 'PLN')}</p>
              </div>
              <div className="p-3 bg-surface rounded-xl min-w-0">
                <p className="text-xs uppercase text-text-muted font-bold mb-1 truncate" title="Bilans">Bilans</p>
                <p className={`text-sm font-bold truncate ${monthlyDigest.balance >= 0 ? "text-brand" : "text-danger"}`} title={formatMoney(monthlyDigest.balance, profile.currency || 'PLN')}>
                  {formatMoney(monthlyDigest.balance, profile.currency || 'PLN')}
                </p>
              </div>
              <div className="p-3 bg-surface rounded-xl min-w-0">
                <p className="text-xs uppercase text-text-muted font-bold mb-1 truncate" title="Oszczędności">Oszczędności</p>
                <p className="text-sm font-bold text-text-muted truncate" title={monthlyDigest.savingsRate !== null ? `${Math.round(monthlyDigest.savingsRate)}%` : "-"}>
                  {monthlyDigest.savingsRate !== null ? `${Math.round(monthlyDigest.savingsRate)}%` : "-"}
                </p>
              </div>
            </div>
            <div className="p-4 bg-surface border border-border rounded-xl text-text-main text-sm leading-relaxed">
              {monthlyDigest.summaryText}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-text-main">Wnioski i podpowiedzi</h3>
          <div className="space-y-3">
            {insightsList.map((ins, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition min-w-0 ${
                  ins.type === "success"
                    ? "bg-brand-subtle border-brand/20 text-brand"
                    : ins.type === "warning"
                    ? "bg-danger-subtle border-danger/20 text-danger"
                    : "bg-surface-2 border-border text-text-muted"
                }`}
              >
                <span className="text-lg shrink-0">
                  {ins.type === "success" ? "✓" : ins.type === "warning" ? "⚠️" : "💡"}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-1 truncate" title={ins.title}>{ins.title}</h4>
                  <p className="text-xs leading-relaxed">{ins.desc}</p>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Breakdown box */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4 gap-4 min-w-0">
            <h3 className="text-sm font-bold text-text-main truncate" title="Struktura wydatków">Struktura wydatków</h3>
            <div className="relative shrink-0">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-main active:scale-[0.98] transition-all bg-surface px-2.5 py-1.5 rounded-xl border border-border shrink-0 whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                title="Dostosuj"
              >
                <Settings2 className="w-3.5 h-3.5 shrink-0" />
                Dostosuj
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-xl z-10 overflow-hidden">
                  <div className="p-3 bg-surface border-b border-border text-xs font-bold text-text-muted">
                    Widoczne kategorie
                  </div>
                  <div className="p-2 space-y-1">
                    {expenseCategories.map(cat => {
                      const isVisible = userToggles[cat] !== undefined 
                        ? userToggles[cat] 
                        : expenseTxs.some(t => t.category === cat && t.amount > 0);
                      
                      return (
                        <label key={cat} className="flex items-center gap-2.5 p-2 hover:bg-surface rounded-xl cursor-pointer min-w-0 focus-within:ring-2 focus-within:ring-focus-ring">
                          <input 
                            type="checkbox" 
                            className="sr-only"
                            checked={isVisible}
                            onChange={(e) => setUserToggles(prev => ({ ...prev, [cat]: e.target.checked }))}
                          />
                          <div className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${isVisible ? 'bg-brand border-brand text-text-inverse' : 'border-border'}`}>
                            {isVisible && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-xs text-text-muted truncate block" title={cat}>{cat}</span>
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
              <p className="text-xs text-text-muted italic text-center py-4">Brak widocznych kategorii w wybranym miesiącu.</p>
            ) : (
              categorySummary.map((cat) => {
                const hasLimit = cat.limit > 0;
                const limitPct = hasLimit ? (cat.spent / cat.limit) * 100 : 0;
                
                let barColor = "bg-surface-2";
                let badgeClass = "";
                let badgeText = "";
                
                if (hasLimit) {
                  if (limitPct > 100) {
                    barColor = "bg-danger";
                    badgeClass = "bg-danger-subtle text-danger border-danger/20";
                    badgeText = "Przekroczony";
                  } else if (limitPct >= 80) {
                    barColor = "bg-warning";
                    badgeClass = "bg-warning-subtle text-warning border-warning/20";
                    badgeText = "Uwaga";
                  } else {
                    barColor = "bg-brand";
                    badgeClass = "bg-brand-subtle text-brand border-brand/20";
                    badgeText = "W normie";
                  }
                }

                return (
                <div key={cat.name} className="space-y-2">
                  <div className="flex justify-between items-end text-xs gap-3 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-text-muted font-bold truncate block" title={cat.name}>{cat.name}</span>
                      {hasLimit && (
                        <span 
                          className={`text-xs px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider shrink-0 truncate max-w-[80px] ${badgeClass}`}
                          title={badgeText}
                        >
                          {badgeText}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0 whitespace-nowrap">
                      <strong className={`whitespace-nowrap ${hasLimit && limitPct > 100 ? "text-danger" : "text-text-muted"}`} title={formatMoney(cat.spent, profile.currency || 'PLN')}>
                        {formatMoney(cat.spent, profile.currency || 'PLN')}
                      </strong>
                      <span className="text-text-muted ml-1" title={hasLimit ? `z ${formatMoney(cat.limit, profile.currency || 'PLN')}` : `(${cat.pctOfExpense}%)`}>
                        {hasLimit ? `z ${formatMoney(cat.limit, profile.currency || 'PLN')}` : `(${cat.pctOfExpense}%)`}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${cat.pctOfExpense}%` }}
                      className={`${barColor} h-full rounded-full transition-all duration-300`}
                    ></div>
                  </div>
                </div>
              )})
            )}
          </div>

          {totalIncome > 0 && (
            <div className="border-t border-border mt-5 pt-4 min-w-0">
              <h4 className="text-xs font-bold text-text-main mb-2 truncate" title="Stopa oszczędności">Stopa oszczędności</h4>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-16 h-16 rounded-full border-4 border-brand/20 flex items-center justify-center font-bold text-brand text-sm flex-shrink-0">
                  {savingsRate}%
                </div>
                <p className="text-xs text-text-muted leading-relaxed min-w-0">
                  Zabezpieczasz <strong>{formatMoney(savings, profile.currency || 'PLN')}</strong> z miesięcznych przychodów rzędu <strong>{formatMoney(totalIncome, profile.currency || 'PLN')}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
