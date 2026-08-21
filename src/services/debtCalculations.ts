import { DebtItem } from "../types";

export interface PortfolioDebtKpis {
  totalBalance: number;
  monthlyDebtService: number;
  remainingInterest: number;
  weightedInterestRate: number;
  mostExpensiveDebt: { name: string; apr: number } | null;
  nearestPayment: { name: string; date: string; amount: number } | null;
  activeCount: number;
  closedCount: number;
}

export interface AmortizationScheduleRow {
  monthIndex: number;
  installment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface OverpaymentSimulationResult {
  baseline: {
    months: number;
    totalInterest: number;
    monthlyPayment: number;
  };
  withOverpayment: {
    months: number;
    totalInterest: number;
    monthlyPayment: number;
  };
  savings: {
    interestSaved: number;
    monthsSaved: number;
    yearsSaved: number;
    monthlyReduction: number;
  };
}

/**
 * Calculates portfolio-level summary KPIs for active debts
 */
export function calculatePortfolioDebtKpis(debts: DebtItem[] = []): PortfolioDebtKpis {
  const activeDebts = debts.filter((d) => d && d.status !== "closed");
  const closedCount = debts.filter((d) => d && d.status === "closed").length;

  if (activeDebts.length === 0) {
    return {
      totalBalance: 0,
      monthlyDebtService: 0,
      remainingInterest: 0,
      weightedInterestRate: 0,
      mostExpensiveDebt: null,
      nearestPayment: null,
      activeCount: 0,
      closedCount
    };
  }

  let totalBalance = 0;
  let monthlyDebtService = 0;
  let totalWeightedRateNumerator = 0;
  let estimatedTotalInterest = 0;

  let mostExpensive: { name: string; apr: number } | null = null;
  let highestApr = -1;

  let nearestPayment: { name: string; date: string; amount: number } | null = null;

  for (const debt of activeDebts) {
    const bal = Math.max(0, Number(debt.balance) || 0);
    const pmt = Math.max(0, Number(debt.monthlyPayment) || 0);
    const rate = Math.max(0, Number(debt.interestRate) || 0);

    totalBalance += bal;
    monthlyDebtService += pmt;
    totalWeightedRateNumerator += bal * rate;

    // Track highest APR debt
    if (rate > highestApr) {
      highestApr = rate;
      mostExpensive = {
        name: debt.name || "Zobowiązanie",
        apr: rate
      };
    }

    // Nearest payment candidate
    if (debt.nextPaymentDate && !nearestPayment) {
      nearestPayment = {
        name: debt.name || "Zobowiązanie",
        date: debt.nextPaymentDate,
        amount: pmt
      };
    }

    // Estimate remaining interest for this debt
    if (bal > 0 && rate > 0 && pmt > 0) {
      const schedule = calculateAmortizationSchedule(bal, rate, pmt, 360);
      const debtInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
      estimatedTotalInterest += debtInterest;
    }
  }

  const weightedInterestRate = totalBalance > 0 ? totalWeightedRateNumerator / totalBalance : 0;

  // Fallback nearest payment if no nextPaymentDate was set
  if (!nearestPayment && activeDebts.length > 0) {
    const firstWithPmt = activeDebts.find((d) => (d.monthlyPayment || 0) > 0) || activeDebts[0];
    nearestPayment = {
      name: firstWithPmt.name,
      date: "Bieżący miesiąc",
      amount: firstWithPmt.monthlyPayment || 0
    };
  }

  return {
    totalBalance,
    monthlyDebtService,
    remainingInterest: Math.round(estimatedTotalInterest),
    weightedInterestRate: Math.round(weightedInterestRate * 100) / 100,
    mostExpensiveDebt: mostExpensive,
    nearestPayment,
    activeCount: activeDebts.length,
    closedCount
  };
}

/**
 * Calculates standard month-by-month amortization schedule
 */
export function calculateAmortizationSchedule(
  balance: number,
  annualRatePct: number,
  monthlyPayment: number,
  maxMonths = 360
): AmortizationScheduleRow[] {
  if (balance <= 0 || monthlyPayment <= 0) {
    return [];
  }

  const monthlyRate = (annualRatePct / 100) / 12;
  const rows: AmortizationScheduleRow[] = [];
  let currentBalance = balance;

  for (let m = 1; m <= maxMonths; m++) {
    if (currentBalance <= 0.01) break;

    const interest = Math.round((currentBalance * monthlyRate) * 100) / 100;
    
    // If payment doesn't cover interest, avoid runaway infinite loop
    if (monthlyPayment <= interest && monthlyRate > 0) {
      rows.push({
        monthIndex: m,
        installment: monthlyPayment,
        principal: 0,
        interest: monthlyPayment,
        balance: currentBalance
      });
      break;
    }

    const principal = Math.min(currentBalance, Math.max(0, monthlyPayment - interest));
    const installment = principal + interest;
    currentBalance = Math.max(0, currentBalance - principal);

    rows.push({
      monthIndex: m,
      installment: Math.round(installment * 100) / 100,
      principal: Math.round(principal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(currentBalance * 100) / 100
    });

    if (currentBalance === 0) break;
  }

  return rows;
}

/**
 * Simulates overpayment scenarios (shorten term vs reduce payment)
 */
export function calculateOverpayment({
  balance,
  annualRatePct,
  monthlyPayment,
  overpaymentAmount,
  frequency = "monthly",
  targetStrategy = "reduce_term",
  maxMonths = 360
}: {
  balance: number;
  annualRatePct: number;
  monthlyPayment: number;
  overpaymentAmount: number;
  frequency: "one_time" | "monthly" | "yearly";
  targetStrategy: "reduce_term" | "reduce_payment";
  maxMonths?: number;
}): OverpaymentSimulationResult {
  const defaultResult: OverpaymentSimulationResult = {
    baseline: { months: 0, totalInterest: 0, monthlyPayment },
    withOverpayment: { months: 0, totalInterest: 0, monthlyPayment },
    savings: { interestSaved: 0, monthsSaved: 0, yearsSaved: 0, monthlyReduction: 0 }
  };

  if (balance <= 0 || monthlyPayment <= 0) {
    return defaultResult;
  }

  const monthlyRate = (annualRatePct / 100) / 12;

  // 1. Calculate Baseline
  const baselineSchedule = calculateAmortizationSchedule(balance, annualRatePct, monthlyPayment, maxMonths);
  const baselineMonths = baselineSchedule.length;
  const baselineTotalInterest = baselineSchedule.reduce((sum, r) => sum + r.interest, 0);

  if (overpaymentAmount <= 0) {
    return {
      baseline: { months: baselineMonths, totalInterest: baselineTotalInterest, monthlyPayment },
      withOverpayment: { months: baselineMonths, totalInterest: baselineTotalInterest, monthlyPayment },
      savings: { interestSaved: 0, monthsSaved: 0, yearsSaved: 0, monthlyReduction: 0 }
    };
  }

  // 2. Strategy: Shorten Term (Keep monthly payment, apply extra cash to principal)
  if (targetStrategy === "reduce_term") {
    let currentBalance = balance;
    let overpaymentInterest = 0;
    let overpaymentMonths = 0;

    for (let m = 1; m <= maxMonths; m++) {
      if (currentBalance <= 0.01) break;

      const interest = Math.round((currentBalance * monthlyRate) * 100) / 100;
      overpaymentInterest += interest;

      let extra = 0;
      if (frequency === "monthly") {
        extra = overpaymentAmount;
      } else if (frequency === "one_time" && m === 1) {
        extra = overpaymentAmount;
      } else if (frequency === "yearly" && (m % 12 === 1 || m === 1)) {
        extra = overpaymentAmount;
      }

      const totalPaymentThisMonth = monthlyPayment + extra;
      const principal = Math.min(currentBalance, Math.max(0, totalPaymentThisMonth - interest));
      currentBalance = Math.max(0, currentBalance - principal);
      overpaymentMonths = m;

      if (currentBalance === 0) break;
    }

    const interestSaved = Math.max(0, Math.round((baselineTotalInterest - overpaymentInterest) * 100) / 100);
    const monthsSaved = Math.max(0, baselineMonths - overpaymentMonths);
    const yearsSaved = Math.round((monthsSaved / 12) * 10) / 10;

    return {
      baseline: {
        months: baselineMonths,
        totalInterest: Math.round(baselineTotalInterest),
        monthlyPayment
      },
      withOverpayment: {
        months: overpaymentMonths,
        totalInterest: Math.round(overpaymentInterest),
        monthlyPayment
      },
      savings: {
        interestSaved,
        monthsSaved,
        yearsSaved,
        monthlyReduction: 0
      }
    };
  }

  // 3. Strategy: Reduce Payment (Apply overpayment, recalculate new lower monthly payment over remaining term)
  let initialBalanceAfterOverpayment = balance;
  if (frequency === "one_time") {
    initialBalanceAfterOverpayment = Math.max(0, balance - overpaymentAmount);
  }

  const remainingMonths = baselineMonths > 0 ? baselineMonths : 240;
  let newMonthlyPayment = monthlyPayment;

  if (monthlyRate > 0 && remainingMonths > 0 && initialBalanceAfterOverpayment > 0) {
    const factor = Math.pow(1 + monthlyRate, remainingMonths);
    const annuityPayment = initialBalanceAfterOverpayment * ((monthlyRate * factor) / (factor - 1));
    newMonthlyPayment = Math.max(0, Math.round(annuityPayment * 100) / 100);
  } else if (remainingMonths > 0) {
    newMonthlyPayment = Math.round((initialBalanceAfterOverpayment / remainingMonths) * 100) / 100;
  }

  const newSchedule = calculateAmortizationSchedule(
    initialBalanceAfterOverpayment,
    annualRatePct,
    newMonthlyPayment,
    remainingMonths + 12
  );
  const newTotalInterest = newSchedule.reduce((sum, r) => sum + r.interest, 0);

  const interestSaved = Math.max(0, Math.round((baselineTotalInterest - newTotalInterest) * 100) / 100);
  const monthlyReduction = Math.max(0, Math.round((monthlyPayment - newMonthlyPayment) * 100) / 100);

  return {
    baseline: {
      months: baselineMonths,
      totalInterest: Math.round(baselineTotalInterest),
      monthlyPayment
    },
    withOverpayment: {
      months: newSchedule.length,
      totalInterest: Math.round(newTotalInterest),
      monthlyPayment: newMonthlyPayment
    },
    savings: {
      interestSaved,
      monthsSaved: 0,
      yearsSaved: 0,
      monthlyReduction
    }
  };
}
