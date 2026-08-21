import { describe, it, expect } from "vitest";
import {
  calculatePortfolioDebtKpis,
  calculateAmortizationSchedule,
  calculateOverpayment,
  calculateRefinanceComparison,
  calculateMultiOfferRefinanceComparison,
  calculateDebtPortfolioAnalytics,
  RefinanceOfferInput
} from "./debtCalculations";
import { DebtItem } from "../types";

describe("debtCalculations", () => {
  describe("calculatePortfolioDebtKpis", () => {
    it("returns zeroed KPIs when debts list is empty", () => {
      const kpis = calculatePortfolioDebtKpis([]);
      expect(kpis.totalBalance).toBe(0);
      expect(kpis.monthlyDebtService).toBe(0);
      expect(kpis.remainingInterest).toBe(0);
      expect(kpis.weightedInterestRate).toBe(0);
      expect(kpis.mostExpensiveDebt).toBeNull();
      expect(kpis.activeCount).toBe(0);
      expect(kpis.closedCount).toBe(0);
    });

    it("calculates totals, weighted rate, and identifies highest APR", () => {
      const mockDebts: DebtItem[] = [
        {
          id: "1",
          name: "Hipoteka",
          institution: "PKO",
          type: "mortgage",
          currency: "PLN",
          balance: 300000,
          monthlyPayment: 2500,
          interestRate: 7.0,
          status: "active",
          createdAt: "2026-01-01"
        },
        {
          id: "2",
          name: "Karta Visa",
          institution: "mBank",
          type: "credit_card",
          currency: "PLN",
          balance: 10000,
          monthlyPayment: 500,
          interestRate: 19.0,
          status: "active",
          createdAt: "2026-01-01"
        },
        {
          id: "3",
          name: "Stary kredyt",
          institution: "Santander",
          type: "cash_loan",
          currency: "PLN",
          balance: 0,
          monthlyPayment: 0,
          interestRate: 10.0,
          status: "closed",
          createdAt: "2025-01-01"
        }
      ];

      const kpis = calculatePortfolioDebtKpis(mockDebts);
      expect(kpis.totalBalance).toBe(310000);
      expect(kpis.monthlyDebtService).toBe(3000);
      expect(kpis.activeCount).toBe(2);
      expect(kpis.closedCount).toBe(1);
      expect(kpis.mostExpensiveDebt?.name).toBe("Karta Visa");
      expect(kpis.mostExpensiveDebt?.apr).toBe(19.0);

      // Weighted rate: (300000 * 7 + 10000 * 19) / 310000 = (2100000 + 190000) / 310000 = 2290000 / 310000 = ~7.39%
      expect(kpis.weightedInterestRate).toBeCloseTo(7.39, 1);
    });
  });

  describe("calculateAmortizationSchedule", () => {
    it("calculates diminishing balance and terminates when balance is zero", () => {
      const schedule = calculateAmortizationSchedule(10000, 12, 1000, 24);
      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule[0].monthIndex).toBe(1);
      expect(schedule[0].interest).toBe(100); // 10000 * 0.01 = 100
      expect(schedule[0].principal).toBe(900); // 1000 - 100 = 900
      expect(schedule[0].balance).toBe(9100);

      const lastRow = schedule[schedule.length - 1];
      expect(lastRow.balance).toBe(0);
    });
  });

  describe("calculateOverpayment", () => {
    it("computes interest saved and time gained for reduce_term strategy", () => {
      const result = calculateOverpayment({
        balance: 100000,
        annualRatePct: 8.0,
        monthlyPayment: 1200,
        overpaymentAmount: 500,
        frequency: "monthly",
        targetStrategy: "reduce_term"
      });

      expect(result.baseline.months).toBeGreaterThan(result.withOverpayment.months);
      expect(result.savings.monthsSaved).toBeGreaterThan(0);
      expect(result.savings.interestSaved).toBeGreaterThan(0);
      expect(result.savings.yearsSaved).toBeGreaterThan(0);
    });

    it("computes lower monthly payment for reduce_payment strategy", () => {
      const result = calculateOverpayment({
        balance: 100000,
        annualRatePct: 8.0,
        monthlyPayment: 1200,
        overpaymentAmount: 20000,
        frequency: "one_time",
        targetStrategy: "reduce_payment"
      });

      expect(result.withOverpayment.monthlyPayment).toBeLessThan(result.baseline.monthlyPayment);
      expect(result.savings.monthlyReduction).toBeGreaterThan(0);
      expect(result.savings.interestSaved).toBeGreaterThan(0);
    });
  });

  describe("calculateRefinanceComparison (Sprint 2 Refinance MVP)", () => {
    it("evaluates a beneficial refinance offer with lower rate and reasonable break-even", () => {
      const result = calculateRefinanceComparison({
        balance: 400000,
        currentRate: 7.2,
        currentMonthlyPayment: 2950,
        currentRemainingMonths: 240,
        newRate: 5.8,
        newTermMonths: 240,
        closingCosts: 6000
      });

      expect(result.refinanced.monthlyPayment).toBeLessThan(result.current.monthlyPayment);
      expect(result.comparison.monthlyDifference).toBeGreaterThan(0);
      expect(result.comparison.totalInterestDifference).toBeGreaterThan(6000);
      expect(result.comparison.netLifetimeSavings).toBeGreaterThan(0);
      expect(result.comparison.breakEvenMonths).toBeLessThanOrEqual(48);
      expect(result.comparison.benefitStatus).toBe("likely_beneficial");
    });

    it("evaluates a higher rate scenario as not beneficial", () => {
      const result = calculateRefinanceComparison({
        balance: 300000,
        currentRate: 6.0,
        currentMonthlyPayment: 2150,
        currentRemainingMonths: 240,
        newRate: 7.5,
        newTermMonths: 240,
        closingCosts: 3000
      });

      expect(result.comparison.benefitStatus).toBe("not_beneficial");
      expect(result.comparison.netLifetimeSavings).toBeLessThan(0);
      expect(result.comparison.statusReason).toContain("wyższe");
    });

    it("evaluates a scenario where closing costs exceed interest savings", () => {
      const result = calculateRefinanceComparison({
        balance: 50000,
        currentRate: 6.5,
        currentMonthlyPayment: 1500,
        currentRemainingMonths: 36,
        newRate: 6.0,
        newTermMonths: 36,
        closingCosts: 10000 // excessive cost for small loan
      });

      expect(result.comparison.benefitStatus).toBe("not_beneficial");
      expect(result.comparison.netLifetimeSavings).toBeLessThan(0);
    });

    it("handles 0 closing costs accurately with breakEvenMonths = 0", () => {
      const result = calculateRefinanceComparison({
        balance: 200000,
        currentRate: 7.0,
        currentMonthlyPayment: 1800,
        currentRemainingMonths: 180,
        newRate: 5.5,
        newTermMonths: 180,
        closingCosts: 0
      });

      expect(result.comparison.breakEvenMonths).toBe(0);
      expect(result.comparison.netLifetimeSavings).toBeGreaterThan(0);
    });
  });

  describe("calculateMultiOfferRefinanceComparison (Sprint 3 Multi-Offer Comparison)", () => {
    const baseParams = {
      balance: 400000,
      currentRate: 7.2,
      currentMonthlyPayment: 2900,
      currentRemainingMonths: 240
    };

    it("handles empty offers array gracefully", () => {
      const result = calculateMultiOfferRefinanceComparison(baseParams, []);
      expect(result.current.monthlyPayment).toBe(2900);
      expect(result.offers).toHaveLength(0);
      expect(result.bestOfferId).toBeNull();
    });

    it("compares multiple offers, ranks them, and identifies the best offer", () => {
      const offers: RefinanceOfferInput[] = [
        {
          id: "offer-1",
          name: "Oferta A (PKO)",
          bankName: "PKO BP",
          newRate: 6.2,
          closingCosts: 4000,
          newTermMonths: 240
        },
        {
          id: "offer-2",
          name: "Oferta B (ING)",
          bankName: "ING",
          newRate: 5.6, // Much lower rate, best savings despite higher costs
          closingCosts: 6000,
          newTermMonths: 240
        },
        {
          id: "offer-3",
          name: "Oferta C (mBank)",
          bankName: "mBank",
          newRate: 7.5, // Worse rate than current
          closingCosts: 3000,
          newTermMonths: 240
        }
      ];

      const result = calculateMultiOfferRefinanceComparison(baseParams, offers);

      expect(result.offers).toHaveLength(3);
      expect(result.bestOfferId).toBe("offer-2");

      const bestOffer = result.offers.find((o) => o.offer.id === "offer-2");
      expect(bestOffer).toBeDefined();
      expect(bestOffer?.isBestOffer).toBe(true);
      expect(bestOffer?.rank).toBe(1);
      expect(bestOffer?.result.comparison.netLifetimeSavings).toBeGreaterThan(0);
      expect(bestOffer?.result.comparison.benefitStatus).toBe("likely_beneficial");

      const secondOffer = result.offers.find((o) => o.offer.id === "offer-1");
      expect(secondOffer?.rank).toBe(2);
      expect(secondOffer?.isBestOffer).toBe(false);

      const worstOffer = result.offers.find((o) => o.offer.id === "offer-3");
      expect(worstOffer?.rank).toBe(3);
      expect(worstOffer?.isBestOffer).toBe(false);
      expect(worstOffer?.result.comparison.benefitStatus).toBe("not_beneficial");
    });

    it("handles scenario where all offers are unprofitable", () => {
      const unprofitableOffers: RefinanceOfferInput[] = [
        {
          id: "bad-1",
          name: "Oferta zła 1",
          newRate: 8.0,
          closingCosts: 5000,
          newTermMonths: 240
        },
        {
          id: "bad-2",
          name: "Oferta zła 2",
          newRate: 7.8,
          closingCosts: 8000,
          newTermMonths: 240
        }
      ];

      const result = calculateMultiOfferRefinanceComparison(baseParams, unprofitableOffers);
      expect(result.offers).toHaveLength(2);
      // none should be flagged as beneficial best offer
      expect(result.offers.every((o) => o.isBestOffer === false)).toBe(true);
    });
  });

  describe("calculateDebtPortfolioAnalytics (Sprint 2 Deeper Analytics)", () => {
    const testDebts: DebtItem[] = [
      {
        id: "1",
        name: "Hipoteka mieszkaniowa",
        institution: "PKO BP",
        type: "mortgage",
        currency: "PLN",
        balance: 400000,
        monthlyPayment: 2800,
        interestRate: 6.85,
        rateType: "fixed",
        remainingMonths: 240,
        status: "active",
        createdAt: "2026-01-01"
      },
      {
        id: "2",
        name: "Karta Visa",
        institution: "mBank",
        type: "credit_card",
        currency: "PLN",
        balance: 10000,
        monthlyPayment: 500,
        interestRate: 18.9,
        rateType: "variable",
        status: "active",
        createdAt: "2026-01-01"
      },
      {
        id: "3",
        name: "Raty Allegro",
        institution: "Allegro Pay",
        type: "bnpl",
        currency: "PLN",
        balance: 1200,
        monthlyPayment: 600,
        interestRate: 0,
        remainingMonths: 2,
        status: "active",
        createdAt: "2026-01-01"
      }
    ];

    it("computes debt mix, cost concentration, and rate exposure", () => {
      const analytics = calculateDebtPortfolioAnalytics(testDebts);

      expect(analytics.totalActiveBalance).toBe(411200);
      expect(analytics.totalMonthlyService).toBe(3900);
      expect(analytics.debtMix.length).toBe(3);

      // Cost concentration: Mortgage generates bulk of long-term interest
      expect(analytics.costConcentration.top1Debt?.name).toBe("Hipoteka mieszkaniowa");
      expect(analytics.costConcentration.top1Debt?.sharePct).toBeGreaterThan(80);

      // Rate exposure
      expect(analytics.rateExposure.fixedBalance).toBe(400000);
      expect(analytics.rateExposure.fixedSharePct).toBeGreaterThan(95);

      // Payoff horizon
      expect(analytics.payoffHorizon.shortest?.name).toBe("Raty Allegro");
      expect(analytics.payoffHorizon.longest?.name).toBe("Hipoteka mieszkaniowa");

      // Refinance candidates & signals
      expect(analytics.refinanceCandidates.length).toBeGreaterThan(0);
      expect(analytics.insightSignals.length).toBeGreaterThan(0);
    });
  });
});
