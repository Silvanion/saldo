import { describe, it, expect } from "vitest";
import {
  calculateLtvMetrics,
  calculateAnnuityInstallment,
  calculateInterestRateStressTest,
  calculateCreditVacationImpact,
  compareAnnuityVsDecreasing
} from "./mortgageCalculations";
import { DebtItem } from "../types";

describe("mortgageCalculations", () => {
  describe("calculateLtvMetrics", () => {
    it("returns null when propertyValue is missing or invalid", () => {
      expect(calculateLtvMetrics(300000, null)).toBeNull();
      expect(calculateLtvMetrics(300000, 0)).toBeNull();
      expect(calculateLtvMetrics(300000, -100000)).toBeNull();
    });

    it("calculates safe LTV (<= 80%) correctly", () => {
      const result = calculateLtvMetrics(350000, 500000);
      expect(result).not.toBeNull();
      expect(result?.ltvPercent).toBe(70);
      expect(result?.status).toBe("safe");
      expect(result?.overpaymentTo80Ltv).toBe(0);
      expect(result?.threshold80Amount).toBe(400000);
      expect(result?.threshold90Amount).toBe(450000);
    });

    it("calculates warning LTV (80% - 90%) with needed overpayment to 80%", () => {
      const result = calculateLtvMetrics(425000, 500000);
      expect(result).not.toBeNull();
      expect(result?.ltvPercent).toBe(85);
      expect(result?.status).toBe("warning");
      expect(result?.overpaymentTo80Ltv).toBe(25000); // 425k - 400k
      expect(result?.overpaymentTo90Ltv).toBe(0);
    });

    it("calculates critical LTV (> 90%)", () => {
      const result = calculateLtvMetrics(475000, 500000);
      expect(result).not.toBeNull();
      expect(result?.ltvPercent).toBe(95);
      expect(result?.status).toBe("critical");
      expect(result?.overpaymentTo80Ltv).toBe(75000);
      expect(result?.overpaymentTo90Ltv).toBe(25000);
    });
  });

  describe("calculateAnnuityInstallment", () => {
    it("returns 0 for non-positive months or balance", () => {
      expect(calculateAnnuityInstallment(0, 7.5, 240)).toBe(0);
      expect(calculateAnnuityInstallment(500000, 7.5, 0)).toBe(0);
    });

    it("calculates 0% interest loan as linear installment", () => {
      expect(calculateAnnuityInstallment(120000, 0, 120)).toBe(1000);
    });

    it("calculates realistic mortgage installment (400k PLN, 7.5% APR, 300 months)", () => {
      const installment = calculateAnnuityInstallment(400000, 7.5, 300);
      // Standard financial formula produces ~2957.06 PLN
      expect(installment).toBeGreaterThan(2900);
      expect(installment).toBeLessThan(3000);
      expect(installment).toBeCloseTo(2955.96, 0);
    });
  });

  describe("calculateInterestRateStressTest", () => {
    it("generates realistic scenarios and KNF +300 pb stress test", () => {
      const result = calculateInterestRateStressTest(400000, 7.0, 300);
      expect(result.baseRate).toBe(7.0);
      expect(result.scenarios.length).toBeGreaterThanOrEqual(8);

      const baselineScenario = result.scenarios.find((s) => s.rateDelta === 0);
      expect(baselineScenario?.paymentDiff).toBe(0);

      const plus100Scenario = result.scenarios.find((s) => s.rateDelta === 1.0);
      expect(plus100Scenario?.simulatedRate).toBe(8.0);
      expect(plus100Scenario?.paymentDiff).toBeGreaterThan(200);

      const plus300Scenario = result.scenarios.find((s) => s.rateDelta === 3.0);
      expect(plus300Scenario?.simulatedRate).toBe(10.0);
      expect(result.knfPlus300PbPayment).toBe(plus300Scenario?.simulatedMonthlyPayment);
      expect(result.knfPlus300PbDiff).toBeGreaterThan(0);
    });
  });

  describe("calculateCreditVacationImpact", () => {
    const mockMortgage: DebtItem = {
      id: "debt-mortgage-1",
      name: "Hipoteka Mieszkanie",
      institution: "PKO BP",
      type: "mortgage",
      currency: "PLN",
      balance: 300000,
      monthlyPayment: 2400,
      interestRate: 7.2,
      remainingMonths: 240,
      status: "active",
      createdAt: "2024-01-01"
    };

    it("handles non-reinvested vacation as term extension", () => {
      const result = calculateCreditVacationImpact(mockMortgage, 4, false);
      expect(result.vacationMonthsCount).toBe(4);
      expect(result.totalSuspendedAmount).toBe(9600); // 4 * 2400
      expect(result.reinvestInOverpayment).toBe(false);
      expect(result.interestSaved).toBe(0);
      expect(result.monthsShortened).toBe(-4);
      expect(result.newBalanceAfterOverpayment).toBe(300000);
    });

    it("calculates positive savings and months shortened when reinvesting in overpayment", () => {
      const result = calculateCreditVacationImpact(mockMortgage, 4, true);
      expect(result.vacationMonthsCount).toBe(4);
      expect(result.totalSuspendedAmount).toBe(9600);
      expect(result.reinvestInOverpayment).toBe(true);
      expect(result.interestSaved).toBeGreaterThan(5000); // Massive compound interest saving
      expect(result.monthsShortened).toBeGreaterThan(0);
      expect(result.newBalanceAfterOverpayment).toBe(290400); // 300k - 9.6k
    });
  });

  describe("compareAnnuityVsDecreasing", () => {
    it("correctly identifies total interest savings with decreasing installments", () => {
      const comparison = compareAnnuityVsDecreasing(300000, 6.0, 240);

      // Annuity
      expect(comparison.annuity.monthlyPayment).toBeGreaterThan(2000);
      expect(comparison.annuity.totalInterest).toBeGreaterThan(200000);

      // Decreasing
      expect(comparison.decreasing.firstInstallment).toBeGreaterThan(comparison.annuity.monthlyPayment);
      expect(comparison.decreasing.lastInstallment).toBeLessThan(comparison.annuity.monthlyPayment);
      expect(comparison.decreasing.totalInterest).toBeLessThan(comparison.annuity.totalInterest);

      // Savings
      expect(comparison.interestDifference).toBeGreaterThan(20000);
      expect(comparison.savingsPercent).toBeGreaterThan(5);
      expect(comparison.firstInstallmentPremium).toBeGreaterThan(0);
    });

    it("handles zero balance gracefully", () => {
      const comparison = compareAnnuityVsDecreasing(0, 6.0, 240);
      expect(comparison.interestDifference).toBe(0);
      expect(comparison.savingsPercent).toBe(0);
    });
  });
});
