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
