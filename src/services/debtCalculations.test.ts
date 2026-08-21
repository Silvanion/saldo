import { describe, it, expect } from "vitest";
import {
  calculatePortfolioDebtKpis,
  calculateAmortizationSchedule,
  calculateOverpayment
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
});
