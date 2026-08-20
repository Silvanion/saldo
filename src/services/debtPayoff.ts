import { Profile } from "../types";
import { roundCurrency } from "../utils";

export interface DebtItem {
  id: string;
  name: string;
  amount: number;
  type: "payment" | "credit_limit";
  category?: string;
  dueDate?: string;
}

export interface DebtPayoffSummary {
  totalDebt: number;
  totalDebtLikeAmount: number;
  debtItemsCount: number;
  debtItems: DebtItem[];
  monthlyAvailableSurplus: number;
  extraPayment: number;
  baselineMonthlyPayment: number;
  acceleratedMonthlyPayment: number;
  baselineMonths: number | null;
  acceleratedMonths: number | null;
  monthsSaved: number;
  snowballQueue: { id: string; name: string; amount: number; type: "payment" | "credit_limit" }[];
  isDebtFree: boolean;
  isLowData: boolean;
  strategy: "snowball";
  strategyLabel: string;
}

export function getDebtPayoffSummary(
  profile: Profile | null,
  options?: {
    selectedDate?: Date;
    extraPayment?: number;
  }
): DebtPayoffSummary {
  const extraPayment = Math.max(0, options?.extraPayment || 0);
  const selectedDate = options?.selectedDate || new Date();

  if (!profile) {
    return {
      totalDebt: 0,
      totalDebtLikeAmount: 0,
      debtItemsCount: 0,
      debtItems: [],
      monthlyAvailableSurplus: 0,
      extraPayment,
      baselineMonthlyPayment: 300,
      acceleratedMonthlyPayment: 300 + extraPayment,
      baselineMonths: 0,
      acceleratedMonths: 0,
      monthsSaved: 0,
      snowballQueue: [],
      isDebtFree: true,
      isLowData: true,
      strategy: "snowball",
      strategyLabel: "Kula śnieżna (Snowball)",
    };
  }

  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();

  const debtItems: DebtItem[] = [];

  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  for (const p of payments) {
    if (p.status !== "Opłacono" && typeof p.amount === "number" && p.amount > 0) {
      debtItems.push({
        id: p.id,
        name: p.name || "Zobowiązanie",
        amount: roundCurrency(p.amount),
        type: "payment",
        category: p.category,
        dueDate: p.dueDate,
      });
    }
  }

  const accounts = Array.isArray(profile.accounts) ? profile.accounts : [];
  for (const acc of accounts) {
    if (acc.hasCreditLimit && Number(acc.creditLimit) > 0) {
      debtItems.push({
        id: acc.id,
        name: `${acc.name} (Limit kredytowy)`,
        amount: roundCurrency(Number(acc.creditLimit)),
        type: "credit_limit",
      });
    }
  }

  const totalDebt = roundCurrency(debtItems.reduce((sum, item) => sum + item.amount, 0));
  const isDebtFree = totalDebt <= 0;
  const isLowData = debtItems.length === 0;

  const snowballQueue = [...debtItems]
    .sort((a, b) => a.amount - b.amount)
    .map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      type: item.type,
    }));

  const thisMonthTransactions = (profile.transactions || []).filter((t) => {
    if (!t.isoDate) return false;
    const d = new Date(`${t.isoDate}T12:00:00`);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx;
  });

  const thisMonthIncome = thisMonthTransactions
    .filter((t) => t.type === "income" && typeof t.amount === "number" && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonthExpense = thisMonthTransactions
    .filter((t) => t.type === "expense" && typeof t.amount === "number" && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyAvailableSurplus = roundCurrency(Math.max(0, thisMonthIncome - thisMonthExpense));
  const baselineMonthlyPayment = monthlyAvailableSurplus > 0 ? monthlyAvailableSurplus : 300;
  const acceleratedMonthlyPayment = baselineMonthlyPayment + extraPayment;

  const baselineMonths = totalDebt > 0
    ? Math.ceil(totalDebt / baselineMonthlyPayment)
    : 0;

  const acceleratedMonths = totalDebt > 0
    ? Math.ceil(totalDebt / acceleratedMonthlyPayment)
    : 0;

  const monthsSaved = Math.max(0, baselineMonths - acceleratedMonths);

  return {
    totalDebt,
    totalDebtLikeAmount: totalDebt,
    debtItemsCount: debtItems.length,
    debtItems,
    monthlyAvailableSurplus,
    extraPayment,
    baselineMonthlyPayment,
    acceleratedMonthlyPayment,
    baselineMonths,
    acceleratedMonths,
    monthsSaved,
    snowballQueue,
    isDebtFree,
    isLowData,
    strategy: "snowball",
    strategyLabel: "Kula śnieżna (Snowball)",
  };
}

/**
 * Backward-compatible alias matching previous calculateDebtPayoffSimulator signature
 */
export function calculateDebtPayoffSimulator(
  profile: Profile | null,
  selectedDate: Date,
  extraPayment: number = 0
): DebtPayoffSummary {
  return getDebtPayoffSummary(profile, { selectedDate, extraPayment });
}
