import { Profile, RecurringRule, Transaction, Payment } from "../types";
import { getLocalDateIso, addMonthsClamped, roundCurrency } from "../utils";

export interface SafeToSpendBreakdown {
  currentBalance: number;
  unpaidPaymentsSum: number;
  futureRecurringExpensesSum: number;
  reservedGoalsSum: number;
  safeToSpend: number;
  isNegative: boolean;
}

export interface BudgetWarning {
  category: string;
  limit: number;
  spent: number;
  ratio: number;
  percent: number;
  status: "normal" | "warning" | "exceeded";
}

export function calculateBudgetWarnings(
  profile: Profile | null,
  todayIsoStr?: string
): BudgetWarning[] {
  if (!profile) return [];

  const todayStr = todayIsoStr || getLocalDateIso();
  const todayParts = todayStr.split("-");
  const currentYear = parseInt(todayParts[0], 10);
  const currentMonthIdx = parseInt(todayParts[1], 10) - 1;

  const thisMonthExpenses = (profile.transactions || []).filter((t) => {
    if (t.type !== "expense") return false;
    if (!t.isoDate) return false;
    const d = new Date(`${t.isoDate}T12:00:00`);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx;
  });

  const categorySpentMap: Record<string, number> = {};
  for (const t of thisMonthExpenses) {
    categorySpentMap[t.category] = (categorySpentMap[t.category] || 0) + (Number(t.amount) || 0);
  }

  const warnings: BudgetWarning[] = [];
  const budgets = profile.budgets || {};

  for (const category of Object.keys(budgets)) {
    const limit = Number(budgets[category]) || 0;
    if (limit <= 0) continue;

    const spent = categorySpentMap[category] || 0;
    const ratio = spent / limit;
    const percent = Math.min(100, Math.round(ratio * 100));

    let status: "normal" | "warning" | "exceeded" = "normal";
    if (ratio >= 1) {
      status = "exceeded";
    } else if (ratio >= 0.8) {
      status = "warning";
    }

    warnings.push({
      category,
      limit,
      spent: roundCurrency(spent),
      ratio,
      percent,
      status
    });
  }

  return warnings;
}

export interface ForecastBreakdown {
  currentBalance: number;
  unpaidPaymentsSum: number;
  futureRecurringIncomesSum: number;
  futureRecurringExpensesSum: number;
  forecastedBalance: number;
  isNegative: boolean;
  forecastDate: string;
}

function buildExistingRecurringInstances(profile: Profile): Set<string> {
  const existingRecurringInstances = new Set<string>();
  const transactions = Array.isArray(profile.transactions) ? profile.transactions : [];
  for (const tx of transactions) {
    if (tx.recurringRuleId && tx.isoDate) {
      existingRecurringInstances.add(`${tx.recurringRuleId}_${tx.isoDate}`);
    }
  }
  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  for (const p of payments) {
    if (p.recurringRuleId && p.dueDate) {
      existingRecurringInstances.add(`${p.recurringRuleId}_${p.dueDate}`);
    }
  }
  return existingRecurringInstances;
}

function calculateFutureRecurring(
  recurringRules: RecurringRule[],
  existingRecurringInstances: Set<string>,
  todayStr: string,
  endOfMonthStr: string,
  includeIncomes: boolean
): { incomesSum: number; expensesSum: number } {
  let incomesSum = 0;
  let expensesSum = 0;

  if (Array.isArray(recurringRules)) {
    for (const rule of recurringRules) {
      if (!rule || rule.isActive === false) continue;
      if (!includeIncomes && rule.type !== "expense") continue;

      const ruleAmount = Number(rule.amount) || 0;
      if (ruleAmount <= 0) continue;

      let currDueDate = rule.nextDueDate;
      let occurrences = 0;
      const MAX_OCCURRENCES = 100;

      while (currDueDate && currDueDate <= endOfMonthStr && occurrences < MAX_OCCURRENCES) {
        if (currDueDate >= todayStr) {
          const instanceKey = `${rule.id}_${currDueDate}`;
          if (!existingRecurringInstances.has(instanceKey)) {
            if (rule.type === "income") {
              incomesSum += ruleAmount;
            } else if (rule.type === "expense") {
              expensesSum += ruleAmount;
            }
          }
        }

        const prevDueDate = currDueDate;
        if (rule.frequency === "weekly") {
          const nextDate = new Date(currDueDate + "T00:00:00");
          nextDate.setDate(nextDate.getDate() + 7);
          currDueDate = getLocalDateIso(nextDate);
        } else if (rule.frequency === "biweekly") {
          const nextDate = new Date(currDueDate + "T00:00:00");
          nextDate.setDate(nextDate.getDate() + 14);
          currDueDate = getLocalDateIso(nextDate);
        } else if (rule.frequency === "monthly") {
          currDueDate = addMonthsClamped(currDueDate, 1);
        } else if (rule.frequency === "quarterly") {
          currDueDate = addMonthsClamped(currDueDate, 3);
        } else if (rule.frequency === "yearly") {
          currDueDate = addMonthsClamped(currDueDate, 12);
        } else {
          currDueDate = addMonthsClamped(currDueDate, 1);
        }

        if (currDueDate <= prevDueDate) break;
        occurrences++;
      }
    }
  }

  return { incomesSum, expensesSum };
}

export function calculateEndOfMonthForecast(
  profile: Profile | null,
  recurringRules: RecurringRule[] = [],
  todayIsoStr?: string
): ForecastBreakdown {
  const todayStr = todayIsoStr || getLocalDateIso();

  // 1. Calculate end of month ISO string in local time
  const todayParts = todayStr.split("-");
  const year = parseInt(todayParts[0], 10);
  const month = parseInt(todayParts[1], 10); // 1-indexed (e.g. 7 for July)

  const daysInMonth = new Date(year, month, 0).getDate();
  const endOfMonthStr = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  if (!profile) {
    return {
      currentBalance: 0,
      unpaidPaymentsSum: 0,
      futureRecurringIncomesSum: 0,
      futureRecurringExpensesSum: 0,
      forecastedBalance: 0,
      isNegative: false,
      forecastDate: endOfMonthStr
    };
  }

  // 2. Current total balance from all transactions
  const transactions = Array.isArray(profile.transactions) ? profile.transactions : [];
  const currentBalance = transactions.reduce((sum, tx) => {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "income") return sum + amount;
    if (tx.type === "expense") return sum - amount;
    return sum;
  }, 0);

  // 3. Sum unpaid payments due up to end of current month (inclusive, including overdue)
  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  const unpaidPaymentsSum = payments.reduce((sum, p) => {
    if (p.status === "Opłacono") return sum;
    if (p.dueDate && p.dueDate <= endOfMonthStr) {
      return sum + (Number(p.amount) || 0);
    }
    return sum;
  }, 0);

  // Build a set of existing recurring instances to avoid double counting
  const existingRecurringInstances = buildExistingRecurringInstances(profile);

  // 4. Sum future mandatory recurring incomes and expenses from active rules until end of month
  const futureRecurring = calculateFutureRecurring(
    recurringRules,
    existingRecurringInstances,
    todayStr,
    endOfMonthStr,
    true
  );
  const futureRecurringIncomesSum = futureRecurring.incomesSum;
  const futureRecurringExpensesSum = futureRecurring.expensesSum;

  const rawForecast = currentBalance - unpaidPaymentsSum - futureRecurringExpensesSum + futureRecurringIncomesSum;
  const forecastedBalance = Number.isFinite(rawForecast) ? rawForecast : 0;

  return {
    currentBalance: roundCurrency(Number.isFinite(currentBalance) ? currentBalance : 0),
    unpaidPaymentsSum: roundCurrency(Number.isFinite(unpaidPaymentsSum) ? unpaidPaymentsSum : 0),
    futureRecurringIncomesSum: roundCurrency(Number.isFinite(futureRecurringIncomesSum) ? futureRecurringIncomesSum : 0),
    futureRecurringExpensesSum: roundCurrency(Number.isFinite(futureRecurringExpensesSum) ? futureRecurringExpensesSum : 0),
    forecastedBalance: roundCurrency(forecastedBalance),
    isNegative: forecastedBalance < 0,
    forecastDate: endOfMonthStr
  };
}

export function calculateSafeToSpend(
  profile: Profile | null,
  recurringRules: RecurringRule[] = [],
  todayIsoStr?: string
): SafeToSpendBreakdown {
  const todayStr = todayIsoStr || getLocalDateIso();

  if (!profile) {
    return {
      currentBalance: 0,
      unpaidPaymentsSum: 0,
      futureRecurringExpensesSum: 0,
      reservedGoalsSum: 0,
      safeToSpend: 0,
      isNegative: false
    };
  }

  // 1. Calculate end of month ISO string in local time
  const todayParts = todayStr.split("-");
  const year = parseInt(todayParts[0], 10);
  const month = parseInt(todayParts[1], 10); // 1-indexed (e.g. 7 for July)

  const daysInMonth = new Date(year, month, 0).getDate();
  const endOfMonthStr = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  // 2. Calculate current total balance from all profile transactions
  const transactions = Array.isArray(profile.transactions) ? profile.transactions : [];
  const currentBalance = transactions.reduce((sum, tx) => {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "income") return sum + amount;
    if (tx.type === "expense") return sum - amount;
    return sum;
  }, 0);

  // 3. Sum unpaid payments due up to end of current month (inclusive, including overdue)
  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  const unpaidPaymentsSum = payments.reduce((sum, p) => {
    if (p.status === "Opłacono") return sum;
    if (p.dueDate && p.dueDate <= endOfMonthStr) {
      return sum + (Number(p.amount) || 0);
    }
    return sum;
  }, 0);

  // Build a set of existing recurring instances to avoid double counting
  const existingRecurringInstances = buildExistingRecurringInstances(profile);

  // 4. Sum future mandatory recurring expenses from active recurring rules until end of month
  const futureRecurring = calculateFutureRecurring(
    recurringRules,
    existingRecurringInstances,
    todayStr,
    endOfMonthStr,
    false
  );
  const futureRecurringExpensesSum = futureRecurring.expensesSum;

  // 5. Sum reserved funds assigned to active goals
  const goals = Array.isArray(profile.goals) ? profile.goals : [];
  const reservedGoalsSum = goals.reduce((sum, g) => {
    const saved = Number(g.saved) || 0;
    return saved > 0 ? sum + saved : sum;
  }, 0);

  // 6. Calculate net safe-to-spend
  const rawSafe = currentBalance - unpaidPaymentsSum - futureRecurringExpensesSum - reservedGoalsSum;
  const safeToSpend = Number.isFinite(rawSafe) ? rawSafe : 0;

  return {
    currentBalance: roundCurrency(Number.isFinite(currentBalance) ? currentBalance : 0),
    unpaidPaymentsSum: roundCurrency(Number.isFinite(unpaidPaymentsSum) ? unpaidPaymentsSum : 0),
    futureRecurringExpensesSum: roundCurrency(Number.isFinite(futureRecurringExpensesSum) ? futureRecurringExpensesSum : 0),
    reservedGoalsSum: roundCurrency(Number.isFinite(reservedGoalsSum) ? reservedGoalsSum : 0),
    safeToSpend: roundCurrency(safeToSpend),
    isNegative: safeToSpend < 0
  };
}

export interface MonthlyTotals {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categorySpentMap: Record<string, number>;
}

export function calculateMonthlyTotals(transactions: Transaction[] = [], selectedDate: Date): MonthlyTotals {
  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();

  let totalIncome = 0;
  let totalExpense = 0;
  const categorySpentMap: Record<string, number> = {};

  (transactions || []).forEach((t) => {
    if (!t.isoDate) return;
    const d = new Date(`${t.isoDate}T12:00:00`);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx) {
      if (t.type === "income") {
        totalIncome += Number(t.amount) || 0;
      } else if (t.type === "expense") {
        const amt = Number(t.amount) || 0;
        totalExpense += amt;
        categorySpentMap[t.category] = (categorySpentMap[t.category] || 0) + amt;
      }
    }
  });

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    categorySpentMap
  };
}

export function calculateEmergencyLimit(accounts: Profile["accounts"] = []): number {
  let emergencyLimit = 0;
  (accounts || []).forEach((a) => {
    if (a.hasCreditLimit && a.creditLimit) {
      emergencyLimit += Number(a.creditLimit) || 0;
    }
  });
  return emergencyLimit;
}

export function calculateInvestmentCushion(investments: Profile["investments"] = []): number {
  let investmentCushion = 0;
  (investments || []).forEach((inv) => {
    if (inv.type === "Poduszka finansowa") {
      investmentCushion += Number(inv.amount) || 0;
    }
  });
  return investmentCushion;
}

export function getUnpaidAndUrgentPayments(payments: Payment[] = []): { unpaidPayments: Payment[]; urgentPaymentsCount: number } {
  const unpaidPayments = (payments || [])
    .filter((p) => p.status !== "Opłacono")
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  const urgentPaymentsCount = unpaidPayments.filter((p) => {
    if (!p.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).length;

  return { unpaidPayments, urgentPaymentsCount };
}

export function calculateBudgetSummary(
  budgets: Record<string, number> = {},
  categorySpentMap: Record<string, number> = {},
  categories: readonly string[]
): { totalPlannedBudget: number; totalActualSpentInBudget: number } {
  let totalPlannedBudget = 0;
  let totalActualSpentInBudget = 0;
  categories.forEach((cat) => {
    totalPlannedBudget += Number(budgets[cat]) || 0;
    totalActualSpentInBudget += Number(categorySpentMap[cat]) || 0;
  });
  return { totalPlannedBudget, totalActualSpentInBudget };
}

export interface RunwayCalculation {
  liquidAssets: number;
  avgMonthlyExpenses: number;
  runwayMonths: number;
  status: "critical" | "warning" | "healthy" | "infinite";
}

export function calculateRunway(profile: Profile | null, monthsToAverage: number = 3): RunwayCalculation {
  if (!profile) {
    return { liquidAssets: 0, avgMonthlyExpenses: 0, runwayMonths: 0, status: "critical" };
  }

  const transactions = Array.isArray(profile.transactions) ? profile.transactions : [];
  const currentBalance = transactions.reduce((sum, tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === "income") return sum + amt;
    if (tx.type === "expense") return sum - amt;
    return sum;
  }, 0);

  const goals = Array.isArray(profile.goals) ? profile.goals : [];
  const reservedGoalsSum = goals.reduce((sum, g) => {
    const saved = Number(g.saved) || 0;
    return saved > 0 ? sum + saved : sum;
  }, 0);

  const investments = Array.isArray(profile.investments) ? profile.investments : [];
  const investmentCushion = investments.reduce((sum, inv) => {
    if (inv.type === "Poduszka finansowa" || /poduszka|oszczędn/i.test(inv.name || "")) {
      return sum + (Number(inv.amount) || 0);
    }
    return sum;
  }, 0);

  const liquidAssets = Math.max(0, roundCurrency(currentBalance + reservedGoalsSum + investmentCushion));

  // Compute average monthly expenses across last N calendar months with data
  const monthExpenseMap: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.type === "expense" && tx.isoDate) {
      const monthKey = tx.isoDate.slice(0, 7); // "YYYY-MM"
      monthExpenseMap[monthKey] = (monthExpenseMap[monthKey] || 0) + (Number(tx.amount) || 0);
    }
  }

  const sortedMonths = Object.keys(monthExpenseMap).sort().reverse().slice(0, Math.max(1, monthsToAverage));
  let avgMonthlyExpenses = 0;
  if (sortedMonths.length > 0) {
    const sumExpenses = sortedMonths.reduce((sum, m) => sum + (monthExpenseMap[m] || 0), 0);
    avgMonthlyExpenses = roundCurrency(sumExpenses / sortedMonths.length);
  }

  if (avgMonthlyExpenses <= 0) {
    return {
      liquidAssets,
      avgMonthlyExpenses: 0,
      runwayMonths: Infinity,
      status: "infinite"
    };
  }

  const runwayMonths = roundCurrency(liquidAssets / avgMonthlyExpenses);
  let status: RunwayCalculation["status"] = "healthy";
  if (runwayMonths < 3) {
    status = "critical";
  } else if (runwayMonths < 6) {
    status = "warning";
  }

  return {
    liquidAssets,
    avgMonthlyExpenses,
    runwayMonths,
    status
  };
}

export interface MoMTrend {
  currentMonthExpenses: number;
  previousMonthExpenses: number;
  expensesDiffAmount: number;
  expensesDiffPercent: number;
  currentMonthIncome: number;
  previousMonthIncome: number;
  incomeDiffAmount: number;
  incomeDiffPercent: number;
}

export function calculateMoMTrends(transactions: Transaction[] = [], referenceDate: Date = new Date()): MoMTrend {
  const curYear = referenceDate.getFullYear();
  const curMonth = referenceDate.getMonth();

  const prevDate = new Date(curYear, curMonth - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();

  let curExpenses = 0;
  let curIncome = 0;
  let prevExpenses = 0;
  let prevIncome = 0;

  for (const tx of transactions) {
    if (!tx.isoDate) continue;
    const d = new Date(`${tx.isoDate}T12:00:00`);
    const y = d.getFullYear();
    const m = d.getMonth();
    const amt = Number(tx.amount) || 0;

    if (y === curYear && m === curMonth) {
      if (tx.type === "expense") curExpenses += amt;
      if (tx.type === "income") curIncome += amt;
    } else if (y === prevYear && m === prevMonth) {
      if (tx.type === "expense") prevExpenses += amt;
      if (tx.type === "income") prevIncome += amt;
    }
  }

  const expensesDiffAmount = roundCurrency(curExpenses - prevExpenses);
  const expensesDiffPercent = prevExpenses > 0 ? roundCurrency(((curExpenses - prevExpenses) / prevExpenses) * 100) : 0;

  const incomeDiffAmount = roundCurrency(curIncome - prevIncome);
  const incomeDiffPercent = prevIncome > 0 ? roundCurrency(((curIncome - prevIncome) / prevIncome) * 100) : 0;

  return {
    currentMonthExpenses: roundCurrency(curExpenses),
    previousMonthExpenses: roundCurrency(prevExpenses),
    expensesDiffAmount,
    expensesDiffPercent,
    currentMonthIncome: roundCurrency(curIncome),
    previousMonthIncome: roundCurrency(prevIncome),
    incomeDiffAmount,
    incomeDiffPercent
  };
}

export interface Breakdown503020 {
  needs: { amount: number; percentage: number; targetPercentage: 50 };
  wants: { amount: number; percentage: number; targetPercentage: 30 };
  savings: { amount: number; percentage: number; targetPercentage: 20 };
  totalExpense: number;
}

export function calculate503020(transactions: Transaction[] = [], selectedDate: Date = new Date()): Breakdown503020 {
  const curYear = selectedDate.getFullYear();
  const curMonth = selectedDate.getMonth();

  let needsAmount = 0;
  let wantsAmount = 0;
  let savingsAmount = 0;

  const NEEDS_PATTERN = /żywność|jedzenie|zakupy spożywcze|dom|mieszkanie|rachunki|opłaty|czynsz|prąd|gaz|woda|transport|paliwo|bilet|zdrowie|leki|apteka|edukacja|dzieci|ubezpieczenie|podatki/i;
  const SAVINGS_PATTERN = /kredyt|raty|spłata|pożyczka|oszczędn|inwestycj|lokata|emerytur/i;

  for (const tx of transactions) {
    if (!tx.isoDate || tx.type !== "expense") continue;
    const d = new Date(`${tx.isoDate}T12:00:00`);
    if (d.getFullYear() !== curYear || d.getMonth() !== curMonth) continue;

    const amt = Number(tx.amount) || 0;
    const cat = (tx.category || "").toLowerCase();

    if (SAVINGS_PATTERN.test(cat)) {
      savingsAmount += amt;
    } else if (NEEDS_PATTERN.test(cat)) {
      needsAmount += amt;
    } else {
      wantsAmount += amt;
    }
  }

  const totalExpense = needsAmount + wantsAmount + savingsAmount;
  const toPercent = (amt: number) => (totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0);

  return {
    needs: { amount: roundCurrency(needsAmount), percentage: toPercent(needsAmount), targetPercentage: 50 },
    wants: { amount: roundCurrency(wantsAmount), percentage: toPercent(wantsAmount), targetPercentage: 30 },
    savings: { amount: roundCurrency(savingsAmount), percentage: toPercent(savingsAmount), targetPercentage: 20 },
    totalExpense: roundCurrency(totalExpense)
  };
}

export interface NetWorthAssetClass {
  name: string;
  amount: number;
  percent: number;
}

export interface NetWorthBreakdown {
  liquidAssets: number;
  goalsAssets: number;
  investmentsAssets: number;
  totalAssets: number;
  unpaidLiabilities: number;
  creditLiabilities: number;
  totalLiabilities: number;
  netWorth: number;
  assetClasses: NetWorthAssetClass[];
}

export function calculateNetWorth(profile: Profile | null): NetWorthBreakdown {
  if (!profile) {
    return {
      liquidAssets: 0,
      goalsAssets: 0,
      investmentsAssets: 0,
      totalAssets: 0,
      unpaidLiabilities: 0,
      creditLiabilities: 0,
      totalLiabilities: 0,
      netWorth: 0,
      assetClasses: [],
    };
  }

  // 1. Liquid operating balance:
  const totalIncome = (profile.transactions || [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalExpense = (profile.transactions || [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const liquidAssets = Math.max(0, roundCurrency(totalIncome - totalExpense));

  // 2. Goals / Savings:
  const goalsAssets = roundCurrency(
    (profile.goals || []).reduce((sum, g) => sum + (Number(g.saved) || 0), 0)
  );

  // 3. Investments capital:
  const investmentsAssets = roundCurrency(
    (profile.investments || []).reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
  );

  const totalAssets = roundCurrency(liquidAssets + goalsAssets + investmentsAssets);

  // 4. Liabilities:
  const unpaidLiabilities = roundCurrency(
    (profile.payments || [])
      .filter((p) => p.status !== "Opłacono")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );

  let creditLiabilities = 0;
  if (profile.accounts && profile.accounts.length > 0) {
    creditLiabilities = roundCurrency(
      profile.accounts.reduce((sum, acc) => sum + (acc.hasCreditLimit ? Number(acc.creditLimit) || 0 : 0), 0)
    );
  }

  const totalLiabilities = roundCurrency(unpaidLiabilities + creditLiabilities);
  const netWorth = roundCurrency(totalAssets - totalLiabilities);

  // Asset classes breakdown
  const classMap: Record<string, number> = {};
  if (liquidAssets > 0) {
    classMap["Środki płynne"] = liquidAssets;
  }
  if (goalsAssets > 0) {
    classMap["Cele i Rezerwy"] = goalsAssets;
  }
  for (const inv of (profile.investments || [])) {
    const typeName = inv.type || "Inne inwestycje";
    classMap[typeName] = (classMap[typeName] || 0) + (Number(inv.amount) || 0);
  }

  const assetClasses: NetWorthAssetClass[] = Object.entries(classMap).map(([name, amount]) => ({
    name,
    amount: roundCurrency(amount),
    percent: totalAssets > 0 ? Math.round((amount / totalAssets) * 100) : 0,
  }));

  return {
    liquidAssets,
    goalsAssets,
    investmentsAssets,
    totalAssets,
    unpaidLiabilities,
    creditLiabilities,
    totalLiabilities,
    netWorth,
    assetClasses,
  };
}

export interface CategoryDriver {
  category: string;
  currentAmount: number;
  previousAmount: number;
  diffAmount: number;
  diffPercent: number;
}

export interface RollingTrendsResult {
  currentMonthExpense: number;
  lastMonthExpense: number;
  avg3MonthExpense: number;
  avg6MonthExpense: number;
  diffVsLastMonth: number;
  diffVs3MAvg: number;
  topGrowthCategory: CategoryDriver | null;
  topReductionCategory: CategoryDriver | null;
  historicalMonthsCount: number;
}

export function calculateRollingTrends(
  transactions: Transaction[],
  selectedDate: Date
): RollingTrendsResult {
  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();

  const getMonthExpenseData = (year: number, monthIdx: number) => {
    const txs = transactions.filter((t) => {
      if (t.type !== "expense" || !t.isoDate) return false;
      const d = new Date(`${t.isoDate}T12:00:00`);
      return d.getFullYear() === year && d.getMonth() === monthIdx;
    });

    const categoryMap: Record<string, number> = {};
    let total = 0;
    for (const t of txs) {
      total += t.amount;
      const cat = t.category || "Inne";
      categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
    }
    return { total: roundCurrency(total), categoryMap };
  };

  const currentData = getMonthExpenseData(currentYear, currentMonthIdx);
  const currentMonthExpense = currentData.total;

  const pastMonthsTotals: number[] = [];
  let prevMonthCategoryMap: Record<string, number> = {};

  for (let i = 1; i <= 6; i++) {
    let targetMonth = currentMonthIdx - i;
    let targetYear = currentYear;
    while (targetMonth < 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    const data = getMonthExpenseData(targetYear, targetMonth);
    if (i === 1) {
      prevMonthCategoryMap = data.categoryMap;
    }
    pastMonthsTotals.push(data.total);
  }

  const lastMonthExpense = pastMonthsTotals[0] || 0;

  const activePast3M = pastMonthsTotals.slice(0, 3).filter((amt) => amt > 0);
  const activePast6M = pastMonthsTotals.filter((amt) => amt > 0);

  const avg3MonthExpense = activePast3M.length > 0
    ? roundCurrency(activePast3M.reduce((sum, v) => sum + v, 0) / activePast3M.length)
    : currentMonthExpense;

  const avg6MonthExpense = activePast6M.length > 0
    ? roundCurrency(activePast6M.reduce((sum, v) => sum + v, 0) / activePast6M.length)
    : avg3MonthExpense;

  const diffVsLastMonth = lastMonthExpense > 0
    ? Math.round(((currentMonthExpense - lastMonthExpense) / lastMonthExpense) * 100)
    : 0;

  const diffVs3MAvg = avg3MonthExpense > 0
    ? Math.round(((currentMonthExpense - avg3MonthExpense) / avg3MonthExpense) * 100)
    : 0;

  const allCategories = Array.from(
    new Set([...Object.keys(currentData.categoryMap), ...Object.keys(prevMonthCategoryMap)])
  );

  const drivers: CategoryDriver[] = allCategories.map((cat) => {
    const cur = currentData.categoryMap[cat] || 0;
    const prev = prevMonthCategoryMap[cat] || 0;
    const diff = roundCurrency(cur - prev);
    const diffPct = prev > 0 ? Math.round((diff / prev) * 100) : (cur > 0 ? 100 : 0);
    return {
      category: cat,
      currentAmount: cur,
      previousAmount: prev,
      diffAmount: diff,
      diffPercent: diffPct,
    };
  });

  const growthDrivers = drivers.filter((d) => d.diffAmount > 0).sort((a, b) => b.diffAmount - a.diffAmount);
  const reductionDrivers = drivers.filter((d) => d.diffAmount < 0).sort((a, b) => a.diffAmount - b.diffAmount);

  return {
    currentMonthExpense,
    lastMonthExpense,
    avg3MonthExpense,
    avg6MonthExpense,
    diffVsLastMonth,
    diffVs3MAvg,
    topGrowthCategory: growthDrivers.length > 0 ? growthDrivers[0] : null,
    topReductionCategory: reductionDrivers.length > 0 ? reductionDrivers[0] : null,
    historicalMonthsCount: activePast6M.length,
  };
}

export interface EmergencySimulatorResult {
  targetMonths: number;
  monthlyBurnRate: number;
  requiredCapital: number;
  currentLiquidCapital: number;
  progressPercent: number;
  shortfall: number;
  currentMonthlySavings: number;
  monthsToTarget: number | null;
  status: "completed" | "on_track" | "no_savings" | "deficit";
}

export function calculateEmergencySimulator(
  profile: Profile,
  selectedDate: Date,
  targetMonths: 3 | 6 | 12
): EmergencySimulatorResult {
  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();

  const thisMonthTransactions = (profile.transactions || []).filter((t) => {
    if (!t.isoDate) return false;
    const d = new Date(`${t.isoDate}T12:00:00`);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx;
  });

  const thisMonthIncome = thisMonthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonthExpense = thisMonthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthlySavings = roundCurrency(thisMonthIncome - thisMonthExpense);

  const rolling = calculateRollingTrends(profile.transactions || [], selectedDate);
  const monthlyBurnRate = rolling.avg3MonthExpense > 0 ? rolling.avg3MonthExpense : (thisMonthExpense > 0 ? thisMonthExpense : 3000);

  const requiredCapital = roundCurrency(monthlyBurnRate * targetMonths);

  const allIncomes = (profile.transactions || [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const allExpenses = (profile.transactions || [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const liquidFunds = Math.max(0, allIncomes - allExpenses);

  const goalsSavings = (profile.goals || []).reduce((sum, g) => sum + (Number(g.saved) || 0), 0);
  const currentLiquidCapital = roundCurrency(liquidFunds + goalsSavings);

  const shortfall = roundCurrency(Math.max(0, requiredCapital - currentLiquidCapital));
  const progressPercent = requiredCapital > 0
    ? Math.min(100, Math.round((currentLiquidCapital / requiredCapital) * 100))
    : 100;

  let monthsToTarget: number | null = null;
  let status: "completed" | "on_track" | "no_savings" | "deficit" = "on_track";

  if (shortfall <= 0) {
    status = "completed";
    monthsToTarget = 0;
  } else if (currentMonthlySavings <= 0) {
    status = currentMonthlySavings < 0 ? "deficit" : "no_savings";
    monthsToTarget = null;
  } else {
    status = "on_track";
    monthsToTarget = Math.ceil(shortfall / currentMonthlySavings);
  }

  return {
    targetMonths,
    monthlyBurnRate,
    requiredCapital,
    currentLiquidCapital,
    progressPercent,
    shortfall,
    currentMonthlySavings,
    monthsToTarget,
    status,
  };
}

