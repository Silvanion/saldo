import React, { useMemo, useState, useEffect } from "react";
import { Profile, RecurringRule } from "../types";
import { getMonthName, expenseCategories, budgetCategories } from "../utils";
import {
  Settings2,
  Check,
  Scale,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CreditCard,
  Target,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ArrowLeftRight,
  X,
  ExternalLink,
  ChevronRight,
  Eye,
  Calendar
} from "lucide-react";
import { generateMonthlyDigest } from "../services/monthlyDigest";
import {
  calculate503020,
  calculateRollingTrends,
  calculateEmergencySimulator,
  calculateDebtPayoffSimulator,
  calculatePeriodComparison
} from "../services/budgetCalculations";
import { formatMoney } from "../utils/format";
import { CashflowForecastSection } from "./analysis/CashflowForecastSection";
import { FinancialHealthSection } from "./analysis/FinancialHealthSection";

interface AnalysisViewProps {
  profile: Profile;
  selectedDate: Date;
  recurringRules?: RecurringRule[];
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onChangeView?: (view: string) => void;
  onOpenExportReports?: (tab?: "pdf" | "csv" | "backup") => void;
}

export function AnalysisView({ profile, selectedDate, recurringRules = [], showToast, onChangeView, onOpenExportReports }: AnalysisViewProps) {
  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();
  const monthName = getMonthName(currentMonthIdx);

  // Strategic simulator mode ("cushion" vs "debt")
  const [simulatorMode, setSimulatorMode] = useState<"cushion" | "debt">("cushion");

  // Emergency cushion target (3, 6, 12 months)
  const [targetMonths, setTargetMonths] = useState<3 | 6 | 12>(6);

  // Debt extra payment amount
  const [extraDebtPayment, setExtraDebtPayment] = useState<number>(300);

  // Period comparison toggle
  const [isComparisonOpen, setIsComparisonOpen] = useState(true);

  // Drilldown state
  const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null);

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

  // Rolling multi-month trends & drivers
  const rollingTrends = useMemo(() => {
    return calculateRollingTrends(profile.transactions, selectedDate);
  }, [profile.transactions, selectedDate]);

  // Emergency cushion simulator
  const emergencySim = useMemo(() => {
    return calculateEmergencySimulator(profile, selectedDate, targetMonths);
  }, [profile, selectedDate, targetMonths]);

  // Debt payoff simulator
  const debtSim = useMemo(() => {
    return calculateDebtPayoffSimulator(profile, selectedDate, extraDebtPayment);
  }, [profile, selectedDate, extraDebtPayment]);

  const periodComparison = useMemo(() => {
    return calculatePeriodComparison(profile.transactions, selectedDate);
  }, [profile.transactions, selectedDate]);

  const drillDownTransactions = useMemo(() => {
    if (!drillDownCategory) return [];
    if (drillDownCategory === "__ALL_EXPENSES__") return expenseTxs;
    if (drillDownCategory === "__ALL_INCOMES__") return incomeTxs;
    return thisMonthTransactions.filter((t) => t.category === drillDownCategory);
  }, [drillDownCategory, thisMonthTransactions, expenseTxs, incomeTxs]);

  // Category expense breakdown
  const categorySummary = useMemo(() => {
    return expenseCategories
      .map((cat) => {
        const spent = expenseTxs.filter((t) => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
        const limit = profile.budgets[cat] || 0;
        return {
          name: cat,
          spent,
          limit
        };
      })
      .filter((cat) => {
        const userToggle = userToggles[cat.name];
        if (userToggle === true) return true;
        if (userToggle === false) return false;
        return cat.spent > 0;
      })
      .map((cat) => ({
        ...cat,
        pctOfExpense: totalExpense > 0 ? Math.round((cat.spent / totalExpense) * 100) : 0
      }))
      .sort((a, b) => b.spent - a.spent);
  }, [expenseTxs, profile.budgets, totalExpense, userToggles]);

  const totalPlannedBudget = useMemo(() => {
    return budgetCategories.reduce((s, c) => s + (profile.budgets[c] || 0), 0);
  }, [profile.budgets]);

  const totalActualSpent = useMemo(() => {
    return budgetCategories.reduce(
      (s, c) => s + expenseTxs.filter((t) => t.category === c).reduce((sum, t) => sum + t.amount, 0),
      0
    );
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
          desc: `Oszczędzasz obecnie ${savingsRate}% swoich dochodów (${formatMoney(savings, profile.currency || "PLN")}). To powyżej zalecanego minimum 15%!`
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
          desc: `Twoje wydatki w tym miesiącu przewyższyły przychody o ${formatMoney(Math.abs(savings), profile.currency || "PLN")}. Przejrzyj kategorie Rozrywka i Inne, aby znaleźć oszczędności.`
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
        desc: `Kategoria "${topCategory.name}" stanowi ${topCategory.pctOfExpense}% wszystkich Twoich wydatków w tym miesiącu (${formatMoney(topCategory.spent, profile.currency || "PLN")}).`
      });
    }

    // MoM Expense Change
    if (rollingTrends.lastMonthExpense > 0) {
      if (rollingTrends.diffVsLastMonth > 5) {
        insights.push({
          type: "warning",
          title: "Wzrost wydatków MoM",
          desc: `Wydałeś w tym miesiącu o ${rollingTrends.diffVsLastMonth}% więcej niż w poprzednim (${formatMoney(totalExpense, profile.currency || "PLN")} vs ${formatMoney(rollingTrends.lastMonthExpense, profile.currency || "PLN")}).`
        });
      } else if (rollingTrends.diffVsLastMonth < -5) {
        insights.push({
          type: "success",
          title: "Redukcja wydatków MoM",
          desc: `Udało Ci się obniżyć wydatki o ${Math.abs(rollingTrends.diffVsLastMonth)}% w porównaniu do poprzedniego miesiąca. Świetna robota!`
        });
      }
    }

    // Budget overruns alert
    const overruns = categorySummary.filter((c) => c.limit > 0 && c.spent > c.limit);
    if (overruns.length > 0) {
      insights.push({
        type: "warning",
        title: "Przekroczone limity budżetowe",
        desc: `Przekroczyłeś limity w następujących kategoriach: ${overruns.map((o) => o.name).join(", ")}.`
      });
    } else if (totalPlannedBudget > 0 && totalActualSpent <= totalPlannedBudget) {
      insights.push({
        type: "success",
        title: "Budżety pod pełną kontrolą!",
        desc: "Gratulacje! Wszystkie kategorie mieszczą się w wyznaczonych limitach budżetowych."
      });
    }

    return insights;
  }, [
    totalIncome,
    savingsRate,
    savings,
    categorySummary,
    totalPlannedBudget,
    totalActualSpent,
    rollingTrends,
    totalExpense,
    profile.currency
  ]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 animate-fade-in" id="analysis-view-container">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider mb-0.5">Inteligencja Finansowa</p>
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-text-main truncate">Analiza i Prognozy ({monthName} {currentYear})</h2>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0 w-full md:w-auto mt-3 md:mt-0 md:justify-end">
          <button
            onClick={async () => {
              if (onOpenExportReports) {
                onOpenExportReports("pdf");
                return;
              }
              try {
                const { generateReportPdf } = await import("../services/pdfGenerator");
                generateReportPdf(profile, currentYear, currentMonthIdx, profile.currency || "PLN");
              } catch (err) {
                console.error("PDF generation failed:", err);
                showToast?.("Nie udało się wygenerować raportu PDF. Spróbuj ponownie za chwilę.", "error");
              }
            }}
            className="w-full sm:w-auto bg-surface hover:bg-surface-offset text-text-muted hover:text-text-main border border-border font-bold py-2.5 sm:py-2 px-4 rounded-xl active:scale-[0.98] transition-all shadow-xs text-sm sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-download-pdf-report"
            title="Pobierz oficjalny raport PDF za wybrany miesiąc"
          >
            <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-brand" />
            <span>Eksportuj raport PDF</span>
          </button>
        </div>
      </div>

      {/* Financial Health Score & Alerts Section */}
      <FinancialHealthSection
        profile={profile}
        recurringRules={recurringRules}
        selectedDate={selectedDate}
      />

      {/* 50/30/20 Rule Breakdown Section */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5" id="breakdown-50-30-20-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border pb-3 sm:pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
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
          <span className="text-xs font-bold tabular-nums bg-surface-2 px-2.5 py-1 rounded-lg text-text-muted border border-border shrink-0 shadow-xs self-start sm:self-auto">
            Suma wydatków: <span className="text-text-main font-black">{formatMoney(breakdown503020.totalExpense, profile.currency || "PLN")}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Needs (50%) */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-surface-2 space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                <span className="font-bold text-text-main truncate">Potrzeby (Needs)</span>
              </div>
              <span className="text-text-muted font-bold tabular-nums shrink-0">Cel: 50%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black tabular-nums text-brand">{breakdown503020.needs.percentage}%</span>
              <span className="text-xs font-bold tabular-nums text-text-muted">
                {formatMoney(breakdown503020.needs.amount, profile.currency || "PLN")}
              </span>
            </div>
            <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-border/50" role="progressbar" aria-valuenow={breakdown503020.needs.percentage} aria-valuemin={0} aria-valuemax={100}>
              <div
                style={{ width: `${Math.min(100, breakdown503020.needs.percentage)}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  breakdown503020.needs.percentage > 60 ? "bg-warning" : "bg-brand"
                }`}
              />
            </div>
          </div>

          {/* Wants (30%) */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-surface-2 space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-text-muted shrink-0" />
                <span className="font-bold text-text-main truncate">Zachcianki (Wants)</span>
              </div>
              <span className="text-text-muted font-bold tabular-nums shrink-0">Cel: 30%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black tabular-nums text-text-main">{breakdown503020.wants.percentage}%</span>
              <span className="text-xs font-bold tabular-nums text-text-muted">
                {formatMoney(breakdown503020.wants.amount, profile.currency || "PLN")}
              </span>
            </div>
            <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-border/50" role="progressbar" aria-valuenow={breakdown503020.wants.percentage} aria-valuemin={0} aria-valuemax={100}>
              <div
                style={{ width: `${Math.min(100, breakdown503020.wants.percentage)}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  breakdown503020.wants.percentage > 40 ? "bg-danger" : "bg-text-muted"
                }`}
              />
            </div>
          </div>

          {/* Savings (20%) */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-surface-2 space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                <span className="font-bold text-text-main truncate">Oszczędności i Dług (Savings)</span>
              </div>
              <span className="text-text-muted font-bold tabular-nums shrink-0">Cel: 20%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black tabular-nums text-brand">{breakdown503020.savings.percentage}%</span>
              <span className="text-xs font-bold tabular-nums text-text-muted">
                {formatMoney(breakdown503020.savings.amount, profile.currency || "PLN")}
              </span>
            </div>
            <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-border/50" role="progressbar" aria-valuenow={breakdown503020.savings.percentage} aria-valuemin={0} aria-valuemax={100}>
              <div
                style={{ width: `${Math.min(100, breakdown503020.savings.percentage)}%` }}
                className="h-full rounded-full bg-brand transition-all duration-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Rolling Trends (Left) & Strategic Simulators (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Card 1: Multi-Month Rolling Trends & Category Drivers */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4" id="rolling-trends-card">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-main">Trendy wielomiesięczne</h3>
                <p className="text-[11px] text-text-muted">Średnie kroczące i dynamika zmian kosztów</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-text-faint bg-surface-2 border border-border px-2 py-0.5 rounded tabular-nums shadow-xs">
              Historia: {rollingTrends.historicalMonthsCount} mc
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div className="p-3 bg-surface-2 rounded-xl border border-border shadow-xs">
              <span className="text-[10px] sm:text-[11px] text-text-faint font-medium block truncate">Średnia krocząca (3M)</span>
              <span className="text-sm font-black text-text-main mt-0.5 block tabular-nums truncate">
                {formatMoney(rollingTrends.avg3MonthExpense, profile.currency || "PLN")}
              </span>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-bold tabular-nums truncate">
                {rollingTrends.diffVs3MAvg > 0 ? (
                  <span className="text-danger flex items-center gap-0.5 truncate">
                    <ArrowUpRight className="w-3 h-3 shrink-0" /> +{rollingTrends.diffVs3MAvg}% vs śr.
                  </span>
                ) : (
                  <span className="text-brand flex items-center gap-0.5 truncate">
                    <ArrowDownRight className="w-3 h-3 shrink-0" /> {rollingTrends.diffVs3MAvg}% vs śr.
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-surface-2 rounded-xl border border-border shadow-xs">
              <span className="text-[10px] sm:text-[11px] text-text-faint font-medium block truncate">Wydatki zeszły mc</span>
              <span className="text-sm font-black text-text-main mt-0.5 block tabular-nums truncate">
                {formatMoney(rollingTrends.lastMonthExpense, profile.currency || "PLN")}
              </span>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-bold tabular-nums truncate">
                {rollingTrends.diffVsLastMonth > 0 ? (
                  <span className="text-danger flex items-center gap-0.5 truncate">
                    <ArrowUpRight className="w-3 h-3 shrink-0" /> +{rollingTrends.diffVsLastMonth}% MoM
                  </span>
                ) : (
                  <span className="text-brand flex items-center gap-0.5 truncate">
                    <ArrowDownRight className="w-3 h-3 shrink-0" /> {rollingTrends.diffVsLastMonth}% MoM
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Category Drivers */}
          <div className="pt-2 space-y-2">
            <span className="text-[11px] font-bold text-text-faint uppercase tracking-wider block">
              Główne sterowniki zmian (vs poprzedni mc)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {rollingTrends.topGrowthCategory ? (
                <div className="p-2.5 bg-danger-subtle/50 border border-danger/20 rounded-xl flex items-center justify-between shadow-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-danger uppercase tracking-wider block">Wzrost kosztów</span>
                    <span className="text-xs font-bold text-text-main truncate block">{rollingTrends.topGrowthCategory.category}</span>
                  </div>
                  <span className="text-xs font-black text-danger shrink-0 ml-2 tabular-nums">
                    +{formatMoney(rollingTrends.topGrowthCategory.diffAmount, profile.currency || "PLN")}
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-bg-base/30 border border-dashed border-border rounded-xl text-center text-xs text-text-faint">
                  Brak wzrostów w kategoriach
                </div>
              )}

              {rollingTrends.topReductionCategory ? (
                <div className="p-2.5 bg-brand-subtle/50 border border-brand/20 rounded-xl flex items-center justify-between shadow-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">Oszczędność</span>
                    <span className="text-xs font-bold text-text-main truncate block">{rollingTrends.topReductionCategory.category}</span>
                  </div>
                  <span className="text-xs font-black text-brand shrink-0 ml-2 tabular-nums">
                    {formatMoney(rollingTrends.topReductionCategory.diffAmount, profile.currency || "PLN")}
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-bg-base/30 border border-dashed border-border rounded-xl text-center text-xs text-text-faint">
                  Brak redukcji w kategoriach
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Interactive Strategic Simulator (Poduszka vs Spłata Zobowiązań) */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4" id="strategic-simulator-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
                {simulatorMode === "cushion" ? <ShieldCheck className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-main">Symulator strategiczny</h3>
                <p className="text-[11px] text-text-muted">
                  {simulatorMode === "cushion" ? "Kalkulator rezerwy bezpieczeństwa" : "Plan i kaskada spłaty zadłużenia"}
                </p>
              </div>
            </div>

            {/* Mode selector segmented toggle */}
            <div className="flex bg-surface-2 p-1 rounded-xl border border-border w-full sm:w-auto shadow-xs">
              <button
                onClick={() => setSimulatorMode("cushion")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  simulatorMode === "cushion"
                    ? "bg-surface text-brand shadow-xs border border-border"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Poduszka</span>
              </button>
              <button
                onClick={() => setSimulatorMode("debt")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  simulatorMode === "debt"
                    ? "bg-surface text-brand shadow-xs border border-border"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Spłata długu</span>
              </button>
            </div>
          </div>

          {/* MODE 1: EMERGENCY CUSHION SIMULATOR */}
          {simulatorMode === "cushion" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-faint uppercase tracking-wider">Docelowy horyzont:</span>
                <div className="flex bg-surface-2 p-0.5 rounded-lg border border-border shadow-xs">
                  {([3, 6, 12] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTargetMonths(m)}
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        targetMonths === m
                          ? "bg-brand text-text-inverse shadow-xs"
                          : "text-text-muted hover:text-text-main"
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-[11px] text-text-faint font-medium block">Wymagany kapitał ({targetMonths} mc)</span>
                  <span className="text-lg font-black text-text-main tabular-nums">
                    {formatMoney(emergencySim.requiredCapital, profile.currency || "PLN")}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-text-faint font-medium block">Płynne rezerwy</span>
                  <span className="text-sm font-bold text-brand tabular-nums">
                    {formatMoney(emergencySim.currentLiquidCapital, profile.currency || "PLN")} ({emergencySim.progressPercent}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-2 h-2.5 rounded-full overflow-hidden border border-border/50" role="progressbar" aria-valuenow={emergencySim.progressPercent} aria-valuemin={0} aria-valuemax={100}>
                <div
                  style={{ width: `${emergencySim.progressPercent}%` }}
                  className="h-full rounded-full bg-brand transition-all duration-500"
                />
              </div>

              {/* Forecast Message / Status */}
              <div className="p-3 rounded-xl border border-border bg-surface-2 flex items-start gap-2.5 text-xs shadow-xs">
                <Clock className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  {emergencySim.status === "completed" ? (
                    <span className="font-bold text-brand flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand shrink-0" />
                      <span>Gratulacje! Twoje płynne rezerwy w 100% pokrywają poduszkę bezpieczeństwa na {targetMonths} miesięcy!</span>
                    </span>
                  ) : emergencySim.monthsToTarget !== null ? (
                    <span>
                      Brakująca kwota: <strong className="tabular-nums">{formatMoney(emergencySim.shortfall, profile.currency || "PLN")}</strong>. 
                      Przy aktualnym tempie oszczędzania (+<span className="tabular-nums">{formatMoney(emergencySim.currentMonthlySavings, profile.currency || "PLN")}</span>/mc) 
                      cel osiągniesz za ok. <strong className="text-brand tabular-nums">{emergencySim.monthsToTarget} {emergencySim.monthsToTarget === 1 ? "miesiąc" : emergencySim.monthsToTarget < 5 ? "miesiące" : "miesięcy"}</strong>.
                    </span>
                  ) : emergencySim.status === "deficit" ? (
                    <span className="text-danger font-medium">
                      W bieżącym miesiącu występuje deficyt budżetowy. Zredukuj koszty, aby wznowić budowanie poduszki.
                    </span>
                  ) : (
                    <span className="text-text-muted">
                      Brak nadwyżki finansowej w tym miesiącu. Wprowadź oszczędności, aby zobaczyć prognozę osiągnięcia celu.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: DEBT PAYOFF SIMULATOR (SNOWBALL & ACCELERATION) */}
          {simulatorMode === "debt" && (
            <div className="space-y-4" id="debt-payoff-simulator-section">
              {debtSim.isDebtFree ? (
                <div className="p-6 bg-brand-subtle/40 border border-brand/20 rounded-xl text-center space-y-2 shadow-xs" id="debt-simulator-empty-state">
                  <Sparkles className="w-6 h-6 text-brand mx-auto" />
                  <p className="font-bold text-sm text-text-main">Brak aktywnych zobowiązań</p>
                  <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                    Wszystkie rachunki są opłacone i brak wykorzystanych limitów kredytowych. Symulator aktywuje się automatycznie, gdy pojawią się nieopłacone płatności lub limity na rachunkach.
                  </p>
                </div>
              ) : (
                <>
                  {/* Strategy Badge & Headline */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                    <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">
                      Plan spłaty zobowiązań
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-subtle text-brand border border-brand/20 uppercase tracking-wider shrink-0">
                      Strategia: Kula śnieżna (Snowball)
                    </span>
                  </div>

                  {/* 4 KPI Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    <div className="p-3 bg-surface-2 rounded-xl border border-border shadow-xs">
                      <span className="text-[10px] sm:text-[11px] text-text-faint font-medium block truncate">
                        Łączne zobowiązania
                      </span>
                      <span className="text-sm sm:text-base font-black text-danger tabular-nums block mt-0.5 truncate" id="kpi-debt-total">
                        {formatMoney(debtSim.totalDebt, profile.currency || "PLN")}
                      </span>
                    </div>

                    <div className="p-3 bg-surface-2 rounded-xl border border-border shadow-xs">
                      <span className="text-[10px] sm:text-[11px] text-text-faint font-medium block truncate">
                        Liczba pozycji
                      </span>
                      <span className="text-sm sm:text-base font-black text-text-main tabular-nums block mt-0.5 truncate" id="kpi-debt-count">
                        {debtSim.debtItemsCount} {debtSim.debtItemsCount === 1 ? "pozycja" : debtSim.debtItemsCount < 5 ? "pozycje" : "pozycji"}
                      </span>
                    </div>

                    <div className="p-3 bg-surface-2 rounded-xl border border-border shadow-xs">
                      <span className="text-[10px] sm:text-[11px] text-text-faint font-medium block truncate">
                        Szacowany czas
                      </span>
                      <span className="text-sm sm:text-base font-black text-brand tabular-nums block mt-0.5 truncate" id="kpi-debt-time">
                        {debtSim.acceleratedMonths} {debtSim.acceleratedMonths === 1 ? "miesiąc" : debtSim.acceleratedMonths! < 5 ? "miesiące" : "miesięcy"}
                      </span>
                    </div>

                    <div className="p-3 bg-surface-2 rounded-xl border border-border shadow-xs">
                      <span className="text-[10px] sm:text-[11px] text-text-faint font-medium block truncate">
                        Oszczędność czasu
                      </span>
                      <span className="text-sm sm:text-base font-black text-success tabular-nums block mt-0.5 truncate" id="kpi-debt-saved">
                        {debtSim.monthsSaved > 0 ? `-${debtSim.monthsSaved} mc` : "0 mc"}
                      </span>
                    </div>
                  </div>

                  {/* Extra Payment Control */}
                  <div className="p-3 bg-surface-2 rounded-xl border border-border space-y-2 shadow-xs">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-text-main flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-brand" /> Nadpłata miesięczna:
                      </span>
                      <span className="font-bold text-brand text-xs tabular-nums">
                        +{formatMoney(extraDebtPayment, profile.currency || "PLN")}/mc
                      </span>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2">
                      {[0, 100, 300, 500, 1000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setExtraDebtPayment(val)}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer shadow-xs tabular-nums text-center focus-visible:ring-2 focus-visible:ring-focus-ring ${
                            extraDebtPayment === val
                              ? "bg-brand text-text-inverse border-brand"
                              : "bg-surface text-text-muted border-border hover:bg-surface-offset hover:text-text-main"
                          }`}
                          id={`btn-extra-payment-${val}`}
                        >
                          {val === 0 ? "Brak" : `+${val}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scenario Comparison Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 bg-surface rounded-xl border border-border shadow-xs space-y-1">
                      <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider block">
                        Scenariusz bazowy (Bez nadpłaty)
                      </span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-black text-text-main tabular-nums">
                          {debtSim.baselineMonths} {debtSim.baselineMonths === 1 ? "miesiąc" : debtSim.baselineMonths! < 5 ? "miesiące" : "miesięcy"}
                        </span>
                        <span className="text-xs text-text-muted tabular-nums">
                          {formatMoney(debtSim.baselineMonthlyPayment, profile.currency || "PLN")}/mc
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-brand-subtle/50 rounded-xl border border-brand/30 shadow-xs space-y-1">
                      <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">
                        Scenariusz przyspieszony (Z nadpłatą)
                      </span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-black text-brand tabular-nums">
                          {debtSim.acceleratedMonths} {debtSim.acceleratedMonths === 1 ? "miesiąc" : debtSim.acceleratedMonths! < 5 ? "miesiące" : "miesięcy"}
                        </span>
                        <span className="text-xs text-brand font-bold tabular-nums">
                          {formatMoney(debtSim.acceleratedMonthlyPayment, profile.currency || "PLN")}/mc
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Snowball Queue Preview */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-text-faint uppercase tracking-wider block">
                      Kolejność spłaty (Kula Śnieżna — od najmniejszych sald):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {debtSim.snowballQueue.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2 border border-border shadow-xs min-w-0"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-surface border border-border text-[11px] font-bold text-text-muted flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-text-main truncate" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <span className="text-xs font-black text-danger tabular-nums shrink-0 ml-2">
                            {formatMoney(item.amount, profile.currency || "PLN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payoff Acceleration Insight */}
                  <div className="p-3.5 rounded-xl border border-brand/20 bg-brand-subtle/50 flex items-start gap-2.5 text-xs shadow-xs">
                    <Clock className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <div className="leading-relaxed text-text-main">
                      Plan bazowy: <strong className="tabular-nums">{debtSim.baselineMonths} mc</strong>. 
                      Z wybraną nadpłatą spłacisz całość w <strong className="text-brand tabular-nums">{debtSim.acceleratedMonths} mc</strong>. 
                      {debtSim.monthsSaved > 0 ? (
                        <span className="block font-bold text-brand mt-1 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-brand shrink-0" />
                          <span>Zyskujesz <span className="tabular-nums">{debtSim.monthsSaved}</span> {debtSim.monthsSaved === 1 ? "miesiąc" : debtSim.monthsSaved < 5 ? "miesiące" : "miesięcy"} wolności finansowej!</span>
                        </span>
                      ) : (
                        <span className="block text-text-muted mt-0.5">
                          Zwiększ nadpłatę, aby zobaczyć skrócenie czasu spłaty.
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cashflow Forecast 30/60/90 Days Section */}
      <CashflowForecastSection profile={profile} recurringRules={recurringRules} />

      {/* Analysis body: Monthly Digest (Left) & Category Structure (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advice and alerts */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Monthly Operational Review & Period Comparison */}
          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-text-main uppercase tracking-wider">Miesięczny przegląd operacyjny</h3>
                <p className="text-xs text-text-muted">Porównanie z poprzednim okresem: <strong>{periodComparison.previousPeriodLabel}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setIsComparisonOpen(!isComparisonOpen)}
                className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1.5 self-start sm:self-auto py-1 px-2.5 rounded-lg hover:bg-surface-2 transition-colors border border-border/60"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>{isComparisonOpen ? "Zwiń porównanie" : "Pokaż porównanie MoM"}</span>
              </button>
            </div>

            {/* Metric Cards with MoM Deltas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 min-w-0">
              {/* Income Card */}
              <div
                onClick={() => setDrillDownCategory("__ALL_INCOMES__")}
                className="p-3 bg-surface-2 hover:bg-surface-3 border border-border rounded-xl min-w-0 shadow-xs cursor-pointer group transition-all"
                title="Kliknij, aby rozbić przychody na transakcje"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-[10px] sm:text-[11px] uppercase text-text-faint font-bold truncate">Przychody</p>
                  <Eye className="w-3 h-3 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs sm:text-sm font-black text-brand tabular-nums truncate" title={formatMoney(monthlyDigest.totalIncome, profile.currency || "PLN")}>
                  {formatMoney(monthlyDigest.totalIncome, profile.currency || "PLN")}
                </p>
                {periodComparison.income.previous > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-bold tabular-nums">
                    <span className={`px-1 py-0.2 rounded ${periodComparison.income.diffAmount >= 0 ? "bg-brand-subtle text-brand" : "bg-danger-subtle text-danger"}`}>
                      {periodComparison.income.diffAmount >= 0 ? "+" : ""}{periodComparison.income.diffPercent}%
                    </span>
                    <span className="text-text-faint font-normal truncate">MoM</span>
                  </div>
                )}
              </div>

              {/* Expense Card */}
              <div
                onClick={() => setDrillDownCategory("__ALL_EXPENSES__")}
                className="p-3 bg-surface-2 hover:bg-surface-3 border border-border rounded-xl min-w-0 shadow-xs cursor-pointer group transition-all"
                title="Kliknij, aby rozbić wydatki na transakcje"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-[10px] sm:text-[11px] uppercase text-text-faint font-bold truncate">Wydatki</p>
                  <Eye className="w-3 h-3 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs sm:text-sm font-black text-danger tabular-nums truncate" title={formatMoney(monthlyDigest.totalExpenses, profile.currency || "PLN")}>
                  {formatMoney(monthlyDigest.totalExpenses, profile.currency || "PLN")}
                </p>
                {periodComparison.expense.previous > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-bold tabular-nums">
                    <span className={`px-1 py-0.2 rounded ${periodComparison.expense.diffAmount <= 0 ? "bg-brand-subtle text-brand" : "bg-danger-subtle text-danger"}`}>
                      {periodComparison.expense.diffAmount > 0 ? "+" : ""}{periodComparison.expense.diffPercent}%
                    </span>
                    <span className="text-text-faint font-normal truncate">MoM</span>
                  </div>
                )}
              </div>

              {/* Balance Card */}
              <div
                onClick={() => setDrillDownCategory("__ALL_EXPENSES__")}
                className="p-3 bg-surface-2 hover:bg-surface-3 border border-border rounded-xl min-w-0 shadow-xs cursor-pointer group transition-all"
                title="Kliknij, aby zobaczyć zestawienie operacji"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-[10px] sm:text-[11px] uppercase text-text-faint font-bold truncate">Bilans</p>
                  <Eye className="w-3 h-3 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className={`text-xs sm:text-sm font-black tabular-nums truncate ${monthlyDigest.balance >= 0 ? "text-brand" : "text-danger"}`} title={formatMoney(monthlyDigest.balance, profile.currency || "PLN")}>
                  {formatMoney(monthlyDigest.balance, profile.currency || "PLN")}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-bold tabular-nums">
                  <span className={`px-1 py-0.2 rounded ${periodComparison.netFlow.diffAmount >= 0 ? "bg-brand-subtle text-brand" : "bg-danger-subtle text-danger"}`}>
                    {periodComparison.netFlow.diffAmount >= 0 ? "+" : ""}{formatMoney(periodComparison.netFlow.diffAmount, profile.currency || "PLN")}
                  </span>
                </div>
              </div>

              {/* Savings Card */}
              <div className="p-3 bg-surface-2 border border-border rounded-xl min-w-0 shadow-xs">
                <p className="text-[10px] sm:text-[11px] uppercase text-text-faint font-bold mb-1 truncate" title="Stopa oszczędności">Oszczędności</p>
                <p className="text-xs sm:text-sm font-black text-text-main tabular-nums truncate" title={monthlyDigest.savingsRate !== null ? `${Math.round(monthlyDigest.savingsRate)}%` : "-"}>
                  {monthlyDigest.savingsRate !== null ? `${Math.round(monthlyDigest.savingsRate)}%` : "-"}
                </p>
                <p className="mt-1 text-[10px] text-text-muted truncate">
                  {formatMoney(savings, profile.currency || "PLN")}
                </p>
              </div>
            </div>

            {/* Period Comparison Top Categories Breakdown */}
            {isComparisonOpen && periodComparison.topCategories.length > 0 && (
              <div className="bg-surface-2 p-3.5 rounded-xl border border-border text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-main uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-brand" /> Porównanie zmian w kategoriach ({periodComparison.previousPeriodLabel} &rarr; {periodComparison.currentPeriodLabel})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {periodComparison.topCategories.map((cat) => (
                    <div
                      key={cat.category}
                      onClick={() => setDrillDownCategory(cat.category)}
                      className="bg-surface p-2.5 rounded-lg border border-border/70 flex items-center justify-between gap-2 hover:border-brand/40 cursor-pointer transition-colors"
                      title={`Kliknij, aby zobaczyć transakcje w kategorii ${cat.category}`}
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-text-main truncate block">{cat.category}</span>
                        <span className="text-[10px] text-text-muted">
                          {formatMoney(cat.previous, profile.currency || "PLN")} &rarr; <strong className="text-text-main">{formatMoney(cat.current, profile.currency || "PLN")}</strong>
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border tabular-nums ${
                          cat.diffAmount > 0
                            ? "bg-danger-subtle text-danger border-danger/20"
                            : cat.diffAmount < 0
                            ? "bg-brand-subtle text-brand border-brand/20"
                            : "bg-surface-2 text-text-muted border-border"
                        }`}>
                          {cat.diffAmount > 0 ? `+${formatMoney(cat.diffAmount, profile.currency || "PLN")}` : formatMoney(cat.diffAmount, profile.currency || "PLN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 sm:p-3.5 bg-surface-2 border border-border rounded-xl text-text-main text-xs sm:text-sm leading-relaxed shadow-xs">
              {monthlyDigest.summaryText}
            </div>
          </div>

          {/* Actionable Insights */}
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-text-main uppercase tracking-wider">Wnioski i podpowiedzi</h3>
            <div className="space-y-2 sm:space-y-2.5">
              {insightsList.map((ins, idx) => (
                <div
                  key={idx}
                  className={`p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition min-w-0 shadow-xs ${
                    ins.type === "success"
                      ? "bg-brand-subtle/50 border-brand/20 text-brand"
                      : ins.type === "warning"
                      ? "bg-danger-subtle/50 border-danger/20 text-danger"
                      : "bg-surface-2 border-border text-text-muted"
                  }`}
                >
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      ins.type === "success"
                        ? "bg-brand-subtle border-brand/30 text-brand"
                        : ins.type === "warning"
                        ? "bg-danger-subtle border-danger/30 text-danger"
                        : "bg-surface border-border text-text-muted"
                    }`}>
                      {ins.type === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      ) : ins.type === "warning" ? (
                        <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      ) : (
                        <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-xs font-bold uppercase tracking-wide mb-0.5 truncate ${
                        ins.type === "success"
                          ? "text-brand"
                          : ins.type === "warning"
                          ? "text-danger"
                          : "text-text-main"
                      }`} title={ins.title}>{ins.title}</h4>
                      <p className="text-xs leading-relaxed text-text-muted">{ins.desc}</p>
                    </div>
                  </div>

                  {/* Action link */}
                  <div className="shrink-0 self-end sm:self-center">
                    {ins.title.includes("Największy wydatek") ? (
                      <button
                        type="button"
                        onClick={() => {
                          const topCat = categorySummary[0]?.name;
                          if (topCat) setDrillDownCategory(topCat);
                        }}
                        className="text-xs font-bold text-brand hover:underline px-2.5 py-1 rounded-lg bg-surface border border-border/80 flex items-center gap-1 shadow-xs"
                      >
                        <span>Szczegóły</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : ins.title.includes("limity") ? (
                      <button
                        type="button"
                        onClick={() => onChangeView ? onChangeView("budget") : undefined}
                        className="text-xs font-bold text-danger hover:underline px-2.5 py-1 rounded-lg bg-surface border border-border/80 flex items-center gap-1 shadow-xs"
                      >
                        <span>Przejdź do budżetów</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : ins.title.includes("wydatków") || ins.title.includes("Deficyt") ? (
                      <button
                        type="button"
                        onClick={() => setDrillDownCategory("__ALL_EXPENSES__")}
                        className="text-xs font-bold text-text-main hover:underline px-2.5 py-1 rounded-lg bg-surface border border-border/80 flex items-center gap-1 shadow-xs"
                      >
                        <span>Rozbij wydatki</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown box */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 gap-4 min-w-0">
              <div>
                <h3 className="text-sm font-bold text-text-main truncate uppercase tracking-wider" title="Struktura wydatków">
                  Struktura wydatków
                </h3>
                <p className="text-[11px] text-text-muted">Kliknij kategorię, aby zobaczyć transakcje</p>
              </div>
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-main active:scale-[0.98] transition-all bg-surface-2 px-2.5 py-1.5 rounded-xl border border-border shrink-0 whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
                  title="Dostosuj"
                >
                  <Settings2 className="w-3.5 h-3.5 shrink-0" />
                  Dostosuj
                </button>
                {isFilterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-xl z-10 overflow-hidden">
                    <div className="p-3 bg-surface-2 border-b border-border text-xs font-bold text-text-muted">
                      Widoczne kategorie
                    </div>
                    <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                      {expenseCategories.map((cat) => {
                        const isVisible =
                          userToggles[cat] !== undefined
                            ? userToggles[cat]
                            : expenseTxs.some((t) => t.category === cat && t.amount > 0);

                        return (
                          <label
                            key={cat}
                            className="flex items-center gap-2.5 p-2 hover:bg-surface-2 rounded-xl cursor-pointer min-w-0 focus-within:ring-2 focus-within:ring-focus-ring"
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isVisible}
                              onChange={(e) => setUserToggles((prev) => ({ ...prev, [cat]: e.target.checked }))}
                            />
                            <div
                              className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                                isVisible ? "bg-brand border-brand text-text-inverse" : "border-border"
                              }`}
                            >
                              {isVisible && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-xs text-text-muted truncate block" title={cat}>
                              {cat}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
              {categorySummary.length === 0 ? (
                <div className="text-center py-8 px-4 bg-bg-base/30 rounded-xl border border-dashed border-border flex flex-col items-center justify-center min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-brand-subtle flex items-center justify-center mb-2 border border-brand/20 shadow-xs">
                    <Target className="w-4 h-4 text-brand" />
                  </div>
                  <p className="text-xs text-text-main font-bold truncate">Brak widocznych kategorii</p>
                  <p className="text-[11px] text-text-faint truncate mt-0.5">Dostosuj filtr widoczności lub dodaj wydatki.</p>
                </div>
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
                    <div
                      key={cat.name}
                      onClick={() => setDrillDownCategory(cat.name)}
                      className="space-y-1.5 p-2 rounded-xl hover:bg-surface-2/60 transition-colors cursor-pointer border border-transparent hover:border-border/60"
                      title={`Kliknij, aby rozbić wydatki w kategorii ${cat.name}`}
                    >
                      <div className="flex justify-between items-end text-xs gap-3 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-text-main font-bold truncate block" title={cat.name}>
                            {cat.name}
                          </span>
                          {hasLimit && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded border font-bold uppercase tracking-wider shrink-0 truncate max-w-[80px] shadow-xs ${badgeClass}`}
                              title={badgeText}
                            >
                              {badgeText}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0 whitespace-nowrap">
                          <strong
                            className={`whitespace-nowrap tabular-nums ${hasLimit && limitPct > 100 ? "text-danger" : "text-text-main"}`}
                            title={formatMoney(cat.spent, profile.currency || "PLN")}
                          >
                            {formatMoney(cat.spent, profile.currency || "PLN")}
                          </strong>
                          <span
                            className="text-text-faint ml-1 tabular-nums"
                            title={hasLimit ? `z ${formatMoney(cat.limit, profile.currency || "PLN")}` : `(${cat.pctOfExpense}%)`}
                          >
                            {hasLimit ? `z ${formatMoney(cat.limit, profile.currency || "PLN")}` : `(${cat.pctOfExpense}%)`}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-surface-2 h-1.5 rounded-full overflow-hidden border border-border/40" role="progressbar" aria-valuenow={cat.pctOfExpense} aria-valuemin={0} aria-valuemax={100}>
                        <div
                          style={{ width: `${cat.pctOfExpense}%` }}
                          className={`${barColor} h-full rounded-full transition-all duration-300`}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {totalIncome > 0 && (
            <div className="border-t border-border mt-5 pt-4 min-w-0">
              <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-2 truncate" title="Stopa oszczędności">
                Miesięczna stopa oszczędności
              </h4>
              <div className="flex items-center gap-3.5 min-w-0 bg-surface-2 p-3 rounded-xl border border-border shadow-xs">
                <div className="w-12 h-12 rounded-full border-2 border-brand/40 flex items-center justify-center font-black text-brand text-xs tabular-nums shrink-0 shadow-xs bg-brand-subtle/30">
                  {savingsRate}%
                </div>
                <p className="text-xs text-text-muted leading-relaxed min-w-0">
                  Zabezpieczasz <strong className="text-text-main tabular-nums">{formatMoney(savings, profile.currency || "PLN")}</strong> z przychodów rzędu <strong className="tabular-nums">{formatMoney(totalIncome, profile.currency || "PLN")}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drill-down Transactions Modal / Drawer */}
      {drillDownCategory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setDrillDownCategory(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="drilldown-modal-title"
        >
          <div
            className="bg-surface border border-border rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface-2">
              <div>
                <h3 id="drilldown-modal-title" className="text-sm font-bold text-text-main flex items-center gap-2">
                  <span>Szczegóły operacji:</span>
                  <span className="text-brand">
                    {drillDownCategory === "__ALL_EXPENSES__"
                      ? "Wszystkie wydatki"
                      : drillDownCategory === "__ALL_INCOMES__"
                      ? "Wszystkie przychody"
                      : drillDownCategory}
                  </span>
                </h3>
                <p className="text-xs text-text-muted">
                  {monthName} {currentYear} • Liczba operacji: <strong>{drillDownTransactions.length}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrillDownCategory(null)}
                className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-2 min-h-0">
              {drillDownTransactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-muted">
                  Brak operacji dla wybranej kategorii w tym miesiącu.
                </div>
              ) : (
                drillDownTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 bg-surface-2 rounded-xl border border-border/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-text-main truncate">
                        <span>{tx.categoryIcon || "💳"}</span>
                        <span className="truncate">{tx.name}</span>
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-2">
                        <span>{tx.isoDate}</span>
                        <span>•</span>
                        <span className="truncate">{tx.account}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-black tabular-nums ${tx.type === "income" ? "text-brand" : "text-danger"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatMoney(tx.amount, tx.currency || profile.currency || "PLN")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-3 bg-surface-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDrillDownCategory(null);
                  if (onChangeView) onChangeView("transactions");
                }}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
              >
                <span>Przejdź do pełnej listy transakcji</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setDrillDownCategory(null)}
                className="px-4 py-2 bg-surface border border-border hover:bg-surface-3 rounded-xl text-xs font-bold text-text-main transition-colors"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
