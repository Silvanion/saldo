import { DebtItem, DebtType } from "../types";

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

export interface RefinanceInput {
  balance: number;
  currentRate: number; // in percent e.g. 6.85
  currentMonthlyPayment: number;
  currentRemainingMonths?: number;
  newRate: number; // in percent e.g. 5.50
  newTermMonths?: number; // e.g. 240
  closingCosts?: number; // e.g. 4500 (one-time valuation, commission, notary, court fee)
  newMonthlyPaymentOverride?: number;
}

export type RefinanceBenefitStatus = "likely_beneficial" | "marginal" | "not_beneficial";

export interface RefinanceComparisonResult {
  current: {
    monthlyPayment: number;
    remainingMonths: number;
    remainingTotalInterest: number;
    remainingTotalCost: number;
  };
  refinanced: {
    monthlyPayment: number;
    termMonths: number;
    totalInterest: number;
    closingCosts: number;
    totalCost: number;
  };
  comparison: {
    monthlyDifference: number; // positive = monthly reduction
    totalInterestDifference: number; // positive = gross interest saved
    netLifetimeSavings: number; // totalInterestDifference - closingCosts
    fiveYearNetSavings: number; // estimated savings in first 5 years minus costs
    breakEvenMonths: number | null; // months to recover closing costs
    benefitStatus: RefinanceBenefitStatus;
    statusReason: string;
  };
}

export interface DebtTypeMixItem {
  type: DebtType;
  typeLabel: string;
  count: number;
  totalBalance: number;
  balanceSharePct: number;
  monthlyBurden: number;
  monthlyBurdenSharePct: number;
  estimatedInterest: number;
  interestSharePct: number;
}

export interface DebtAnalyticsSummary {
  totalActiveBalance: number;
  totalMonthlyService: number;
  totalEstimatedInterest: number;
  debtMix: DebtTypeMixItem[];
  costConcentration: {
    top1Debt: { name: string; type: DebtType; interestAmount: number; sharePct: number } | null;
    top2SharePct: number;
  };
  rateExposure: {
    fixedBalance: number;
    fixedSharePct: number;
    variableBalance: number;
    variableSharePct: number;
  };
  payoffHorizon: {
    shortest: { name: string; months: number } | null;
    longest: { name: string; months: number } | null;
  };
  refinanceCandidates: Array<{
    debt: DebtItem;
    reason: string;
  }>;
  insightSignals: Array<{
    id: string;
    tone: "brand" | "warning" | "danger" | "neutral";
    title: string;
    description: string;
  }>;
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

/**
 * Pure calculation engine for Refinance comparison (Sprint 2 Refinance MVP)
 */
export function calculateRefinanceComparison(input: RefinanceInput): RefinanceComparisonResult {
  const balance = Math.max(0, Number(input.balance) || 0);
  const currentRate = Math.max(0, Number(input.currentRate) || 0);
  const currentMonthly = Math.max(0, Number(input.currentMonthlyPayment) || 0);
  const newRate = Math.max(0, Number(input.newRate) || 0);
  const closingCosts = Math.max(0, Number(input.closingCosts) || 0);

  // 1. Current Baseline
  const currentSchedule = calculateAmortizationSchedule(balance, currentRate, currentMonthly, 360);
  const currentRemainingMonths = input.currentRemainingMonths && input.currentRemainingMonths > 0
    ? input.currentRemainingMonths
    : (currentSchedule.length || 240);
  const currentTotalInterest = currentSchedule.reduce((sum, r) => sum + r.interest, 0);
  const currentTotalCost = balance + currentTotalInterest;

  // 2. Refinanced Scenario
  const newTerm = input.newTermMonths && input.newTermMonths > 0
    ? input.newTermMonths
    : currentRemainingMonths;

  const newMonthlyRate = (newRate / 100) / 12;
  let refinancedMonthlyPayment = 0;

  if (input.newMonthlyPaymentOverride && input.newMonthlyPaymentOverride > 0) {
    refinancedMonthlyPayment = input.newMonthlyPaymentOverride;
  } else if (newMonthlyRate > 0 && newTerm > 0 && balance > 0) {
    const factor = Math.pow(1 + newMonthlyRate, newTerm);
    refinancedMonthlyPayment = Math.round((balance * ((newMonthlyRate * factor) / (factor - 1))) * 100) / 100;
  } else if (newTerm > 0 && balance > 0) {
    refinancedMonthlyPayment = Math.round((balance / newTerm) * 100) / 100;
  }

  const refinancedSchedule = calculateAmortizationSchedule(
    balance,
    newRate,
    refinancedMonthlyPayment,
    newTerm + 12
  );
  const refinancedTotalInterest = refinancedSchedule.reduce((sum, r) => sum + r.interest, 0);
  const refinancedTotalCost = balance + refinancedTotalInterest + closingCosts;

  // 3. Comparison & Metrics
  const monthlyDifference = Math.round((currentMonthly - refinancedMonthlyPayment) * 100) / 100;
  const totalInterestDifference = Math.round((currentTotalInterest - refinancedTotalInterest) * 100) / 100;
  const netLifetimeSavings = Math.round((totalInterestDifference - closingCosts) * 100) / 100;

  // 5-Year net savings estimation
  const current5YInterest = currentSchedule.slice(0, 60).reduce((sum, r) => sum + r.interest, 0);
  const refinanced5YInterest = refinancedSchedule.slice(0, 60).reduce((sum, r) => sum + r.interest, 0);
  const fiveYearInterestSavings = Math.max(0, current5YInterest - refinanced5YInterest);
  const fiveYearNetSavings = Math.round((fiveYearInterestSavings - closingCosts) * 100) / 100;

  // Break-even determination
  let breakEvenMonths: number | null = null;
  if (closingCosts === 0 && monthlyDifference > 0) {
    breakEvenMonths = 0;
  } else if (monthlyDifference > 0) {
    breakEvenMonths = Math.ceil(closingCosts / monthlyDifference);
  } else if (netLifetimeSavings > 0) {
    // If payment didn't drop (e.g. shorter term), check when cumulative interest saved overtakes closing costs
    let cumulativeSaved = 0;
    for (let m = 0; m < Math.max(currentSchedule.length, refinancedSchedule.length); m++) {
      const cInterest = currentSchedule[m] ? currentSchedule[m].interest : 0;
      const rInterest = refinancedSchedule[m] ? refinancedSchedule[m].interest : 0;
      cumulativeSaved += (cInterest - rInterest);
      if (cumulativeSaved >= closingCosts) {
        breakEvenMonths = m + 1;
        break;
      }
    }
  }

  // Benefit Status Heuristic
  let benefitStatus: RefinanceBenefitStatus = "not_beneficial";
  let statusReason = "";

  if (balance <= 0) {
    benefitStatus = "not_beneficial";
    statusReason = "Brak salda zadłużenia do refinansowania.";
  } else if (newRate >= currentRate && netLifetimeSavings <= 0) {
    benefitStatus = "not_beneficial";
    statusReason = `Nowe oprocentowanie (${newRate}%) jest wyższe lub równe obecnemu (${currentRate}%).`;
  } else if (netLifetimeSavings <= 0) {
    benefitStatus = "not_beneficial";
    statusReason = "Koszty refinansowania przewyższają łączne oszczędności odsetkowe.";
  } else if (breakEvenMonths !== null && breakEvenMonths <= 48 && netLifetimeSavings > 3000) {
    benefitStatus = "likely_beneficial";
    statusReason = `Szacowany zwrot kosztów w ${breakEvenMonths} mies. oraz ${Math.round(netLifetimeSavings).toLocaleString()} zł oszczędności netto.`;
  } else {
    benefitStatus = "marginal";
    statusReason = `Umiarkowana korzyść netto (${Math.round(netLifetimeSavings).toLocaleString()} zł) lub dłuższy czas zwrotu (${breakEvenMonths ? `${breakEvenMonths} mies.` : "długi okres"}).`;
  }

  return {
    current: {
      monthlyPayment: currentMonthly,
      remainingMonths: currentRemainingMonths,
      remainingTotalInterest: Math.round(currentTotalInterest),
      remainingTotalCost: Math.round(currentTotalCost)
    },
    refinanced: {
      monthlyPayment: refinancedMonthlyPayment,
      termMonths: newTerm,
      totalInterest: Math.round(refinancedTotalInterest),
      closingCosts: Math.round(closingCosts),
      totalCost: Math.round(refinancedTotalCost)
    },
    comparison: {
      monthlyDifference,
      totalInterestDifference,
      netLifetimeSavings,
      fiveYearNetSavings,
      breakEvenMonths,
      benefitStatus,
      statusReason
    }
  };
}

/**
 * Calculates deep portfolio analytics (Sprint 2 Deeper Debt Analytics)
 */
export function calculateDebtPortfolioAnalytics(debts: DebtItem[] = []): DebtAnalyticsSummary {
  const activeDebts = debts.filter((d) => d && d.status !== "closed");

  const totalActiveBalance = activeDebts.reduce((sum, d) => sum + Math.max(0, Number(d.balance) || 0), 0);
  const totalMonthlyService = activeDebts.reduce((sum, d) => sum + Math.max(0, Number(d.monthlyPayment) || 0), 0);

  // Calculate estimated interest for each debt
  const debtsWithInterest = activeDebts.map((d) => {
    const bal = Math.max(0, Number(d.balance) || 0);
    const rate = Math.max(0, Number(d.interestRate) || 0);
    const pmt = Math.max(0, Number(d.monthlyPayment) || 0);
    let estimatedInterest = 0;
    let months = d.remainingMonths || 0;

    if (bal > 0 && rate > 0 && pmt > 0) {
      const schedule = calculateAmortizationSchedule(bal, rate, pmt, 360);
      estimatedInterest = schedule.reduce((acc, r) => acc + r.interest, 0);
      if (!months) months = schedule.length;
    }

    return {
      debt: d,
      balance: bal,
      monthly: pmt,
      rate,
      estimatedInterest: Math.round(estimatedInterest),
      months
    };
  });

  const totalEstimatedInterest = debtsWithInterest.reduce((sum, d) => sum + d.estimatedInterest, 0);

  // 1. Debt Mix Breakdown
  const typeMap: Record<DebtType, { label: string; count: number; balance: number; monthly: number; interest: number }> = {
    mortgage: { label: "Hipoteka", count: 0, balance: 0, monthly: 0, interest: 0 },
    credit_card: { label: "Karta kredytowa", count: 0, balance: 0, monthly: 0, interest: 0 },
    cash_loan: { label: "Kredyt gotówkowy", count: 0, balance: 0, monthly: 0, interest: 0 },
    revolving: { label: "Limit odnawialny", count: 0, balance: 0, monthly: 0, interest: 0 },
    bnpl: { label: "Raty 0% / BNPL", count: 0, balance: 0, monthly: 0, interest: 0 },
    other: { label: "Inne", count: 0, balance: 0, monthly: 0, interest: 0 }
  };

  for (const item of debtsWithInterest) {
    const t = item.debt.type || "other";
    if (!typeMap[t]) {
      typeMap[t] = { label: "Inne", count: 0, balance: 0, monthly: 0, interest: 0 };
    }
    typeMap[t].count += 1;
    typeMap[t].balance += item.balance;
    typeMap[t].monthly += item.monthly;
    typeMap[t].interest += item.estimatedInterest;
  }

  const debtMix: DebtTypeMixItem[] = (Object.keys(typeMap) as DebtType[])
    .filter((t) => typeMap[t].count > 0)
    .map((t) => {
      const data = typeMap[t];
      return {
        type: t,
        typeLabel: data.label,
        count: data.count,
        totalBalance: data.balance,
        balanceSharePct: totalActiveBalance > 0 ? Math.round((data.balance / totalActiveBalance) * 1000) / 10 : 0,
        monthlyBurden: data.monthly,
        monthlyBurdenSharePct: totalMonthlyService > 0 ? Math.round((data.monthly / totalMonthlyService) * 1000) / 10 : 0,
        estimatedInterest: data.interest,
        interestSharePct: totalEstimatedInterest > 0 ? Math.round((data.interest / totalEstimatedInterest) * 1000) / 10 : 0
      };
    })
    .sort((a, b) => b.totalBalance - a.totalBalance);

  // 2. Cost Concentration
  const sortedByInterest = [...debtsWithInterest].sort((a, b) => b.estimatedInterest - a.estimatedInterest);
  let top1Debt = null;
  let top2SharePct = 0;

  if (sortedByInterest.length > 0 && totalEstimatedInterest > 0) {
    const top1 = sortedByInterest[0];
    top1Debt = {
      name: top1.debt.name,
      type: top1.debt.type,
      interestAmount: top1.estimatedInterest,
      sharePct: Math.round((top1.estimatedInterest / totalEstimatedInterest) * 100)
    };

    const top2Interest = (sortedByInterest[0]?.estimatedInterest || 0) + (sortedByInterest[1]?.estimatedInterest || 0);
    top2SharePct = Math.round((top2Interest / totalEstimatedInterest) * 100);
  }

  // 3. Fixed vs Variable Rate Exposure
  let fixedBalance = 0;
  let variableBalance = 0;

  for (const item of debtsWithInterest) {
    if (item.debt.rateType === "fixed") {
      fixedBalance += item.balance;
    } else {
      variableBalance += item.balance;
    }
  }

  const rateExposure = {
    fixedBalance,
    fixedSharePct: totalActiveBalance > 0 ? Math.round((fixedBalance / totalActiveBalance) * 100) : 0,
    variableBalance,
    variableSharePct: totalActiveBalance > 0 ? Math.round((variableBalance / totalActiveBalance) * 100) : 0
  };

  // 4. Payoff Horizon
  const debtsWithMonths = debtsWithInterest.filter((d) => d.months > 0);
  let shortest = null;
  let longest = null;

  if (debtsWithMonths.length > 0) {
    const sortedByMonths = [...debtsWithMonths].sort((a, b) => a.months - b.months);
    shortest = { name: sortedByMonths[0].debt.name, months: sortedByMonths[0].months };
    longest = { name: sortedByMonths[sortedByMonths.length - 1].debt.name, months: sortedByMonths[sortedByMonths.length - 1].months };
  }

  // 5. Refinance Candidates Heuristic
  const refinanceCandidates: Array<{ debt: DebtItem; reason: string }> = [];

  for (const item of debtsWithInterest) {
    if (item.debt.type === "mortgage" && item.balance >= 50000 && item.rate >= 6.2) {
      refinanceCandidates.push({
        debt: item.debt,
        reason: `Oprocentowanie ${item.rate.toFixed(2)}% przy saldzie ${Math.round(item.balance).toLocaleString()} zł stwarza przestrzeń do weryfikacji ofert refinansowania.`
      });
    } else if (item.debt.type === "cash_loan" && item.balance >= 15000 && item.rate >= 10.0) {
      refinanceCandidates.push({
        debt: item.debt,
        reason: `Wysoki koszt pożyczki (${item.rate.toFixed(1)}%) — potencjalna konsolidacja lub refinansowanie.`
      });
    }
  }

  // 6. Insight Signals
  const insightSignals: Array<{ id: string; tone: "brand" | "warning" | "danger" | "neutral"; title: string; description: string }> = [];

  if (top1Debt && top1Debt.sharePct >= 60) {
    insightSignals.push({
      id: "signal-concentration",
      tone: "brand",
      title: "Wysoka koncentracja kosztu odsetkowego",
      description: `${top1Debt.name} generuje aż ${top1Debt.sharePct}% całkowitego szacowanego kosztu odsetkowego portfela.`
    });
  }

  if (refinanceCandidates.length > 0) {
    insightSignals.push({
      id: "signal-refi",
      tone: "brand",
      title: `Kandydat do refinansowania: ${refinanceCandidates[0].debt.name}`,
      description: refinanceCandidates[0].reason
    });
  }

  const highAprDebt = debtsWithInterest.find((d) => d.rate >= 15.0 && d.balance > 1000);
  if (highAprDebt) {
    insightSignals.push({
      id: "signal-expensive",
      tone: "danger",
      title: `Najdroższe zadłużenie: ${highAprDebt.debt.name} (APR ${highAprDebt.rate.toFixed(1)}%)`,
      description: "Zalecany priorytet spłaty w pierwszej kolejności, aby ograniczyć bieżące koszty finansowe."
    });
  }

  if (rateExposure.fixedSharePct > 0 && rateExposure.variableSharePct > 0) {
    insightSignals.push({
      id: "signal-exposure",
      tone: "neutral",
      title: "Struktura ryzyka stóp procentowych",
      description: `${rateExposure.fixedSharePct}% salda ma stałe oprocentowanie, a ${rateExposure.variableSharePct}% jest wrażliwe na zmiany stóp WIBOR/WIRON.`
    });
  }

  return {
    totalActiveBalance,
    totalMonthlyService,
    totalEstimatedInterest,
    debtMix,
    costConcentration: {
      top1Debt,
      top2SharePct
    },
    rateExposure,
    payoffHorizon: {
      shortest,
      longest
    },
    refinanceCandidates,
    insightSignals
  };
}
