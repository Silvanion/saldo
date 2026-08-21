import { describe, it, expect } from "vitest";
import {
  calculatePortfolioDebtKpis,
  calculateAmortizationSchedule,
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
});
