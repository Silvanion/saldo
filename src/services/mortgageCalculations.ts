import { DebtItem } from "../types";
import { calculateDebtOverpaymentScenario } from "./debtCalculations";

export interface LtvMetrics {
  propertyValue: number;
  currentBalance: number;
  ltvPercent: number; // np. 72.5%
  status: "safe" | "warning" | "critical"; // safe <=80%, warning 80-90%, critical >90%
  overpaymentTo80Ltv: number; // kwota w PLN potrzebna do osiągnięcia LTV <= 80%
  overpaymentTo90Ltv: number;
  threshold80Amount: number;
  threshold90Amount: number;
}

export function calculateLtvMetrics(
  balance: number,
  propertyValue?: number | null
): LtvMetrics | null {
  if (!propertyValue || propertyValue <= 0 || balance < 0) {
    return null;
  }

  const cleanBalance = Number(balance) || 0;
  const cleanPropertyValue = Number(propertyValue) || 0;
  const ltvPercent = Math.round((cleanBalance / cleanPropertyValue) * 1000) / 10;

  let status: "safe" | "warning" | "critical" = "safe";
  if (ltvPercent > 90) {
    status = "critical";
  } else if (ltvPercent > 80) {
    status = "warning";
  }

  const threshold80Amount = Math.round(cleanPropertyValue * 0.8 * 100) / 100;
  const threshold90Amount = Math.round(cleanPropertyValue * 0.9 * 100) / 100;

  const overpaymentTo80Ltv = Math.max(
    0,
    Math.round((cleanBalance - threshold80Amount) * 100) / 100
  );
  const overpaymentTo90Ltv = Math.max(
    0,
    Math.round((cleanBalance - threshold90Amount) * 100) / 100
  );

  return {
    propertyValue: cleanPropertyValue,
    currentBalance: cleanBalance,
    ltvPercent,
    status,
    overpaymentTo80Ltv,
    overpaymentTo90Ltv,
    threshold80Amount,
    threshold90Amount
  };
}

export function calculateAnnuityInstallment(
  balance: number,
  annualRatePercent: number,
  months: number
): number {
  if (months <= 0 || balance <= 0) return 0;
  const cleanRate = Math.max(0, Number(annualRatePercent) || 0);
  const r = cleanRate / 100 / 12;

  if (r === 0) {
    return Math.round((balance / months) * 100) / 100;
  }

  const pow = Math.pow(1 + r, months);
  const installment = (balance * (r * pow)) / (pow - 1);
  return Math.round(installment * 100) / 100;
}

export interface StressTestScenario {
  rateDelta: number; // np. -2.0, -1.0, 0, +1.0, +2.0, +3.0
  simulatedRate: number;
  simulatedMonthlyPayment: number;
  paymentDiff: number;
  annualBudgetImpact: number;
  percentageChange: number;
}

export interface StressTestResult {
  baseRate: number;
  currentPayment: number;
  remainingMonths: number;
  scenarios: StressTestScenario[];
  knfPlus300PbPayment: number;
  knfPlus300PbDiff: number;
}

export function calculateInterestRateStressTest(
  balance: number,
  currentRate: number,
  remainingMonths: number,
  currentPayment?: number
): StressTestResult {
  const cleanBalance = Math.max(0, Number(balance) || 0);
  const cleanRate = Math.max(0.01, Number(currentRate) || 0);
  const cleanMonths = Math.max(1, Math.round(Number(remainingMonths) || 240));

  const baselinePayment =
    currentPayment && currentPayment > 0
      ? currentPayment
      : calculateAnnuityInstallment(cleanBalance, cleanRate, cleanMonths);

  const deltas = [-3.0, -2.0, -1.0, -0.5, 0, 0.5, 1.0, 2.0, 3.0, 4.0];

  const scenarios: StressTestScenario[] = deltas.map((delta) => {
    const simulatedRate = Math.max(0.1, Math.round((cleanRate + delta) * 100) / 100);
    const simulatedMonthlyPayment = calculateAnnuityInstallment(
      cleanBalance,
      simulatedRate,
      cleanMonths
    );
    const paymentDiff = Math.round((simulatedMonthlyPayment - baselinePayment) * 100) / 100;
    const annualBudgetImpact = Math.round(paymentDiff * 12 * 100) / 100;
    const percentageChange =
      baselinePayment > 0
        ? Math.round((paymentDiff / baselinePayment) * 1000) / 10
        : 0;

    return {
      rateDelta: delta,
      simulatedRate,
      simulatedMonthlyPayment,
      paymentDiff,
      annualBudgetImpact,
      percentageChange
    };
  });

  const knfScenario = scenarios.find((s) => s.rateDelta === 3.0) || {
    simulatedMonthlyPayment: calculateAnnuityInstallment(cleanBalance, cleanRate + 3.0, cleanMonths),
    paymentDiff: Math.round((calculateAnnuityInstallment(cleanBalance, cleanRate + 3.0, cleanMonths) - baselinePayment) * 100) / 100
  };

  return {
    baseRate: cleanRate,
    currentPayment: baselinePayment,
    remainingMonths: cleanMonths,
    scenarios,
    knfPlus300PbPayment: knfScenario.simulatedMonthlyPayment,
    knfPlus300PbDiff: knfScenario.paymentDiff
  };
}

export interface CreditVacationResult {
  vacationMonthsCount: number;
  totalSuspendedAmount: number;
  reinvestInOverpayment: boolean;
  interestSaved: number;
  monthsShortened: number;
  newBalanceAfterOverpayment: number;
  netBenefit: number;
}

export function calculateCreditVacationImpact(
  debt: DebtItem,
  vacationMonths: number,
  reinvestInOverpayment: boolean,
  maxMonths: number = 360
): CreditVacationResult {
  const cleanMonthsCount = Math.max(1, Math.min(12, Math.round(vacationMonths)));
  const monthlyPayment =
    debt.monthlyPayment ||
    calculateAnnuityInstallment(debt.balance, debt.interestRate, debt.remainingMonths || 240);

  const totalSuspendedAmount = Math.round(cleanMonthsCount * monthlyPayment * 100) / 100;

  if (!reinvestInOverpayment || totalSuspendedAmount <= 0) {
    return {
      vacationMonthsCount: cleanMonthsCount,
      totalSuspendedAmount,
      reinvestInOverpayment: false,
      interestSaved: 0,
      monthsShortened: -cleanMonthsCount, // okres wydłuża się o zawieszone miesiące
      newBalanceAfterOverpayment: debt.balance,
      netBenefit: 0
    };
  }

  const scenario = calculateDebtOverpaymentScenario(
    debt,
    0,
    totalSuspendedAmount,
    maxMonths,
    0,
    "reduce_term"
  );

  const newBalance = Math.max(0, Math.round((debt.balance - totalSuspendedAmount) * 100) / 100);

  return {
    vacationMonthsCount: cleanMonthsCount,
    totalSuspendedAmount,
    reinvestInOverpayment: true,
    interestSaved: scenario.interestSavings,
    monthsShortened: scenario.monthsSaved,
    newBalanceAfterOverpayment: newBalance,
    netBenefit: scenario.interestSavings
  };
}

export interface DecreasingVsEqualComparison {
  annuity: {
    monthlyPayment: number;
    totalInterest: number;
    totalRepayment: number;
  };
  decreasing: {
    firstInstallment: number;
    lastInstallment: number;
    averageInstallment: number;
    totalInterest: number;
    totalRepayment: number;
  };
  interestDifference: number;
  firstInstallmentPremium: number;
  savingsPercent: number;
}

export function compareAnnuityVsDecreasing(
  balance: number,
  annualRatePercent: number,
  months: number
): DecreasingVsEqualComparison {
  const cleanBalance = Math.max(0, Number(balance) || 0);
  const cleanRate = Math.max(0, Number(annualRatePercent) || 0);
  const cleanMonths = Math.max(1, Math.round(Number(months) || 240));

  if (cleanBalance === 0) {
    return {
      annuity: { monthlyPayment: 0, totalInterest: 0, totalRepayment: 0 },
      decreasing: { firstInstallment: 0, lastInstallment: 0, averageInstallment: 0, totalInterest: 0, totalRepayment: 0 },
      interestDifference: 0,
      firstInstallmentPremium: 0,
      savingsPercent: 0
    };
  }

  // Raty równe (Annuitet)
  const annuityPayment = calculateAnnuityInstallment(cleanBalance, cleanRate, cleanMonths);
  const annuityTotalRepayment = Math.round(annuityPayment * cleanMonths * 100) / 100;
  const annuityTotalInterest = Math.max(0, Math.round((annuityTotalRepayment - cleanBalance) * 100) / 100);

  // Raty malejące
  const principalPerMonth = cleanBalance / cleanMonths;
  const monthlyRate = cleanRate / 100 / 12;

  const firstInstallment = Math.round((principalPerMonth + cleanBalance * monthlyRate) * 100) / 100;
  const lastInstallment = Math.round((principalPerMonth + principalPerMonth * monthlyRate) * 100) / 100;
  
  // Wzór dokładny na sumę odsetek przy ratach malejących: S = K * r * (n + 1) / 2
  const decreasingTotalInterest = Math.round(((cleanBalance * monthlyRate * (cleanMonths + 1)) / 2) * 100) / 100;
  const decreasingTotalRepayment = Math.round((cleanBalance + decreasingTotalInterest) * 100) / 100;
  const averageInstallment = Math.round((decreasingTotalRepayment / cleanMonths) * 100) / 100;

  const interestDifference = Math.max(0, Math.round((annuityTotalInterest - decreasingTotalInterest) * 100) / 100);
  const firstInstallmentPremium = Math.round((firstInstallment - annuityPayment) * 100) / 100;
  const savingsPercent = annuityTotalInterest > 0
    ? Math.round((interestDifference / annuityTotalInterest) * 1000) / 10
    : 0;

  return {
    annuity: {
      monthlyPayment: annuityPayment,
      totalInterest: annuityTotalInterest,
      totalRepayment: annuityTotalRepayment
    },
    decreasing: {
      firstInstallment,
      lastInstallment,
      averageInstallment,
      totalInterest: decreasingTotalInterest,
      totalRepayment: decreasingTotalRepayment
    },
    interestDifference,
    firstInstallmentPremium,
    savingsPercent
  };
}
