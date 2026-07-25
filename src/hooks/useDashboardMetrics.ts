import { useMemo } from 'react';
import { Profile, RecurringRule, Payment, Transaction } from '../types';
import { calculateEndOfMonthForecast, calculateBudgetWarnings, calculateSafeToSpend, SafeToSpendBreakdown, BudgetWarning } from '../services/budgetCalculations';
import { budgetCategories, monthsPl } from '../utils';

export interface DashboardChartPoint {
  year: number;
  month: number;
  label: string;
  income: number;
  expense: number;
  isCurrent: boolean;
  incomeHeight: number;
  expenseHeight: number;
}

export interface DashboardRecentTransaction {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  account: string;
  isoDate: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringRuleId?: string;
  paidBy?: "me" | "partner" | "joint";
  splitMode?: "none" | "equal";
}

export interface DashboardMetrics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categorySpentMap: Record<string, number>;
  emergencyLimit: number;
  investmentCushion: number;
  unpaidPayments: Payment[];
  urgentPaymentsCount: number;
  totalPlannedBudget: number;
  totalActualSpentInBudget: number;
  endOfMonthForecast: ReturnType<typeof calculateEndOfMonthForecast>;
  budgetWarnings: BudgetWarning[];
  safeBreakdown: SafeToSpendBreakdown;
  chartData: DashboardChartPoint[];
  recentTransactions: DashboardRecentTransaction[];
}

export function calculateDashboardMetrics(profile: Profile, selectedDate: Date, recurringRules: RecurringRule[]): DashboardMetrics {
  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();

  let totalIncome = 0;
  let totalExpense = 0;
  const categorySpentMap: Record<string, number> = {};

  profile.transactions.forEach((t) => {
    const d = new Date(`${t.isoDate}T12:00:00`);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx) {
      if (t.type === "income") {
        totalIncome += t.amount;
      } else if (t.type === "expense") {
        totalExpense += t.amount;
        categorySpentMap[t.category] = (categorySpentMap[t.category] || 0) + t.amount;
      }
    }
  });

  const balance = totalIncome - totalExpense;

  let emergencyLimit = 0;
  (profile.accounts || []).forEach(a => {
    if (a.hasCreditLimit && a.creditLimit) {
      emergencyLimit += a.creditLimit;
    }
  });

  let investmentCushion = 0;
  (profile.investments || []).forEach(inv => {
    if (inv.type === "Poduszka finansowa") {
      investmentCushion += inv.amount;
    }
  });

  const unpaidPayments = profile.payments
    .filter((p) => p.status !== "Opłacono")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const urgentPaymentsCount = unpaidPayments.filter((p) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).length;

  let totalPlannedBudget = 0;
  let totalActualSpentInBudget = 0;
  budgetCategories.forEach(cat => {
    totalPlannedBudget += (profile.budgets[cat] || 0);
    totalActualSpentInBudget += (categorySpentMap[cat] || 0);
  });

  const endOfMonthForecast = calculateEndOfMonthForecast(profile, recurringRules);
  const selectedDateIso = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-15`;
  const budgetWarnings = calculateBudgetWarnings(profile, selectedDateIso)
    .sort((a, b) => b.ratio - a.ratio);

  const safeBreakdown = calculateSafeToSpend(profile, recurringRules);

  const targetMonths = [];
  const todayDate = new Date(selectedDate);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
    targetMonths.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: monthsPl[d.getMonth()].slice(0, 3),
      income: 0,
      expense: 0,
      isCurrent: i === 0
    });
  }

  profile.transactions.forEach((t) => {
    const txDate = new Date(`${t.isoDate}T12:00:00`);
    const y = txDate.getFullYear();
    const m = txDate.getMonth();
    
    const target = targetMonths.find(tm => tm.year === y && tm.month === m);
    if (target) {
      if (t.type === "income") target.income += t.amount;
      else if (t.type === "expense") target.expense += t.amount;
    }
  });

  const maxVal = Math.max(...targetMonths.map(d => Math.max(d.income, d.expense, 1000)));
  const mappedChartData = targetMonths.map(d => ({
    ...d,
    incomeHeight: Math.max(5, Math.round((d.income / maxVal) * 100)),
    expenseHeight: Math.max(5, Math.round((d.expense / maxVal) * 100))
  }));

  const recentTransactions = [...profile.transactions]
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
    .slice(0, 4);

  return {
    totalIncome,
    totalExpense,
    balance,
    categorySpentMap,
    emergencyLimit,
    investmentCushion,
    unpaidPayments,
    urgentPaymentsCount,
    totalPlannedBudget,
    totalActualSpentInBudget,
    endOfMonthForecast,
    budgetWarnings,
    safeBreakdown,
    chartData: mappedChartData,
    recentTransactions
  };
}

export function useDashboardMetrics(profile: Profile, selectedDate: Date, recurringRules: RecurringRule[]): DashboardMetrics {
  return useMemo(() => calculateDashboardMetrics(profile, selectedDate, recurringRules), [profile, selectedDate, recurringRules]);
}
