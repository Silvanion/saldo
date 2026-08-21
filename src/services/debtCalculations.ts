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

export interface RefinanceOfferInput {
  id: string;
  name: string;
  bankName?: string;
  newRate: number; // in percent e.g. 5.50
  closingCosts: number; // e.g. 4500
  newTermMonths: number; // e.g. 240
  rateType?: "fixed" | "variable";
}

export interface RefinanceMultiOfferItem {
  offer: RefinanceOfferInput;
  result: RefinanceComparisonResult;
  isValid: boolean;
  validationError?: string;
  isBestOffer: boolean; // highest net savings
  isFastestBreakEven: boolean;
  isHighestNetSavings: boolean;
  rank: number; // 1 = best
}

export interface RefinanceMultiOfferComparisonResult {
  current: {
    monthlyPayment: number;
    remainingMonths: number;
    remainingTotalInterest: number;
    remainingTotalCost: number;
  };
  offers: RefinanceMultiOfferItem[];
  bestOfferId: string | null;
  fastestBreakEvenOfferId: string | null;
  highestNetSavingsOfferId: string | null;
}

export type DebtPayoffStrategyType = "avalanche" | "snowball" | "baseline" | "custom";

export interface DebtPayoffQueueItem {
  debtId: string;
  debtName: string;
  institution: string;
  type: DebtType;
  initialBalance: number;
  interestRate: number;
  monthlyPayment: number;
  payoffMonth: number;
  payoffDate: string; // e.g. "2028-06"
  totalInterestPaid: number;
}

export interface DebtPayoffStrategyResult {
  strategy: DebtPayoffStrategyType;
  strategyLabel: string;
  strategyBadge: string;
  strategyDescription: string;
  extraMonthlyPayment: number;
  totalMonthlyCommitment: number;
  totalMonths: number;
  debtFreeDate: string;
  totalInterestPaid: number;
  interestSavedVsBaseline: number;
  monthsSavedVsBaseline: number;
  payoffQueue: DebtPayoffQueueItem[];
}

export interface PortfolioPayoffComparison {
  baseline: DebtPayoffStrategyResult;
  avalanche: DebtPayoffStrategyResult;
  snowball: DebtPayoffStrategyResult;
  custom?: DebtPayoffStrategyResult;
  recommendedStrategy: DebtPayoffStrategyType;
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
  } else if (newRate >= currentRate) {
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
 * Check if a debt is eligible/supported for refinancing
 */
export function isSupportedRefinanceDebt(debt: DebtItem | null | undefined): boolean {
  if (!debt) return false;
  if (debt.status === "closed") return false;
  if (debt.type !== "mortgage" && debt.type !== "cash_loan") return false;
  if ((Number(debt.balance) || 0) <= 0) return false;
  if ((Number(debt.interestRate) || 0) <= 0) return false;
  return true;
}

/**
 * Pure calculation engine for Multi-Offer Refinance comparison (Sprint 3)
 */
export function calculateMultiOfferRefinanceComparison(
  baseInput: {
    balance: number;
    currentRate: number;
    currentMonthlyPayment: number;
    currentRemainingMonths?: number;
  },
  offers: RefinanceOfferInput[] = []
): RefinanceMultiOfferComparisonResult {
  const balance = Math.max(0, Number(baseInput.balance) || 0);
  const currentRate = Math.max(0, Number(baseInput.currentRate) || 0);
  const currentMonthly = Math.max(0, Number(baseInput.currentMonthlyPayment) || 0);

  const baselineSchedule = calculateAmortizationSchedule(balance, currentRate, currentMonthly, 360);
  const currentRemainingMonths = baseInput.currentRemainingMonths && baseInput.currentRemainingMonths > 0
    ? baseInput.currentRemainingMonths
    : (baselineSchedule.length || 240);
  const currentTotalInterest = baselineSchedule.reduce((sum, r) => sum + r.interest, 0);
  const currentTotalCost = balance + currentTotalInterest;

  const currentInfo = {
    monthlyPayment: currentMonthly,
    remainingMonths: currentRemainingMonths,
    remainingTotalInterest: Math.round(currentTotalInterest),
    remainingTotalCost: Math.round(currentTotalCost)
  };

  if (!offers || offers.length === 0) {
    return {
      current: currentInfo,
      offers: [],
      bestOfferId: null,
      fastestBreakEvenOfferId: null,
      highestNetSavingsOfferId: null
    };
  }

  const evaluatedOffers = offers.map((offer) => {
    // Validate individual offer input
    const isRateValid = typeof offer.newRate === "number" && !isNaN(offer.newRate) && offer.newRate > 0;
    const isTermValid = typeof offer.newTermMonths === "number" && !isNaN(offer.newTermMonths) && offer.newTermMonths > 0;
    const isCostValid = typeof offer.closingCosts === "number" && !isNaN(offer.closingCosts) && offer.closingCosts >= 0;

    let isValid = true;
    let validationError: string | undefined;

    if (!isRateValid) {
      isValid = false;
      validationError = "Wprowadź poprawne oprocentowanie (większe od zera).";
    } else if (!isTermValid) {
      isValid = false;
      validationError = "Wprowadź poprawny okres spłaty (w miesiącach).";
    } else if (!isCostValid) {
      isValid = false;
      validationError = "Koszty wejścia nie mogą być ujemne.";
    }

    const safeRate = isRateValid ? offer.newRate : 0;
    const safeTerm = isTermValid ? offer.newTermMonths : currentRemainingMonths;
    const safeCosts = isCostValid ? offer.closingCosts : 0;

    const result = calculateRefinanceComparison({
      balance,
      currentRate,
      currentMonthlyPayment: currentMonthly,
      currentRemainingMonths,
      newRate: safeRate,
      newTermMonths: safeTerm,
      closingCosts: safeCosts
    });

    return {
      offer,
      result,
      isValid,
      validationError
    };
  });

  const validOffers = evaluatedOffers.filter((o) => o.isValid);

  // 1. Highest Net Savings Offer
  const profitableOffers = validOffers.filter((o) => o.result.comparison.netLifetimeSavings > 0);
  const sortedBySavings = [...profitableOffers].sort((a, b) => b.result.comparison.netLifetimeSavings - a.result.comparison.netLifetimeSavings);
  const highestNetSavingsOfferId = sortedBySavings[0]?.offer.id || null;

  // 2. Fastest Break Even Offer
  const breakEvenOffers = validOffers.filter(
    (o) => o.result.comparison.breakEvenMonths !== null && o.result.comparison.netLifetimeSavings > 0
  );
  const sortedByBreakEven = [...breakEvenOffers].sort((a, b) => {
    const beA = a.result.comparison.breakEvenMonths ?? 9999;
    const beB = b.result.comparison.breakEvenMonths ?? 9999;
    if (beA !== beB) return beA - beB;
    return b.result.comparison.netLifetimeSavings - a.result.comparison.netLifetimeSavings;
  });
  const fastestBreakEvenOfferId = sortedByBreakEven[0]?.offer.id || null;

  // 3. Best overall offer (highest savings)
  const bestOfferId = highestNetSavingsOfferId;

  // 4. Ranking
  const sortedAll = [...evaluatedOffers].sort((a, b) => {
    if (a.isValid && !b.isValid) return -1;
    if (!a.isValid && b.isValid) return 1;
    return b.result.comparison.netLifetimeSavings - a.result.comparison.netLifetimeSavings;
  });

  const rankedOffers: RefinanceMultiOfferItem[] = evaluatedOffers.map((item) => {
    const rankIndex = sortedAll.findIndex((s) => s.offer.id === item.offer.id);
    const isHighest = item.isValid && item.offer.id === highestNetSavingsOfferId;
    const isFastest = item.isValid && item.offer.id === fastestBreakEvenOfferId;
    const isBest = isHighest;

    return {
      offer: item.offer,
      result: item.result,
      isValid: item.isValid,
      validationError: item.validationError,
      isBestOffer: isBest,
      isFastestBreakEven: isFastest,
      isHighestNetSavings: isHighest,
      rank: rankIndex + 1
    };
  });

  return {
    current: currentInfo,
    offers: rankedOffers,
    bestOfferId,
    fastestBreakEvenOfferId,
    highestNetSavingsOfferId
  };
}

/**
 * Pure calculation helper taking debt directly (Sprint 3 helper alias)
 */
export function calculateMultiOfferComparison(
  debt: {
    balance: number;
    interestRate: number;
    monthlyPayment: number;
    remainingMonths?: number;
  },
  offers: RefinanceOfferInput[] = []
): RefinanceMultiOfferComparisonResult {
  return calculateMultiOfferRefinanceComparison(
    {
      balance: debt.balance,
      currentRate: debt.interestRate,
      currentMonthlyPayment: debt.monthlyPayment,
      currentRemainingMonths: debt.remainingMonths
    },
    offers
  );
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

/**
 * Formats a base date + month offset into a readable year-month string (e.g. "wrz 2029" or "2029-09")
 */
function formatPayoffMonthDate(startDateStr: string | undefined, monthOffset: number): string {
  const base = startDateStr ? new Date(startDateStr) : new Date();
  const validBase = isNaN(base.getTime()) ? new Date() : base;

  const targetDate = new Date(validBase.getFullYear(), validBase.getMonth() + monthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  const monthNames = [
    "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
    "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
  ];

  return `${monthNames[month]} ${year}`;
}

/**
 * Helper to build and validate custom payoff order without mutations (Sprint 5)
 */
export function buildValidatedCustomOrder(activeDebts: DebtItem[] = [], customPayoffOrder?: string[]): string[] {
  const activeIds = (activeDebts || [])
    .filter((d) => d && d.status !== "closed" && (Number(d.balance) || 0) > 0)
    .map((d) => d.id);
  const activeSet = new Set(activeIds);

  const seen = new Set<string>();
  const validOrder: string[] = [];

  if (Array.isArray(customPayoffOrder)) {
    for (const id of customPayoffOrder) {
      if (typeof id === "string" && activeSet.has(id) && !seen.has(id)) {
        seen.add(id);
        validOrder.push(id);
      }
    }
  }

  // Append any active debts that were omitted in customPayoffOrder deterministically
  for (const id of activeIds) {
    if (!seen.has(id)) {
      seen.add(id);
      validOrder.push(id);
    }
  }

  return validOrder;
}

/**
 * Simulates a portfolio payoff strategy month-by-month (Sprint 4 & 5 Payoff Strategies)
 */
function simulateSinglePayoffStrategy(
  activeDebts: DebtItem[],
  strategy: DebtPayoffStrategyType,
  extraPayment: number,
  startDateStr?: string,
  customPayoffOrder?: string[]
): DebtPayoffStrategyResult {
  const strategyInfo = {
    avalanche: {
      label: "Metoda Lawiny (Avalanche)",
      badge: "Najwyższy APR",
      description: "Matematycznie optymalna — nadpłacasz dług o najwyższym oprocentowaniu, oszczędzając najwięcej na odsetkach."
    },
    snowball: {
      label: "Metoda Kuli Śnieżnej (Snowball)",
      badge: "Najmniejsze saldo",
      description: "Behawioralna — likwidujesz najpierw najmniejsze salda, szybko zmniejszając liczbę czynnych kredytów."
    },
    custom: {
      label: "Własna kolejność",
      badge: "Kolejność własna",
      description: "Elastyczna — spłacasz zobowiązania według ustalonej przez Ciebie kolejności priorytetów."
    },
    baseline: {
      label: "Status Quo (Tylko raty)",
      badge: "Brak nadpłat",
      description: "Spłacasz wyłącznie minimalne wymagane raty każdego kredytu bez dodatkowych nadpłat."
    }
  }[strategy];

  if (!activeDebts || activeDebts.length === 0) {
    return {
      strategy,
      strategyLabel: strategyInfo.label,
      strategyBadge: strategyInfo.badge,
      strategyDescription: strategyInfo.description,
      extraMonthlyPayment: extraPayment,
      totalMonthlyCommitment: 0,
      totalMonths: 0,
      debtFreeDate: formatPayoffMonthDate(startDateStr, 0),
      totalInterestPaid: 0,
      interestSavedVsBaseline: 0,
      monthsSavedVsBaseline: 0,
      payoffQueue: []
    };
  }

  const validatedCustomOrder = buildValidatedCustomOrder(activeDebts, customPayoffOrder);
  const customOrderMap = new Map(validatedCustomOrder.map((id, index) => [id, index]));

  const baselineMonthlySum = activeDebts.reduce((sum, d) => sum + Math.max(0, Number(d.monthlyPayment) || 0), 0);
  const totalMonthlyCommitment = baselineMonthlySum + (strategy === "baseline" ? 0 : extraPayment);

  // Initialize simulation items
  interface SimDebtItem {
    id: string;
    name: string;
    institution: string;
    type: DebtType;
    balance: number;
    initialBalance: number;
    rate: number;
    monthlyRate: number;
    minPayment: number;
    totalInterest: number;
    payoffMonth: number | null;
  }

  const simDebts: SimDebtItem[] = activeDebts.map((d) => {
    const bal = Math.max(0, Number(d.balance) || 0);
    const rate = Math.max(0, Number(d.interestRate) || 0);
    const minPay = Math.max(0, Number(d.monthlyPayment) || 0);

    return {
      id: d.id,
      name: d.name,
      institution: d.institution,
      type: d.type,
      balance: bal,
      initialBalance: bal,
      rate,
      monthlyRate: (rate / 100) / 12,
      minPayment: minPay,
      totalInterest: 0,
      payoffMonth: null
    };
  });

  const MAX_MONTHS = 600; // 50 years cap safety
  let currentMonth = 0;

  while (currentMonth < MAX_MONTHS) {
    currentMonth++;
    const remainingDebts = simDebts.filter((d) => d.balance > 0.01);
    if (remainingDebts.length === 0) {
      break;
    }

    // 1. Accrue interest for this month
    for (const d of remainingDebts) {
      const monthInterest = d.balance * d.monthlyRate;
      d.totalInterest += monthInterest;
      d.balance += monthInterest;
    }

    // 2. Pay minimum payments
    let basePaidThisMonth = 0;
    for (const d of remainingDebts) {
      const payment = Math.min(d.balance, d.minPayment);
      d.balance -= payment;
      basePaidThisMonth += payment;

      if (d.balance <= 0.01 && d.payoffMonth === null) {
        d.balance = 0;
        d.payoffMonth = currentMonth;
      }
    }

    // 3. Apply surplus (Extra payment + freed-up minimum payments)
    if (strategy !== "baseline") {
      let surplus = Math.max(0, totalMonthlyCommitment - basePaidThisMonth);

      // Sort remaining active debts according to strategy
      const stillActive = simDebts.filter((d) => d.balance > 0.01);
      if (strategy === "avalanche") {
        // Highest APR first; tie-breaker: smaller balance
        stillActive.sort((a, b) => (b.rate !== a.rate ? b.rate - a.rate : a.balance - b.balance));
      } else if (strategy === "snowball") {
        // Lowest balance first; tie-breaker: higher APR
        stillActive.sort((a, b) => (a.balance !== b.balance ? a.balance - b.balance : b.rate - a.rate));
      } else if (strategy === "custom") {
        stillActive.sort((a, b) => {
          const idxA = customOrderMap.get(a.id) ?? 9999;
          const idxB = customOrderMap.get(b.id) ?? 9999;
          return idxA - idxB;
        });
      }

      for (const target of stillActive) {
        if (surplus <= 0.01) break;
        const extraToApply = Math.min(target.balance, surplus);
        target.balance -= extraToApply;
        surplus -= extraToApply;

        if (target.balance <= 0.01 && target.payoffMonth === null) {
          target.balance = 0;
          target.payoffMonth = currentMonth;
        }
      }
    }
  }

  // Ensure all debts have payoff month
  for (const d of simDebts) {
    if (d.payoffMonth === null) {
      d.payoffMonth = MAX_MONTHS;
    }
  }

  const totalMonths = Math.max(0, ...simDebts.map((d) => d.payoffMonth || 0));
  const totalInterestPaid = Math.round(simDebts.reduce((sum, d) => sum + d.totalInterest, 0));

  // Build payoff queue sorted by payoffMonth ascending
  const payoffQueue: DebtPayoffQueueItem[] = [...simDebts]
    .sort((a, b) => (a.payoffMonth || 0) - (b.payoffMonth || 0))
    .map((d) => ({
      debtId: d.id,
      debtName: d.name,
      institution: d.institution,
      type: d.type,
      initialBalance: d.initialBalance,
      interestRate: d.rate,
      monthlyPayment: d.minPayment,
      payoffMonth: d.payoffMonth || totalMonths,
      payoffDate: formatPayoffMonthDate(startDateStr, d.payoffMonth || totalMonths),
      totalInterestPaid: Math.round(d.totalInterest)
    }));

  return {
    strategy,
    strategyLabel: strategyInfo.label,
    strategyBadge: strategyInfo.badge,
    strategyDescription: strategyInfo.description,
    extraMonthlyPayment: extraPayment,
    totalMonthlyCommitment: Math.round(totalMonthlyCommitment),
    totalMonths,
    debtFreeDate: formatPayoffMonthDate(startDateStr, totalMonths),
    totalInterestPaid,
    interestSavedVsBaseline: 0, // calculated in comparison wrapper
    monthsSavedVsBaseline: 0, // calculated in comparison wrapper
    payoffQueue
  };
}

/**
 * Main Pure Calculation Engine for Debt Payoff Strategies (Sprint 4 & 5)
 */
export function calculatePortfolioPayoffStrategies(
  debts: DebtItem[] = [],
  extraMonthlyPayment: number = 0,
  startDateStr?: string,
  customPayoffOrder?: string[]
): PortfolioPayoffComparison {
  const activeDebts = debts.filter((d) => d && d.status !== "closed" && (Number(d.balance) || 0) > 0);
  const extraPayment = Math.max(0, Number(extraMonthlyPayment) || 0);

  // 1. Simulate Baseline (Status Quo)
  const baseline = simulateSinglePayoffStrategy(activeDebts, "baseline", 0, startDateStr);

  // 2. Simulate Avalanche (Highest APR First)
  const avalanche = simulateSinglePayoffStrategy(activeDebts, "avalanche", extraPayment, startDateStr);
  avalanche.interestSavedVsBaseline = Math.max(0, baseline.totalInterestPaid - avalanche.totalInterestPaid);
  avalanche.monthsSavedVsBaseline = Math.max(0, baseline.totalMonths - avalanche.totalMonths);

  // 3. Simulate Snowball (Smallest Balance First)
  const snowball = simulateSinglePayoffStrategy(activeDebts, "snowball", extraPayment, startDateStr);
  snowball.interestSavedVsBaseline = Math.max(0, baseline.totalInterestPaid - snowball.totalInterestPaid);
  snowball.monthsSavedVsBaseline = Math.max(0, baseline.totalMonths - snowball.totalMonths);

  // 4. Simulate Custom (Custom Payoff Order)
  const custom = simulateSinglePayoffStrategy(activeDebts, "custom", extraPayment, startDateStr, customPayoffOrder);
  custom.interestSavedVsBaseline = Math.max(0, baseline.totalInterestPaid - custom.totalInterestPaid);
  custom.monthsSavedVsBaseline = Math.max(0, baseline.totalMonths - custom.totalMonths);

  // 5. Recommendation heuristic:
  let recommendedStrategy: DebtPayoffStrategyType = "avalanche";
  if (avalanche.interestSavedVsBaseline >= snowball.interestSavedVsBaseline + 200) {
    recommendedStrategy = "avalanche";
  } else if (
    snowball.payoffQueue.length > 0 &&
    avalanche.payoffQueue.length > 0 &&
    snowball.payoffQueue[0].payoffMonth < avalanche.payoffQueue[0].payoffMonth
  ) {
    recommendedStrategy = "snowball";
  } else {
    recommendedStrategy = "avalanche";
  }

  return {
    baseline,
    avalanche,
    snowball,
    custom,
    recommendedStrategy
  };
}

