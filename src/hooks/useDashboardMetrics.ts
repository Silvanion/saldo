import { useMemo } from 'react';
import { Profile, RecurringRule, Payment } from '../types';
import {
  calculateEndOfMonthForecast,
  calculateBudgetWarnings,
  calculateSafeToSpend,
  calculateMonthlyTotals,
  calculateEmergencyLimit,
  calculateInvestmentCushion,
  getUnpaidAndUrgentPayments,
  calculateBudgetSummary,
  calculateRunway,
  calculateMoMTrends,
  SafeToSpendBreakdown,
  BudgetWarning,
  RunwayCalculation,
  MoMTrend
} from '../services/budgetCalculations';
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
  runway: RunwayCalculation;
  momTrends: MoMTrend;
  chartData: DashboardChartPoint[];
  recentTransactions: DashboardRecentTransaction[];
}

export function calculateDashboardMetrics(profile: Profile, selectedDate: Date, recurringRules: RecurringRule[]): DashboardMetrics {
  const transactions = profile.transactions || [];
  const payments = profile.payments || [];
  const budgets = profile.budgets || {};

  const { totalIncome, totalExpense, balance, categorySpentMap } = calculateMonthlyTotals(transactions, selectedDate);
  const emergencyLimit = calculateEmergencyLimit(profile.accounts);
  const investmentCushion = calculateInvestmentCushion(profile.investments);
  const { unpaidPayments, urgentPaymentsCount } = getUnpaidAndUrgentPayments(payments);
  const { totalPlannedBudget, totalActualSpentInBudget } = calculateBudgetSummary(budgets, categorySpentMap, budgetCategories);

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

  transactions.forEach((t) => {
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

  const recentTransactions = [...transactions]
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
    .slice(0, 4);

  const runway = calculateRunway(profile, 3);
  const momTrends = calculateMoMTrends(transactions, selectedDate);

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
    runway,
    momTrends,
    chartData: mappedChartData,
    recentTransactions
  };
}

export function useDashboardMetrics(profile: Profile, selectedDate: Date, recurringRules: RecurringRule[]): DashboardMetrics {
  return useMemo(() => calculateDashboardMetrics(profile, selectedDate, recurringRules), [profile, selectedDate, recurringRules]);
}
