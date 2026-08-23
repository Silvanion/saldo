import { describe, it, expect } from "vitest";
import {
  calculatePortfolioDebtKpis,
  calculateAmortizationSchedule,
  calculateDebtAmortizationSchedule,
  calculateDebtOverpaymentScenario,
  calculateDebtOverpaymentVariants,
  DebtOverpaymentVariantInput,
  calculateDebtPaymentBreakdown,
  calculateDebtPaymentReversal,
  calculateDebtPaymentActivity,
  calculateOverpayment,
  calculateRefinanceComparison,
  calculateMultiOfferRefinanceComparison,
  calculateMultiOfferComparison,
  isSupportedRefinanceDebt,
  calculateDebtPortfolioAnalytics,
  calculatePortfolioPayoffStrategies,
  buildValidatedCustomOrder,
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

    it("identifies different winners for fastest break-even vs highest net savings", () => {
      const offers: RefinanceOfferInput[] = [
        {
          id: "low-cost-fast-be",
          name: "Oferta z niskimi kosztami",
          newRate: 6.2,
          closingCosts: 1000, // Very low costs -> very fast break-even
          newTermMonths: 240
        },
        {
          id: "low-rate-high-savings",
          name: "Oferta z niskim procentem",
          newRate: 5.2,
          closingCosts: 9000, // High costs, but massive lifetime interest reduction
          newTermMonths: 240
        }
      ];

      const result = calculateMultiOfferRefinanceComparison(baseParams, offers);

      expect(result.fastestBreakEvenOfferId).toBe("low-cost-fast-be");
      expect(result.highestNetSavingsOfferId).toBe("low-rate-high-savings");

      const fastOffer = result.offers.find((o) => o.offer.id === "low-cost-fast-be");
      const highSavOffer = result.offers.find((o) => o.offer.id === "low-rate-high-savings");

      expect(fastOffer?.isFastestBreakEven).toBe(true);
      expect(fastOffer?.isHighestNetSavings).toBe(false);

      expect(highSavOffer?.isHighestNetSavings).toBe(true);
      expect(highSavOffer?.isFastestBreakEven).toBe(false);
    });

    it("isolates invalid offers without breaking calculation of valid ones", () => {
      const mixedOffers: RefinanceOfferInput[] = [
        {
          id: "valid-1",
          name: "Prawidłowa",
          newRate: 5.0,
          closingCosts: 4000,
          newTermMonths: 240
        },
        {
          id: "invalid-1",
          name: "Błędne ujemne oprocentowanie",
          newRate: -2.5,
          closingCosts: 4000,
          newTermMonths: 240
        },
        {
          id: "invalid-2",
          name: "Brak okresu",
          newRate: 5.5,
          closingCosts: 4000,
          newTermMonths: 0
        }
      ];

      const result = calculateMultiOfferRefinanceComparison(baseParams, mixedOffers);

      expect(result.offers).toHaveLength(3);

      const validOffer = result.offers.find((o) => o.offer.id === "valid-1");
      expect(validOffer?.isValid).toBe(true);
      expect(validOffer?.result.comparison.benefitStatus).toBe("likely_beneficial");

      const invalidOffer1 = result.offers.find((o) => o.offer.id === "invalid-1");
      expect(invalidOffer1?.isValid).toBe(false);
      expect(invalidOffer1?.validationError).toContain("oprocentowanie");

      const invalidOffer2 = result.offers.find((o) => o.offer.id === "invalid-2");
      expect(invalidOffer2?.isValid).toBe(false);
      expect(invalidOffer2?.validationError).toContain("okres");

      // Valid offer is still chosen as best
      expect(result.bestOfferId).toBe("valid-1");
    });

    it("calculates via direct calculateMultiOfferComparison helper", () => {
      const debtMock = {
        balance: 350000,
        interestRate: 7.0,
        monthlyPayment: 2600,
        remainingMonths: 240
      };
      const offers: RefinanceOfferInput[] = [
        {
          id: "off-1",
          name: "Oferta A",
          newRate: 5.9,
          closingCosts: 3500,
          newTermMonths: 240
        }
      ];

      const result = calculateMultiOfferComparison(debtMock, offers);
      expect(result.offers).toHaveLength(1);
      expect(result.offers[0].result.comparison.netLifetimeSavings).toBeGreaterThan(0);
    });

    it("verifies isSupportedRefinanceDebt eligibility rules", () => {
      expect(isSupportedRefinanceDebt(null)).toBe(false);
      expect(
        isSupportedRefinanceDebt({
          id: "1",
          name: "Hipoteka",
          institution: "PKO",
          type: "mortgage",
          currency: "PLN",
          balance: 200000,
          monthlyPayment: 1500,
          interestRate: 6.5,
          status: "active",
          createdAt: "2026-01-01"
        })
      ).toBe(true);

      expect(
        isSupportedRefinanceDebt({
          id: "2",
          name: "Gotówkowy",
          institution: "Alior",
          type: "cash_loan",
          currency: "PLN",
          balance: 30000,
          monthlyPayment: 800,
          interestRate: 10.0,
          status: "active",
          createdAt: "2026-01-01"
        })
      ).toBe(true);

      // Unsupported: credit card
      expect(
        isSupportedRefinanceDebt({
          id: "3",
          name: "Karta",
          institution: "mBank",
          type: "credit_card",
          currency: "PLN",
          balance: 5000,
          monthlyPayment: 200,
          interestRate: 18.0,
          status: "active",
          createdAt: "2026-01-01"
        })
      ).toBe(false);

      // Unsupported: closed debt
      expect(
        isSupportedRefinanceDebt({
          id: "4",
          name: "Spłacony",
          institution: "PKO",
          type: "mortgage",
          currency: "PLN",
          balance: 0,
          monthlyPayment: 0,
          interestRate: 6.5,
          status: "closed",
          createdAt: "2026-01-01"
        })
      ).toBe(false);
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

  describe("calculatePortfolioPayoffStrategies (Sprint 4 Payoff Strategies)", () => {
    const portfolioDebts: DebtItem[] = [
      {
        id: "1",
        name: "Karta Kredytowa",
        institution: "mBank",
        type: "credit_card",
        currency: "PLN",
        balance: 6000,
        monthlyPayment: 300,
        interestRate: 18.5,
        status: "active",
        createdAt: "2026-01-01"
      },
      {
        id: "2",
        name: "Pożyczka Gotówkowa",
        institution: "Santander",
        type: "cash_loan",
        currency: "PLN",
        balance: 20000,
        monthlyPayment: 600,
        interestRate: 11.0,
        status: "active",
        createdAt: "2026-01-01"
      },
      {
        id: "3",
        name: "Hipoteka",
        institution: "PKO BP",
        type: "mortgage",
        currency: "PLN",
        balance: 300000,
        monthlyPayment: 2300,
        interestRate: 6.8,
        status: "active",
        createdAt: "2026-01-01"
      }
    ];

    it("handles empty debts array gracefully", () => {
      const result = calculatePortfolioPayoffStrategies([], 500);
      expect(result.baseline.totalMonths).toBe(0);
      expect(result.avalanche.totalMonths).toBe(0);
      expect(result.snowball.totalMonths).toBe(0);
      expect(result.baseline.payoffQueue).toHaveLength(0);
    });

    it("simulates baseline payoff with 0 extra payment", () => {
      const result = calculatePortfolioPayoffStrategies(portfolioDebts, 0);
      expect(result.baseline.extraMonthlyPayment).toBe(0);
      expect(result.baseline.totalMonths).toBeGreaterThan(0);
      expect(result.baseline.totalInterestPaid).toBeGreaterThan(0);
      expect(result.baseline.payoffQueue).toHaveLength(3);
    });

    it("accelerates payoff and saves interest with extra payment under Avalanche and Snowball", () => {
      const extraPayment = 1000;
      const result = calculatePortfolioPayoffStrategies(portfolioDebts, extraPayment);

      // Both strategies should finish faster and pay less interest than baseline
      expect(result.avalanche.totalMonths).toBeLessThan(result.baseline.totalMonths);
      expect(result.snowball.totalMonths).toBeLessThan(result.baseline.totalMonths);

      expect(result.avalanche.totalInterestPaid).toBeLessThan(result.baseline.totalInterestPaid);
      expect(result.snowball.totalInterestPaid).toBeLessThan(result.baseline.totalInterestPaid);

      expect(result.avalanche.interestSavedVsBaseline).toBeGreaterThan(10000);
      expect(result.snowball.interestSavedVsBaseline).toBeGreaterThan(10000);

      // Avalanche (targeting 18.5% credit card first) saves more or equal interest compared to Snowball
      expect(result.avalanche.totalInterestPaid).toBeLessThanOrEqual(result.snowball.totalInterestPaid);
      expect(result.recommendedStrategy).toBe("avalanche");

      // Verify payoff queue order
      expect(result.avalanche.payoffQueue[0].debtName).toBe("Karta Kredytowa"); // highest APR & smallest
      expect(result.avalanche.payoffQueue[0].payoffMonth).toBeLessThan(result.avalanche.payoffQueue[1].payoffMonth);
    });

    it("verifies snowball targets smallest balance first when rates differ", () => {
      const debts: DebtItem[] = [
        {
          id: "1",
          name: "Dług Mały ale Tani",
          institution: "Bank A",
          type: "cash_loan",
          currency: "PLN",
          balance: 2000,
          monthlyPayment: 200,
          interestRate: 5.0,
          status: "active",
          createdAt: "2026-01-01"
        },
        {
          id: "2",
          name: "Dług Duży i Drogi",
          institution: "Bank B",
          type: "cash_loan",
          currency: "PLN",
          balance: 40000,
          monthlyPayment: 1000,
          interestRate: 15.0,
          status: "active",
          createdAt: "2026-01-01"
        }
      ];

      const result = calculatePortfolioPayoffStrategies(debts, 500);

      // Avalanche targets high rate (Dług Duży i Drogi)
      // Snowball targets small balance (Dług Mały ale Tani)
      expect(result.snowball.payoffQueue[0].debtName).toBe("Dług Mały ale Tani");
      expect(result.avalanche.totalInterestPaid).toBeLessThan(result.snowball.totalInterestPaid);
    });

    describe("Sprint 5: Custom Payoff Ordering", () => {
      const sampleDebts: DebtItem[] = [
        {
          id: "card-1",
          name: "Karta mBank",
          institution: "mBank",
          type: "credit_card",
          currency: "PLN",
          balance: 5000,
          monthlyPayment: 250,
          interestRate: 18.0,
          status: "active",
          createdAt: "2026-01-01"
        },
        {
          id: "loan-2",
          name: "Pożyczka Santander",
          institution: "Santander",
          type: "cash_loan",
          currency: "PLN",
          balance: 15000,
          monthlyPayment: 500,
          interestRate: 12.0,
          status: "active",
          createdAt: "2026-01-01"
        },
        {
          id: "mort-3",
          name: "Hipoteka PKO",
          institution: "PKO BP",
          type: "mortgage",
          currency: "PLN",
          balance: 250000,
          monthlyPayment: 2000,
          interestRate: 7.0,
          status: "active",
          createdAt: "2026-01-01"
        }
      ];

      it("validates buildValidatedCustomOrder helper logic", () => {
        // Full order
        expect(buildValidatedCustomOrder(sampleDebts, ["mort-3", "loan-2", "card-1"])).toEqual([
          "mort-3",
          "loan-2",
          "card-1"
        ]);

        // Incomplete order (appends omitted active debts)
        expect(buildValidatedCustomOrder(sampleDebts, ["loan-2"])).toEqual([
          "loan-2",
          "card-1",
          "mort-3"
        ]);

        // Duplicates (ignores second occurrence)
        expect(buildValidatedCustomOrder(sampleDebts, ["loan-2", "loan-2", "mort-3"])).toEqual([
          "loan-2",
          "mort-3",
          "card-1"
        ]);

        // Non-existing IDs (skipped safely)
        expect(buildValidatedCustomOrder(sampleDebts, ["non-existent", "mort-3"])).toEqual([
          "mort-3",
          "card-1",
          "loan-2"
        ]);

        // Empty custom order
        expect(buildValidatedCustomOrder(sampleDebts, [])).toEqual([
          "card-1",
          "loan-2",
          "mort-3"
        ]);
      });

      it("prioritizes debts strictly in the custom order provided by user", () => {
        // Two debts of same balance (10 000 each), but user prioritizes loan-b first
        const twoDebts: DebtItem[] = [
          {
            id: "loan-a",
            name: "Pożyczka A (18%)",
            institution: "Bank A",
            type: "cash_loan",
            currency: "PLN",
            balance: 10000,
            monthlyPayment: 300,
            interestRate: 18.0,
            status: "active",
            createdAt: "2026-01-01"
          },
          {
            id: "loan-b",
            name: "Pożyczka B (8%)",
            institution: "Bank B",
            type: "cash_loan",
            currency: "PLN",
            balance: 10000,
            monthlyPayment: 300,
            interestRate: 8.0,
            status: "active",
            createdAt: "2026-01-01"
          }
        ];

        // User custom order: loan-b first
        const customOrder = ["loan-b", "loan-a"];
        const result = calculatePortfolioPayoffStrategies(twoDebts, 1000, undefined, customOrder);

        expect(result.custom).toBeDefined();
        expect(result.custom?.strategy).toBe("custom");
        expect(result.custom?.strategyLabel).toBe("Własna kolejność");

        // loan-b finishes first because it receives the extra payment
        expect(result.custom?.payoffQueue).toHaveLength(2);
        expect(result.custom?.payoffQueue[0].debtId).toBe("loan-b");
        expect(result.custom?.payoffQueue[1].debtId).toBe("loan-a");
      });

      it("supports inverted custom order", () => {
        const twoDebts: DebtItem[] = [
          {
            id: "loan-a",
            name: "Pożyczka A",
            institution: "Bank A",
            type: "cash_loan",
            currency: "PLN",
            balance: 10000,
            monthlyPayment: 300,
            interestRate: 10.0,
            status: "active",
            createdAt: "2026-01-01"
          },
          {
            id: "loan-b",
            name: "Pożyczka B",
            institution: "Bank B",
            type: "cash_loan",
            currency: "PLN",
            balance: 10000,
            monthlyPayment: 300,
            interestRate: 10.0,
            status: "active",
            createdAt: "2026-01-01"
          }
        ];

        const invertedOrder = ["loan-b", "loan-a"];
        const result = calculatePortfolioPayoffStrategies(twoDebts, 800, undefined, invertedOrder);

        expect(result.custom?.payoffQueue[0].debtId).toBe("loan-b");
        expect(result.custom?.payoffQueue[1].debtId).toBe("loan-a");
      });

      it("handles partial custom order by appending omitted debts deterministically", () => {
        const partialOrder = ["loan-2"];
        const result = calculatePortfolioPayoffStrategies(sampleDebts, 500, undefined, partialOrder);

        expect(result.custom?.payoffQueue).toHaveLength(3);
      });

      it("handles single active debt smoothly", () => {
        const singleDebt: DebtItem[] = [sampleDebts[0]];
        const result = calculatePortfolioPayoffStrategies(singleDebt, 300, undefined, ["card-1"]);

        expect(result.custom?.payoffQueue).toHaveLength(1);
        expect(result.custom?.payoffQueue[0].debtId).toBe("card-1");
        expect(result.custom?.totalMonths).toBeGreaterThan(0);
      });

      it("handles empty debts array without throwing", () => {
        const result = calculatePortfolioPayoffStrategies([], 500, undefined, ["any"]);
        expect(result.custom?.totalMonths).toBe(0);
        expect(result.custom?.totalInterestPaid).toBe(0);
        expect(result.custom?.payoffQueue).toHaveLength(0);
      });

      it("maintains consistent total commitment with extra payment = 0", () => {
        const result = calculatePortfolioPayoffStrategies(sampleDebts, 0, undefined, ["loan-2", "card-1", "mort-3"]);
        expect(result.custom?.extraMonthlyPayment).toBe(0);
        expect(result.custom?.totalMonthlyCommitment).toBe(result.baseline.totalMonthlyCommitment);
        expect(result.custom?.totalInterestPaid).toBeLessThanOrEqual(result.baseline.totalInterestPaid);
      });

      it("applies cascade rollover acceleration when a prioritized debt is fully repaid", () => {
        const customOrder = ["card-1", "loan-2", "mort-3"];
        const result = calculatePortfolioPayoffStrategies(sampleDebts, 1000, undefined, customOrder);

        const cardPayoffMonth = result.custom?.payoffQueue[0].payoffMonth || 0;
        const loanPayoffMonth = result.custom?.payoffQueue[1].payoffMonth || 0;

        expect(cardPayoffMonth).toBeLessThan(loanPayoffMonth);
        expect(result.custom?.totalInterestPaid).toBeLessThan(result.baseline.totalInterestPaid);
      });

      it("guarantees determinism across multiple calls with identical inputs", () => {
        const customOrder = ["loan-2", "mort-3", "card-1"];
        const run1 = calculatePortfolioPayoffStrategies(sampleDebts, 750, undefined, customOrder);
        const run2 = calculatePortfolioPayoffStrategies(sampleDebts, 750, undefined, customOrder);

        expect(run1.custom?.totalInterestPaid).toBe(run2.custom?.totalInterestPaid);
        expect(run1.custom?.debtFreeDate).toBe(run2.custom?.debtFreeDate);
        expect(run1.custom?.payoffQueue).toEqual(run2.custom?.payoffQueue);
      });

      it("does not mutate input debts or customPayoffOrder arrays", () => {
        const debtsClone = JSON.parse(JSON.stringify(sampleDebts));
        const orderInput = ["mort-3", "card-1"];
        const orderClone = [...orderInput];

        calculatePortfolioPayoffStrategies(sampleDebts, 500, undefined, orderInput);

        expect(sampleDebts).toEqual(debtsClone);
        expect(orderInput).toEqual(orderClone);
      });

      it("preserves independent functionality of Avalanche and Snowball strategies", () => {
        const twoDebts: DebtItem[] = [
          {
            id: "cheap-small",
            name: "Tani i mały",
            institution: "Bank A",
            type: "cash_loan",
            currency: "PLN",
            balance: 5000,
            monthlyPayment: 200,
            interestRate: 6.0,
            status: "active",
            createdAt: "2026-01-01"
          },
          {
            id: "expensive-large",
            name: "Drogi i duży",
            institution: "Bank B",
            type: "cash_loan",
            currency: "PLN",
            balance: 20000,
            monthlyPayment: 600,
            interestRate: 18.0,
            status: "active",
            createdAt: "2026-01-01"
          }
        ];

        // Custom targets cheap-small first
        const customOrder = ["cheap-small", "expensive-large"];
        const result = calculatePortfolioPayoffStrategies(twoDebts, 1000, undefined, customOrder);

        // Avalanche targets expensive-large with 18%
        expect(result.avalanche.payoffQueue[0].debtId).toBe("expensive-large");
        // Snowball targets cheap-small with 5000
        expect(result.snowball.payoffQueue[0].debtId).toBe("cheap-small");
        // Custom targets cheap-small
        expect(result.custom?.payoffQueue[0].debtId).toBe("cheap-small");
      });

      it("Sprint 14: calculates one-time overpayment what-if simulation shortening payoff duration and reducing interest", () => {
        const debtList: DebtItem[] = [
          {
            id: "d1",
            name: "Kredyt gotówkowy",
            institution: "Bank A",
            type: "cash_loan",
            currency: "PLN",
            balance: 20000,
            monthlyPayment: 500,
            interestRate: 10.0,
            status: "active",
            createdAt: "2026-01-01"
          }
        ];

        const base = calculatePortfolioPayoffStrategies(debtList, 0, undefined, undefined, 0);
        const withLumpSum = calculatePortfolioPayoffStrategies(debtList, 0, undefined, undefined, 5000);

        expect(withLumpSum.avalanche.totalMonths).toBeLessThan(base.avalanche.totalMonths);
        expect(withLumpSum.avalanche.totalInterestPaid).toBeLessThan(base.avalanche.totalInterestPaid);
      });
    });
  });

  describe("calculateDebtAmortizationSchedule (Sprint 16)", () => {
    it("calculates accurate amortization schedule and breakdown for a standard mortgage", () => {
      const mortgage: DebtItem = {
        id: "m1",
        name: "Hipoteka",
        institution: "PKO BP",
        type: "mortgage",
        currency: "PLN",
        balance: 100000,
        monthlyPayment: 1000,
        interestRate: 6.0,
        status: "active",
        createdAt: "2026-01-01"
      };

      const result = calculateDebtAmortizationSchedule(mortgage);

      expect(result.isEligible).toBe(true);
      expect(result.validationStatus).toBe("valid");
      expect(result.initialBalance).toBe(100000);
      expect(result.estimatedMonthlyPayment).toBe(1000);
      expect(result.firstMonthInterest).toBe(500); // 100000 * 0.06 / 12 = 500
      expect(result.firstMonthPrincipal).toBe(500);
      expect(result.rows.length).toBeGreaterThan(0);

      // Verify that final row balance reaches zero
      const lastRow = result.rows[result.rows.length - 1];
      expect(lastRow.balance).toBe(0);

      // Total repayment should equal initial balance + total interest
      expect(result.estimatedTotalRepayment).toBeCloseTo(result.initialBalance + result.estimatedTotalInterest, 1);
    });

    it("handles zero-interest BNPL debt correctly", () => {
      const bnpl: DebtItem = {
        id: "b1",
        name: "Allegro Pay",
        institution: "Allegro",
        type: "bnpl",
        currency: "PLN",
        balance: 1200,
        monthlyPayment: 200,
        interestRate: 0,
        status: "active",
        createdAt: "2026-01-01"
      };

      const result = calculateDebtAmortizationSchedule(bnpl);

      expect(result.isEligible).toBe(true);
      expect(result.validationStatus).toBe("valid");
      expect(result.estimatedMonths).toBe(6);
      expect(result.estimatedTotalInterest).toBe(0);
      expect(result.estimatedTotalRepayment).toBe(1200);
      expect(result.firstMonthInterest).toBe(0);
      expect(result.firstMonthPrincipal).toBe(200);
    });

    it("caps the final payment at remaining balance plus final interest without overpaying", () => {
      const loan: DebtItem = {
        id: "c1",
        name: "Końcówka pożyczki",
        institution: "Bank",
        type: "cash_loan",
        currency: "PLN",
        balance: 350,
        monthlyPayment: 200,
        interestRate: 12.0,
        status: "active",
        createdAt: "2026-01-01"
      };

      const result = calculateDebtAmortizationSchedule(loan);

      expect(result.isEligible).toBe(true);
      expect(result.rows.length).toBe(2);
      expect(result.rows[1].balance).toBe(0);
      expect(result.rows[1].principal).toBeLessThanOrEqual(200);
    });

    it("identifies non-amortizing loans where payment is less than or equal to monthly interest", () => {
      const nonAmortizing: DebtItem = {
        id: "na1",
        name: "Zbyt niska rata",
        institution: "Bank",
        type: "cash_loan",
        currency: "PLN",
        balance: 100000,
        monthlyPayment: 500, // Monthly interest at 12% is 1000 PLN
        interestRate: 12.0,
        status: "active",
        createdAt: "2026-01-01"
      };

      const result = calculateDebtAmortizationSchedule(nonAmortizing);

      expect(result.isEligible).toBe(false);
      expect(result.validationStatus).toBe("non_amortizing");
      expect(result.errorMessage).toContain("nie amortyzuje się");
    });

    it("rejects unsupported revolving debt types with clear explanatory message", () => {
      const creditCard: DebtItem = {
        id: "cc1",
        name: "Karta Visa",
        institution: "mBank",
        type: "credit_card",
        currency: "PLN",
        balance: 5000,
        monthlyPayment: 250,
        interestRate: 18.0,
        status: "active",
        createdAt: "2026-01-01"
      };

      const result = calculateDebtAmortizationSchedule(creditCard);

      expect(result.isEligible).toBe(false);
      expect(result.validationStatus).toBe("unsupported_type");
      expect(result.errorMessage).toContain("Karty kredytowe i limity odnawialne");
    });

    it("rejects closed debts", () => {
      const closedDebt: DebtItem = {
        id: "cl1",
        name: "Spłacony kredyt",
        institution: "Santander",
        type: "cash_loan",
        currency: "PLN",
        balance: 0,
        monthlyPayment: 0,
        interestRate: 8.0,
        status: "closed",
        createdAt: "2024-01-01"
      };

      const result = calculateDebtAmortizationSchedule(closedDebt);

      expect(result.isEligible).toBe(false);
      expect(result.validationStatus).toBe("closed_debt");
      expect(result.errorMessage).toContain("zamknięte");
    });

    it("handles null/undefined and invalid numeric inputs safely", () => {
      expect(calculateDebtAmortizationSchedule(null).isEligible).toBe(false);
      expect(calculateDebtAmortizationSchedule(undefined).isEligible).toBe(false);

      const invalidDebt: DebtItem = {
        id: "inv1",
        name: "Błędne dane",
        institution: "Bank",
        type: "cash_loan",
        currency: "PLN",
        balance: -500,
        monthlyPayment: 0,
        interestRate: -1,
        status: "active",
        createdAt: "2026-01-01"
      };

      const result = calculateDebtAmortizationSchedule(invalidDebt);
      expect(result.isEligible).toBe(false);
      expect(result.validationStatus).toBe("insufficient_data");
    });
  });

  describe("calculateDebtOverpaymentScenario (Sprint 17)", () => {
    const testMortgage: DebtItem = {
      id: "m-test",
      name: "Hipoteka Testowa",
      institution: "PKO BP",
      type: "mortgage",
      currency: "PLN",
      balance: 100000,
      monthlyPayment: 1000,
      interestRate: 6.0,
      status: "active",
      createdAt: "2026-01-01"
    };

    it("reduces total interest and shortens duration with monthly overpayment", () => {
      const result = calculateDebtOverpaymentScenario(testMortgage, 500, 0);

      expect(result.isEligible).toBe(true);
      expect(result.validationStatus).toBe("valid");
      expect(result.simulatedMonths).toBeLessThan(result.baselineMonths);
      expect(result.simulatedTotalInterest).toBeLessThan(result.baselineTotalInterest);
      expect(result.interestSavings).toBeGreaterThan(0);
      expect(result.monthsSaved).toBeGreaterThan(0);
      expect(result.simulatedTotalRepayment).toBeLessThan(result.baselineTotalRepayment);
    });

    it("reduces total interest with one-time overpayment in month 1", () => {
      const result = calculateDebtOverpaymentScenario(testMortgage, 0, 10000);

      expect(result.isEligible).toBe(true);
      expect(result.validationStatus).toBe("valid");
      expect(result.simulatedMonths).toBeLessThan(result.baselineMonths);
      expect(result.simulatedTotalInterest).toBeLessThan(result.baselineTotalInterest);
      expect(result.interestSavings).toBeGreaterThan(0);
      expect(result.monthsSaved).toBeGreaterThan(0);
    });

    it("handles combined monthly and one-time overpayments accurately", () => {
      const result = calculateDebtOverpaymentScenario(testMortgage, 300, 5000);

      expect(result.isEligible).toBe(true);
      expect(result.simulatedMonths).toBeLessThan(result.baselineMonths);
      expect(result.interestSavings).toBeGreaterThan(0);
      expect(result.rows[0].installment).toBeCloseTo(1000 + 300 + 5000, 1);
      expect(result.rows[1].installment).toBeCloseTo(1000 + 300, 1);
    });

    it("matches baseline when overpayments are zero", () => {
      const result = calculateDebtOverpaymentScenario(testMortgage, 0, 0);

      expect(result.isEligible).toBe(true);
      expect(result.simulatedMonths).toBe(result.baselineMonths);
      expect(result.simulatedTotalInterest).toBe(result.baselineTotalInterest);
      expect(result.interestSavings).toBe(0);
      expect(result.monthsSaved).toBe(0);
    });

    it("sanitizes negative inputs to zero safely", () => {
      const result = calculateDebtOverpaymentScenario(testMortgage, -500, -2000);

      expect(result.isEligible).toBe(true);
      expect(result.monthlyOverpayment).toBe(0);
      expect(result.oneTimeOverpayment).toBe(0);
      expect(result.interestSavings).toBe(0);
    });

    it("rejects unsupported debt types like credit card", () => {
      const creditCard: DebtItem = {
        id: "cc-unsupported",
        name: "Karta Kredytowa",
        institution: "Bank",
        type: "credit_card",
        currency: "PLN",
        balance: 5000,
        monthlyPayment: 250,
        interestRate: 18.0,
        status: "active",
        createdAt: "2026-01-01"
      };

      const result = calculateDebtOverpaymentScenario(creditCard, 500, 0);

      expect(result.isEligible).toBe(false);
      expect(result.validationStatus).toBe("unsupported_type");
      expect(result.errorMessage).toContain("Karty kredytowe i limity odnawialne");
    });

    it("caps final installment without overpaying the remaining balance", () => {
      const smallLoan: DebtItem = {
        id: "sl-1",
        name: "Mała pożyczka",
        institution: "Bank",
        type: "cash_loan",
        currency: "PLN",
        balance: 500,
        monthlyPayment: 200,
        interestRate: 10.0,
        status: "active",
        createdAt: "2026-01-01"
      };

      const result = calculateDebtOverpaymentScenario(smallLoan, 0, 1000); // 1000 PLN one-time pays off entire 500 PLN balance in month 1
      expect(result.isEligible).toBe(true);
      expect(result.simulatedMonths).toBe(1);
      expect(result.rows[0].balance).toBe(0);
      expect(result.rows[0].principal).toBe(500);
    });
  });

  describe("calculateDebtOverpaymentVariants (Sprint 18)", () => {
    const testMortgage: DebtItem = {
      id: "m-test-18",
      name: "Kredyt Mieszkaniowy",
      institution: "mBank",
      type: "mortgage",
      currency: "PLN",
      balance: 150000,
      monthlyPayment: 1500,
      interestRate: 6.5,
      status: "active",
      createdAt: "2026-01-01"
    };

    it("calculates baseline and multiple valid variants independently", () => {
      const variants: DebtOverpaymentVariantInput[] = [
        { id: "v1", name: "Wariant miesięczny", monthlyOverpayment: 500, oneTimeOverpayment: 0 },
        { id: "v2", name: "Wariant jednorazowy", monthlyOverpayment: 0, oneTimeOverpayment: 10000 },
        { id: "v3", name: "Wariant łączony", monthlyOverpayment: 300, oneTimeOverpayment: 5000 }
      ];

      const result = calculateDebtOverpaymentVariants(testMortgage, variants);

      expect(result.isEligible).toBe(true);
      expect(result.validationStatus).toBe("valid");
      expect(result.variants).toHaveLength(3);

      // Verify variant 1
      const resV1 = result.variants[0];
      expect(resV1.isValid).toBe(true);
      expect(resV1.name).toBe("Wariant miesięczny");
      expect(resV1.metrics?.monthsSaved).toBeGreaterThan(0);
      expect(resV1.metrics?.interestSavings).toBeGreaterThan(0);
      expect(resV1.metrics?.monthsSaved).toBe(result.baseline.baselineMonths - (resV1.metrics?.estimatedMonths || 0));
      expect(resV1.metrics?.interestSavings).toBeCloseTo(
        result.baseline.baselineTotalInterest - (resV1.metrics?.estimatedTotalInterest || 0),
        1
      );

      // Verify variant 2
      const resV2 = result.variants[1];
      expect(resV2.isValid).toBe(true);
      expect(resV2.metrics?.interestSavings).toBeGreaterThan(0);

      // Verify variant 3 (combined)
      const resV3 = result.variants[2];
      expect(resV3.isValid).toBe(true);
      expect(resV3.metrics?.interestSavings).toBeGreaterThan(0);
    });

    it("matches baseline when variant has zero overpayments", () => {
      const variants: DebtOverpaymentVariantInput[] = [
        { id: "v-zero", name: "Brak nadpłaty", monthlyOverpayment: 0, oneTimeOverpayment: 0 }
      ];

      const result = calculateDebtOverpaymentVariants(testMortgage, variants);

      expect(result.isEligible).toBe(true);
      expect(result.variants[0].isValid).toBe(true);
      expect(result.variants[0].metrics?.estimatedMonths).toBe(result.baseline.baselineMonths);
      expect(result.variants[0].metrics?.estimatedTotalInterest).toBe(result.baseline.baselineTotalInterest);
      expect(result.variants[0].metrics?.monthsSaved).toBe(0);
      expect(result.variants[0].metrics?.interestSavings).toBe(0);
    });

    it("isolates invalid variant without blocking valid variants", () => {
      const variants: DebtOverpaymentVariantInput[] = [
        { id: "v-valid", name: "Prawidłowy", monthlyOverpayment: 500, oneTimeOverpayment: 0 },
        { id: "v-nan", name: "Błędny", monthlyOverpayment: NaN, oneTimeOverpayment: 0 }
      ];

      const result = calculateDebtOverpaymentVariants(testMortgage, variants);

      expect(result.isEligible).toBe(true);
      expect(result.variants[0].isValid).toBe(true);
      expect(result.variants[0].metrics?.interestSavings).toBeGreaterThan(0);

      expect(result.variants[1].isValid).toBe(false);
      expect(result.variants[1].error).toBeDefined();
    });

    it("normalizes negative values to zero safely", () => {
      const variants: DebtOverpaymentVariantInput[] = [
        { id: "v-neg", name: "Ujemne", monthlyOverpayment: -200, oneTimeOverpayment: -5000 }
      ];

      const result = calculateDebtOverpaymentVariants(testMortgage, variants);

      expect(result.isEligible).toBe(true);
      expect(result.variants[0].isValid).toBe(true);
      expect(result.variants[0].metrics?.monthlyOverpayment).toBe(0);
      expect(result.variants[0].metrics?.oneTimeOverpayment).toBe(0);
      expect(result.variants[0].metrics?.interestSavings).toBe(0);
    });

    it("handles missing/empty variant names and IDs safely", () => {
      const variants: DebtOverpaymentVariantInput[] = [
        { id: "", name: "   ", monthlyOverpayment: 400, oneTimeOverpayment: 0 }
      ];

      const result = calculateDebtOverpaymentVariants(testMortgage, variants);

      expect(result.isEligible).toBe(true);
      expect(result.variants[0].id).toBe("variant-1");
      expect(result.variants[0].name).toBe("Wariant 1");
      expect(result.variants[0].isValid).toBe(true);
    });

    it("returns ineligible result for unsupported debts like credit card and closed debts", () => {
      const creditCard: DebtItem = {
        id: "cc-test",
        name: "Karta Kredytowa",
        institution: "Bank",
        type: "credit_card",
        currency: "PLN",
        balance: 4000,
        monthlyPayment: 200,
        interestRate: 18.0,
        status: "active",
        createdAt: "2026-01-01"
      };

      const result = calculateDebtOverpaymentVariants(creditCard, [
        { id: "v1", name: "W1", monthlyOverpayment: 100, oneTimeOverpayment: 0 }
      ]);

      expect(result.isEligible).toBe(false);
      expect(result.validationStatus).toBe("unsupported_type");
      expect(result.errorMessage).toContain("Karty kredytowe i limity odnawialne");

      const closedDebt: DebtItem = {
        ...testMortgage,
        status: "closed"
      };

      const closedResult = calculateDebtOverpaymentVariants(closedDebt, [
        { id: "v1", name: "W1", monthlyOverpayment: 100, oneTimeOverpayment: 0 }
      ]);

      expect(closedResult.isEligible).toBe(false);
      expect(closedResult.validationStatus).toBe("closed_debt");
    });
  });

  describe("calculateDebtPaymentBreakdown (Sprint 20)", () => {
    const standardDebt = {
      balance: 10000,
      monthlyPayment: 500,
      interestRate: 6.0 // monthly rate = 0.5% (0.005) -> monthly interest on 10,000 = 50.00 PLN
    };

    it("correctly splits standard payment into principal and interest", () => {
      const breakdown = calculateDebtPaymentBreakdown(standardDebt);

      expect(breakdown.openingBalance).toBe(10000);
      expect(breakdown.paymentAmount).toBe(500);
      expect(breakdown.interestAmount).toBe(50);
      expect(breakdown.principalAmount).toBe(450);
      expect(breakdown.closingBalance).toBe(9550);
      expect(breakdown.isFinalPayment).toBe(false);
      expect(breakdown.paymentStatus).toBe("normal");
    });

    it("allows custom paymentAmount to override debt.monthlyPayment", () => {
      const breakdown = calculateDebtPaymentBreakdown(standardDebt, 800);

      expect(breakdown.openingBalance).toBe(10000);
      expect(breakdown.paymentAmount).toBe(800);
      expect(breakdown.interestAmount).toBe(50);
      expect(breakdown.principalAmount).toBe(750);
      expect(breakdown.closingBalance).toBe(9250);
      expect(breakdown.isFinalPayment).toBe(false);
      expect(breakdown.paymentStatus).toBe("normal");
    });

    it("handles zero interest rate (0% loan / BNPL)", () => {
      const zeroInterestDebt = {
        balance: 1200,
        monthlyPayment: 200,
        interestRate: 0
      };

      const breakdown = calculateDebtPaymentBreakdown(zeroInterestDebt);

      expect(breakdown.openingBalance).toBe(1200);
      expect(breakdown.interestAmount).toBe(0);
      expect(breakdown.principalAmount).toBe(200);
      expect(breakdown.closingBalance).toBe(1000);
      expect(breakdown.isFinalPayment).toBe(false);
      expect(breakdown.paymentStatus).toBe("normal");
    });

    it("handles insufficient payment when payment is lower than interest", () => {
      const insufficientBreakdown = calculateDebtPaymentBreakdown(standardDebt, 30); // 30 < 50 interest

      expect(insufficientBreakdown.openingBalance).toBe(10000);
      expect(insufficientBreakdown.paymentAmount).toBe(30);
      expect(insufficientBreakdown.interestAmount).toBe(50);
      expect(insufficientBreakdown.principalAmount).toBe(0);
      expect(insufficientBreakdown.closingBalance).toBe(10000);
      expect(insufficientBreakdown.isFinalPayment).toBe(false);
      expect(insufficientBreakdown.paymentStatus).toBe("insufficient_payment");
    });

    it("handles interest-only payment when payment exactly covers interest", () => {
      const interestOnlyBreakdown = calculateDebtPaymentBreakdown(standardDebt, 50);

      expect(interestOnlyBreakdown.openingBalance).toBe(10000);
      expect(interestOnlyBreakdown.paymentAmount).toBe(50);
      expect(interestOnlyBreakdown.interestAmount).toBe(50);
      expect(interestOnlyBreakdown.principalAmount).toBe(0);
      expect(interestOnlyBreakdown.closingBalance).toBe(10000);
      expect(interestOnlyBreakdown.isFinalPayment).toBe(false);
      expect(interestOnlyBreakdown.paymentStatus).toBe("interest_only");
    });

    it("handles final payoff when payment exceeds remaining balance + interest", () => {
      const smallDebt = {
        balance: 400,
        monthlyPayment: 100,
        interestRate: 12.0 // monthly interest = 4.00 PLN
      };

      // User pays 500 PLN, balance is only 400 PLN
      const payoffBreakdown = calculateDebtPaymentBreakdown(smallDebt, 500);

      expect(payoffBreakdown.openingBalance).toBe(400);
      expect(payoffBreakdown.paymentAmount).toBe(500);
      expect(payoffBreakdown.interestAmount).toBe(4);
      expect(payoffBreakdown.principalAmount).toBe(400); // capped at opening balance
      expect(payoffBreakdown.closingBalance).toBe(0);
      expect(payoffBreakdown.isFinalPayment).toBe(true);
      expect(payoffBreakdown.paymentStatus).toBe("paid_off");
    });

    it("handles zero opening balance gracefully", () => {
      const zeroBalanceDebt = {
        balance: 0,
        monthlyPayment: 300,
        interestRate: 8.0
      };

      const breakdown = calculateDebtPaymentBreakdown(zeroBalanceDebt);

      expect(breakdown.openingBalance).toBe(0);
      expect(breakdown.interestAmount).toBe(0);
      expect(breakdown.principalAmount).toBe(0);
      expect(breakdown.closingBalance).toBe(0);
      expect(breakdown.isFinalPayment).toBe(true);
      expect(breakdown.paymentStatus).toBe("paid_off");
    });

    it("handles null, undefined, negative numbers, and NaN without throwing", () => {
      expect(() => calculateDebtPaymentBreakdown(null)).not.toThrow();
      expect(() => calculateDebtPaymentBreakdown(undefined)).not.toThrow();

      const invalidDebt = {
        balance: -500,
        monthlyPayment: -100,
        interestRate: -5
      };

      const breakdown = calculateDebtPaymentBreakdown(invalidDebt, -50);
      expect(breakdown.openingBalance).toBe(0);
      expect(breakdown.paymentAmount).toBe(0);
      expect(breakdown.interestAmount).toBe(0);
      expect(breakdown.principalAmount).toBe(0);
      expect(breakdown.closingBalance).toBe(0);
      expect(breakdown.isFinalPayment).toBe(true);
      expect(breakdown.paymentStatus).toBe("paid_off");

      const nanBreakdown = calculateDebtPaymentBreakdown({
        balance: NaN,
        monthlyPayment: NaN,
        interestRate: NaN
      });
      expect(nanBreakdown.openingBalance).toBe(0);
      expect(nanBreakdown.closingBalance).toBe(0);
    });

    it("does not mutate the source debt object", () => {
      const originalDebt = {
        balance: 10000,
        monthlyPayment: 500,
        interestRate: 6.0
      };
      const snapshot = JSON.stringify(originalDebt);

      calculateDebtPaymentBreakdown(originalDebt, 600);

      expect(JSON.stringify(originalDebt)).toBe(snapshot);
    });
  });

  describe("calculateDebtPaymentReversal (Sprint 21)", () => {
    it("correctly reverses standard payment and restores original balance", () => {
      // Original balance was 10,000, payment 500, 6% interest -> interest was 50, principal 450 -> current balance 9,550
      const currentDebt = {
        balance: 9550,
        interestRate: 6.0
      };

      const restored = calculateDebtPaymentReversal(currentDebt, 500);
      expect(restored).toBe(10000);
    });

    it("correctly reverses 0% interest loan payment", () => {
      const currentDebt = {
        balance: 1000,
        interestRate: 0
      };

      const restored = calculateDebtPaymentReversal(currentDebt, 200);
      expect(restored).toBe(1200);
    });

    it("does not increase balance if payment was insufficient (principal was 0)", () => {
      const currentDebt = {
        balance: 10000,
        interestRate: 6.0 // monthly interest is 50 PLN
      };

      // When 30 PLN was paid (< 50 interest), principal paid was 0, balance remained 10,000
      const restored = calculateDebtPaymentReversal(currentDebt, 30);
      expect(restored).toBe(10000);
    });

    it("handles zero payment or negative numbers gracefully", () => {
      const currentDebt = {
        balance: 5000,
        interestRate: 5.0
      };

      expect(calculateDebtPaymentReversal(currentDebt, 0)).toBe(5000);
      expect(calculateDebtPaymentReversal(currentDebt, -100)).toBe(5000);
      expect(calculateDebtPaymentReversal(null, 500)).toBe(0);
    });
  });

  describe("calculateDebtPaymentActivity (Sprint 22)", () => {
    const sampleDebt = {
      id: "debt-123",
      balance: 9100,
      monthlyPayment: 500,
      interestRate: 6.0 // 0.5% monthly
    };

    it("returns empty valid activity result when no linked transactions exist", () => {
      const result = calculateDebtPaymentActivity(sampleDebt, []);
      expect(result.isValid).toBe(true);
      expect(result.items).toHaveLength(0);
      expect(result.totalPaid).toBe(0);
      expect(result.totalInterest).toBe(0);
      expect(result.totalPrincipal).toBe(0);
      expect(result.currentBalance).toBe(9100);
    });

    it("processes one linked transaction and calculates breakdown correctly", () => {
      const transactions = [
        {
          id: "tx-1",
          name: "Rata kredytu",
          amount: 500,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto",
          isoDate: "2026-03-01",
          debtId: "debt-123",
          currency: "PLN" as const
        }
      ];

      // Current balance is 9550 after 500 PLN payment (which had 450 principal)
      const debtAfterPayment = {
        ...sampleDebt,
        balance: 9550
      };

      const result = calculateDebtPaymentActivity(debtAfterPayment, transactions);

      expect(result.isValid).toBe(true);
      expect(result.items).toHaveLength(1);

      const item = result.items[0];
      expect(item.transactionId).toBe("tx-1");
      expect(item.paymentAmount).toBe(500);
      expect(item.interestAmount).toBe(50);
      expect(item.principalAmount).toBe(450);
      expect(item.openingBalance).toBe(10000);
      expect(item.closingBalance).toBe(9550);
      expect(item.paymentStatus).toBe("normal");
      expect(item.isFinalPayment).toBe(false);

      expect(result.totalPaid).toBe(500);
      expect(result.totalInterest).toBe(50);
      expect(result.totalPrincipal).toBe(450);
      expect(result.currentBalance).toBe(9550);
    });

    it("sorts multiple transactions chronologically and reconstructs consecutive balances", () => {
      // 2 payments:
      // T1 (2026-01-15): 500 PLN -> 50 interest, 450 principal (opening: 10000, closing: 9550)
      // T2 (2026-02-15): 500 PLN -> 47.75 interest, 452.25 principal (opening: 9550, closing: 9097.75)
      // Current balance = 9097.75
      const currentDebt = {
        ...sampleDebt,
        balance: 9097.75
      };

      // Pass in reverse/mixed order to verify deterministic sorting
      const transactions = [
        {
          id: "tx-2",
          name: "Rata luty",
          amount: 500,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto",
          isoDate: "2026-02-15",
          debtId: "debt-123",
          currency: "PLN" as const
        },
        {
          id: "tx-1",
          name: "Rata styczeń",
          amount: 500,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto",
          isoDate: "2026-01-15",
          debtId: "debt-123",
          currency: "PLN" as const
        }
      ];

      const result = calculateDebtPaymentActivity(currentDebt, transactions);

      expect(result.items).toHaveLength(2);
      // Items should be chronologically ordered (T1 first, T2 second)
      expect(result.items[0].transactionId).toBe("tx-1");
      expect(result.items[0].date).toBe("2026-01-15");
      expect(result.items[0].openingBalance).toBe(10000);
      expect(result.items[0].closingBalance).toBe(9550);

      expect(result.items[1].transactionId).toBe("tx-2");
      expect(result.items[1].date).toBe("2026-02-15");
      expect(result.items[1].openingBalance).toBe(9550);
      expect(result.items[1].closingBalance).toBe(9097.75);

      expect(result.totalPaid).toBe(1000);
      expect(result.totalPrincipal).toBe(902.25);
      expect(result.totalInterest).toBe(97.75);
    });

    it("filters out income transactions, unlinked transactions, and transactions for other debts", () => {
      const mixedTransactions = [
        {
          id: "tx-valid",
          name: "Właściwa spłata",
          amount: 300,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto",
          isoDate: "2026-03-01",
          debtId: "debt-123",
          currency: "PLN" as const
        },
        {
          id: "tx-income",
          name: "Zwrot",
          amount: 100,
          type: "income" as const,
          category: "Inne",
          account: "Konto",
          isoDate: "2026-03-02",
          debtId: "debt-123",
          currency: "PLN" as const
        },
        {
          id: "tx-unlinked",
          name: "Zakupy spożywcze",
          amount: 150,
          type: "expense" as const,
          category: "Jedzenie",
          account: "Konto",
          isoDate: "2026-03-03",
          currency: "PLN" as const
        },
        {
          id: "tx-other-debt",
          name: "Inny kredyt",
          amount: 600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto",
          isoDate: "2026-03-04",
          debtId: "debt-other",
          currency: "PLN" as const
        }
      ];

      const result = calculateDebtPaymentActivity(sampleDebt, mixedTransactions);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].transactionId).toBe("tx-valid");
    });

    it("does not mutate the source debt or transaction array", () => {
      const debt = { ...sampleDebt };
      const txs = [
        {
          id: "tx-1",
          name: "Rata",
          amount: 500,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto",
          isoDate: "2026-03-01",
          debtId: "debt-123",
          currency: "PLN" as const
        }
      ];

      const debtSnap = JSON.stringify(debt);
      const txsSnap = JSON.stringify(txs);

      calculateDebtPaymentActivity(debt, txs);

      expect(JSON.stringify(debt)).toBe(debtSnap);
      expect(JSON.stringify(txs)).toBe(txsSnap);
    });
  });
});
