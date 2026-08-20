import { Profile, RecurringRule } from "../types";
import { getLocalDateIso, roundCurrency } from "../utils";
import { calculateBudgetWarnings } from "./budgetCalculations";
import { calculateCashflowForecast } from "./cashflowForecast";
import { getFixedCostHubData } from "./subscriptionHub";

export type AlertSeverity = "critical" | "warning" | "positive";

export interface FinancialAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  pillar: "budget" | "payments" | "liquidity" | "fixed_costs";
}

export interface HealthPillar {
  key: "budget" | "payments" | "liquidity" | "fixed_costs";
  name: string;
  score: number; // 0..25
  maxScore: 25;
  status: "good" | "fair" | "poor";
  summary: string;
}

export interface FinancialHealthResult {
  score: number; // 0..100
  grade: "excellent" | "good" | "fair" | "warning" | "danger";
  gradeLabel: string;
  pillars: {
    budget: HealthPillar;
    payments: HealthPillar;
    liquidity: HealthPillar;
    fixedCosts: HealthPillar;
  };
  alerts: FinancialAlert[];
  positiveDrivers: string[];
  negativeDrivers: string[];
  isLowData: boolean;
}

export interface FinancialHealthOptions {
  todayIsoStr?: string;
  selectedDate?: Date;
}

export function getFinancialHealthSummary(
  profile: Profile | null,
  recurringRules: RecurringRule[] = [],
  options: FinancialHealthOptions = {}
): FinancialHealthResult {
  const todayStr = options.todayIsoStr || getLocalDateIso();

  if (!profile) {
    const emptyPillar = (key: HealthPillar["key"], name: string): HealthPillar => ({
      key,
      name,
      score: 20,
      maxScore: 25,
      status: "fair",
      summary: "Brak danych profilu",
    });

    return {
      score: 80,
      grade: "good",
      gradeLabel: "Dobra kondycja",
      pillars: {
        budget: emptyPillar("budget", "Budżet"),
        payments: emptyPillar("payments", "Płatności"),
        liquidity: emptyPillar("liquidity", "Płynność"),
        fixedCosts: emptyPillar("fixed_costs", "Koszty stałe"),
      },
      alerts: [],
      positiveDrivers: [],
      negativeDrivers: [],
      isLowData: true,
    };
  }

  const alerts: FinancialAlert[] = [];
  const positiveDrivers: string[] = [];
  const negativeDrivers: string[] = [];

  const hasTransactions = Array.isArray(profile.transactions) && profile.transactions.length > 0;
  const hasPayments = Array.isArray(profile.payments) && profile.payments.length > 0;
  const hasBudgets = profile.budgets && Object.keys(profile.budgets).length > 0;
  const isLowData = !hasTransactions && !hasPayments && !hasBudgets;

  // ==========================================
  // 1. PILLAR: Dyscyplina Budżetowa (0-25 pts)
  // ==========================================
  let budgetScore = 25;
  let budgetSummary = "Wszystkie kategorie w normie";
  const budgetWarnings = calculateBudgetWarnings(profile, todayStr);

  if (!hasBudgets) {
    budgetScore = 20;
    budgetSummary = "Brak zdefiniowanych limitów";
  } else {
    const exceeded = budgetWarnings.filter(w => w.status === "exceeded");
    const warnings = budgetWarnings.filter(w => w.status === "warning");

    if (exceeded.length > 0) {
      const penalty = Math.min(25, exceeded.length * 10 + warnings.length * 4);
      budgetScore = Math.max(0, 25 - penalty);
      budgetSummary = `Przekroczono limit w ${exceeded.length} ${exceeded.length === 1 ? "kategorii" : "kategoriach"}`;
      negativeDrivers.push(budgetSummary);

      exceeded.forEach(w => {
        alerts.push({
          id: `budget_exceeded_${w.category}`,
          severity: "critical",
          title: `Przekroczony budżet: ${w.category}`,
          description: `Wydano ${w.spent} zł z limitu ${w.limit} zł (${w.percent}% limitu).`,
          pillar: "budget",
        });
      });
    } else if (warnings.length > 0) {
      budgetScore = Math.max(12, 25 - warnings.length * 4);
      budgetSummary = `Zbliżasz się do limitu w ${warnings.length} ${warnings.length === 1 ? "kategorii" : "kategoriach"}`;
      negativeDrivers.push(budgetSummary);

      warnings.forEach(w => {
        alerts.push({
          id: `budget_warning_${w.category}`,
          severity: "warning",
          title: `Ostrzeżenie budżetu: ${w.category}`,
          description: `Wykorzystano ${w.percent}% limitu (${w.spent} zł z ${w.limit} zł).`,
          pillar: "budget",
        });
      });
    } else {
      budgetScore = 25;
      budgetSummary = "Budżet pod pełną kontrolą";
      positiveDrivers.push("Brak przekroczeń limitów budżetowych");
      alerts.push({
        id: "budget_ok",
        severity: "positive",
        title: "Dyscyplina budżetowa",
        description: "Wszystkie aktywne kategorie mieszczą się w wyznaczonych limitach.",
        pillar: "budget",
      });
    }
  }

  // ==========================================
  // 2. PILLAR: Terminowość Płatności (0-25 pts)
  // ==========================================
  let paymentsScore = 25;
  let paymentsSummary = "Wszystkie opłaty uregulowane na czas";
  const payments = Array.isArray(profile.payments) ? profile.payments : [];

  let overdueCount = 0;
  let dueTodayOrTomorrowCount = 0;

  for (const p of payments) {
    if (!p || p.status === "Opłacono" || !p.dueDate) continue;

    const diffDays = Math.round(
      (new Date(`${p.dueDate}T00:00:00`).getTime() - new Date(`${todayStr}T00:00:00`).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      overdueCount++;
      alerts.push({
        id: `payment_overdue_${p.id}`,
        severity: "critical",
        title: `Zaległy rachunek: ${p.name}`,
        description: `Termin opłaty minął ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "dzień" : "dni"} temu (${p.dueDate}).`,
        pillar: "payments",
      });
    } else if (diffDays <= 1) {
      dueTodayOrTomorrowCount++;
      alerts.push({
        id: `payment_soon_${p.id}`,
        severity: "warning",
        title: `Płatność na dziś/jutro: ${p.name}`,
        description: `Termin płatności (${p.amount} zł) upływa ${diffDays === 0 ? "dzisiaj" : "jutro"}.`,
        pillar: "payments",
      });
    }
  }

  if (overdueCount > 0) {
    paymentsScore = Math.max(0, 25 - overdueCount * 12);
    paymentsSummary = `${overdueCount} ${overdueCount === 1 ? "zaległa opłata" : "zaległe opłaty"}`;
    negativeDrivers.push(paymentsSummary);
  } else if (dueTodayOrTomorrowCount > 0) {
    paymentsScore = 20;
    paymentsSummary = `${dueTodayOrTomorrowCount} ${dueTodayOrTomorrowCount === 1 ? "opłata" : "opłaty"} do zrealizowania na dniach`;
  } else {
    paymentsScore = 25;
    paymentsSummary = "Brak zaległości płatniczych";
    positiveDrivers.push("Wszystkie rachunki opłacane terminowo");
    if (payments.length > 0) {
      alerts.push({
        id: "payments_ok",
        severity: "positive",
        title: "Brak przeterminowanych opłat",
        description: "Brak zaległości w harmonogramie płatności.",
        pillar: "payments",
      });
    }
  }

  // ==========================================
  // 3. PILLAR: Bezpieczeństwo Płynności (0-25 pts)
  // ==========================================
  let liquidityScore = 25;
  let liquiditySummary = "Stabilna płynność gotówkowa";
  const forecast = calculateCashflowForecast(profile, recurringRules, { todayIsoStr: todayStr, safetyBuffer: 500 });
  const summary30 = forecast.summary30;

  if (summary30.lowestPoint.amount < 0) {
    liquidityScore = 0;
    liquiditySummary = "Ryzyko deficytu płynności w 30 dni";
    negativeDrivers.push("Prognozowany spadek salda poniżej 0 zł");
    alerts.push({
      id: "liquidity_deficit_30d",
      severity: "critical",
      title: "Zagrożenie deficytem płynności",
      description: `W horyzoncie 30 dni prognozowane saldo spada do ${summary30.lowestPoint.amount} zł (${summary30.lowestPoint.date}).`,
      pillar: "liquidity",
    });
  } else if (summary30.riskDaysCount > 0) {
    liquidityScore = Math.max(8, 25 - summary30.riskDaysCount * 2);
    liquiditySummary = `Saldo spada poniżej bufora przez ${summary30.riskDaysCount} dni`;
    negativeDrivers.push(`Zagrożenie bufora płynności (${summary30.riskDaysCount} dni)`);
    alerts.push({
      id: "liquidity_buffer_warning",
      severity: "warning",
      title: "Niski bufor gotówkowy",
      description: `Saldo spada poniżej 500 zł przez ${summary30.riskDaysCount} dni w najbliższym miesiącu.`,
      pillar: "liquidity",
    });
  } else if (forecast.currentBalance < 500 && hasTransactions) {
    liquidityScore = 14;
    liquiditySummary = "Niski bieżący stan gotówki";
    negativeDrivers.push("Bieżące saldo poniżej bufora 500 zł");
    alerts.push({
      id: "liquidity_current_low",
      severity: "warning",
      title: "Niskie saldo początkowe",
      description: "Stan konta jest poniżej zalecanego bufora 500 zł.",
      pillar: "liquidity",
    });
  } else {
    liquidityScore = 25;
    liquiditySummary = "Płynność zabezpieczona";
    positiveDrivers.push("Bezpieczna poduszka płynności na najbliższe 30 dni");
    alerts.push({
      id: "liquidity_ok",
      severity: "positive",
      title: "Stabilność gotówkowa",
      description: "Brak prognozowanych dołków płynności w najbliższych tygodniach.",
      pillar: "liquidity",
    });
  }

  // ==========================================
  // 4. PILLAR: Koszty Stałe i Subskrypcje (0-25 pts)
  // ==========================================
  let fixedCostsScore = 25;
  let fixedCostsSummary = "Umiarkowane koszty stałe";
  const fixedCostHub = getFixedCostHubData(profile, recurringRules, todayStr);

  // Compute estimated monthly income (from recurring income rules or monthly transaction average)
  const monthlyRecurringIncome = (recurringRules.length > 0 ? recurringRules : (profile.recurringRules || []))
    .filter(r => r && r.isActive !== false && r.type === "income")
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const thisMonthIncome = (profile.transactions || [])
    .filter(t => t && t.type === "income" && t.isoDate?.startsWith(todayStr.slice(0, 7)))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const baselineIncome = Math.max(monthlyRecurringIncome, thisMonthIncome, 0);

  if (fixedCostHub.monthlyTotal > 0 && baselineIncome > 0) {
    const fixedRatio = fixedCostHub.monthlyTotal / baselineIncome;
    const ratioPercent = Math.round(fixedRatio * 100);

    if (fixedRatio > 0.70) {
      fixedCostsScore = Math.max(0, Math.round(25 - (fixedRatio - 0.70) * 50));
      fixedCostsSummary = `Koszty stałe pochłaniają ${ratioPercent}% dochodów`;
      negativeDrivers.push(fixedCostsSummary);
      alerts.push({
        id: "fixed_costs_heavy",
        severity: "critical",
        title: "Wysokie koszty stałe",
        description: `Abonamenty i rachunki stałe stanowią aż ${ratioPercent}% Twoich przychodów.`,
        pillar: "fixed_costs",
      });
    } else if (fixedRatio > 0.50) {
      fixedCostsScore = 16;
      fixedCostsSummary = `Koszty stałe stanowią ${ratioPercent}% dochodów`;
      negativeDrivers.push(fixedCostsSummary);
      alerts.push({
        id: "fixed_costs_moderate",
        severity: "warning",
        title: "Umiarkowany ciężar kosztów stałych",
        description: `Koszty stałe (${fixedCostHub.monthlyTotal} zł/mc) pochłaniają ${ratioPercent}% przychodów.`,
        pillar: "fixed_costs",
      });
    } else {
      fixedCostsScore = 25;
      fixedCostsSummary = `Koszty stałe to zdrowe ${ratioPercent}% dochodów`;
      positiveDrivers.push(`Koszty stałe na bezpiecznym poziomie (${ratioPercent}% dochodu)`);
      alerts.push({
        id: "fixed_costs_ok",
        severity: "positive",
        title: "Zdrowy poziom kosztów stałych",
        description: `Abonamenty i rachunki stanowią ${ratioPercent}% przychodów (norma do 50%).`,
        pillar: "fixed_costs",
      });
    }
  } else if (fixedCostHub.monthlyTotal > 3000 && baselineIncome === 0) {
    fixedCostsScore = 15;
    fixedCostsSummary = "Wysoka suma comiesięcznych zobowiązań";
  } else {
    fixedCostsScore = 25;
    fixedCostsSummary = "Niski poziom kosztów stałych";
  }

  // ==========================================
  // Summary Aggregation & Grade
  // ==========================================
  const totalScore = Math.min(100, Math.max(0, budgetScore + paymentsScore + liquidityScore + fixedCostsScore));

  let grade: FinancialHealthResult["grade"] = "good";
  let gradeLabel = "Dobra kondycja";

  if (totalScore >= 85) {
    grade = "excellent";
    gradeLabel = "Wzorowa kondycja";
  } else if (totalScore >= 70) {
    grade = "good";
    gradeLabel = "Dobra kondycja";
  } else if (totalScore >= 50) {
    grade = "fair";
    gradeLabel = "Umiarkowana kondycja";
  } else if (totalScore >= 30) {
    grade = "warning";
    gradeLabel = "Wymaga uwagi";
  } else {
    grade = "danger";
    gradeLabel = "Zagrożenie płynności";
  }

  const getPillarStatus = (sc: number): HealthPillar["status"] => {
    if (sc >= 20) return "good";
    if (sc >= 12) return "fair";
    return "poor";
  };

  // Sort alerts: critical (1) -> warning (2) -> positive (3)
  const severityRank = { critical: 1, warning: 2, positive: 3 };
  alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    score: totalScore,
    grade,
    gradeLabel,
    pillars: {
      budget: {
        key: "budget",
        name: "Budżet",
        score: budgetScore,
        maxScore: 25,
        status: getPillarStatus(budgetScore),
        summary: budgetSummary,
      },
      payments: {
        key: "payments",
        name: "Płatności",
        score: paymentsScore,
        maxScore: 25,
        status: getPillarStatus(paymentsScore),
        summary: paymentsSummary,
      },
      liquidity: {
        key: "liquidity",
        name: "Płynność",
        score: liquidityScore,
        maxScore: 25,
        status: getPillarStatus(liquidityScore),
        summary: liquiditySummary,
      },
      fixedCosts: {
        key: "fixed_costs",
        name: "Koszty stałe",
        score: fixedCostsScore,
        maxScore: 25,
        status: getPillarStatus(fixedCostsScore),
        summary: fixedCostsSummary,
      },
    },
    alerts,
    positiveDrivers,
    negativeDrivers,
    isLowData,
  };
}
