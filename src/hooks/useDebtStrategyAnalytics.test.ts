/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDebtStrategyAnalytics } from "./useDebtStrategyAnalytics";
import { DebtItem, DebtPayoffScenario } from "../types";

const mockDebts: DebtItem[] = [
  {
    id: "debt-1",
    name: "Kredyt Gotówkowy",
    institution: "Bank A",
    type: "cash_loan",
    currency: "PLN",
    balance: 10000,
    originalAmount: 15000,
    monthlyPayment: 500,
    interestRate: 12,
    rateType: "fixed",
    startDate: "2024-01-01",
    endDate: "2026-01-01",
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z"
  },
  {
    id: "debt-2",
    name: "Karta Kredytowa",
    institution: "Bank B",
    type: "credit_card",
    currency: "PLN",
    balance: 3000,
    originalAmount: 5000,
    monthlyPayment: 150,
    interestRate: 18,
    rateType: "variable",
    startDate: "2024-01-01",
    endDate: "2026-01-01",
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z"
  },
  {
    id: "debt-3",
    name: "Spłacony Kredyt",
    institution: "Bank C",
    type: "cash_loan",
    currency: "PLN",
    balance: 0,
    originalAmount: 5000,
    monthlyPayment: 0,
    interestRate: 10,
    rateType: "fixed",
    startDate: "2023-01-01",
    endDate: "2024-01-01",
    status: "closed",
    createdAt: "2023-01-01T00:00:00.000Z"
  },
  {
    id: "debt-4",
    name: "Zero Balance Active",
    institution: "Bank D",
    type: "cash_loan",
    currency: "PLN",
    balance: 0,
    originalAmount: 2000,
    monthlyPayment: 100,
    interestRate: 8,
    rateType: "fixed",
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z"
  }
];

const mockScenarios: DebtPayoffScenario[] = [
  {
    id: "sc-1",
    name: "Plan Lawina 300",
    strategy: "avalanche",
    extraMonthlyPayment: 300,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sc-2",
    name: "Plan Kula 500",
    strategy: "snowball",
    extraMonthlyPayment: 500,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sc-3",
    name: "Plan Custom 400",
    strategy: "custom",
    extraMonthlyPayment: 400,
    customDebtOrder: ["debt-2", "debt-1", "inactive-debt"],
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];

describe("useDebtStrategyAnalytics — Contract & Memoization Hardening", () => {
  describe("Debt filtering and reference stability", () => {
    it("1. returns stable empty structures when debts array is empty", () => {
      const { result } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: [],
          selectedPayoffStrategy: "avalanche",
          extraMonthlyPayoff: 500,
          customDebtOrder: []
        })
      );

      expect(result.current.activeDebts).toEqual([]);
      expect(result.current.validatedCustomOrder).toEqual([]);
      expect(result.current.payoffComparison).toBeDefined();
      expect(result.current.whatIfImpact).toBeNull();
      expect(result.current.savedScenarioPreviews).toEqual({});
    });

    it("2. filters out closed debts AND zero-balance debts correctly", () => {
      const { result } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: mockDebts,
          selectedPayoffStrategy: "avalanche",
          extraMonthlyPayoff: 500,
          customDebtOrder: []
        })
      );

      // Only debt-1 (10000) and debt-2 (3000) should be active
      expect(result.current.activeDebts.length).toBe(2);
      expect(result.current.activeDebts.map((d) => d.id)).toEqual(["debt-1", "debt-2"]);
    });

    it("3. handles list containing ONLY closed or zero balance debts", () => {
      const onlyClosed: DebtItem[] = [mockDebts[2], mockDebts[3]];
      const { result } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: onlyClosed,
          selectedPayoffStrategy: "avalanche",
          extraMonthlyPayoff: 500,
          customDebtOrder: []
        })
      );

      expect(result.current.activeDebts).toEqual([]);
      expect(result.current.validatedCustomOrder).toEqual([]);
    });
  });

  describe("Custom Debt Order validation and fallbacks", () => {
    it("4. handles empty customDebtOrder by falling back to active debts", () => {
      const { result } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: mockDebts,
          selectedPayoffStrategy: "custom",
          extraMonthlyPayoff: 500,
          customDebtOrder: []
        })
      );

      expect(result.current.validatedCustomOrder.length).toBe(2);
      expect(result.current.validatedCustomOrder).toContain("debt-1");
      expect(result.current.validatedCustomOrder).toContain("debt-2");
    });

    it("5. validates partial, duplicate, and stale IDs in customDebtOrder", () => {
      const { result } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: mockDebts,
          selectedPayoffStrategy: "custom",
          extraMonthlyPayoff: 500,
          customDebtOrder: ["debt-2", "debt-2", "stale-id", "debt-3"]
        })
      );

      // debt-2 first, stale-id and closed debt-3 ignored, debt-1 appended
      expect(result.current.validatedCustomOrder).toEqual(["debt-2", "debt-1"]);
    });
  });

  describe("Payoff Strategy Comparisons & selectedPayoffResult", () => {
    it("6. computes selectedPayoffResult for Avalanche, Snowball, Custom, and Baseline", () => {
      const { result, rerender } = renderHook(
        (props: { strategy: "avalanche" | "snowball" | "custom" | "baseline" }) =>
          useDebtStrategyAnalytics({
            debts: mockDebts,
            selectedPayoffStrategy: props.strategy,
            extraMonthlyPayoff: 500,
            customDebtOrder: ["debt-2", "debt-1"]
          }),
        { initialProps: { strategy: "avalanche" } }
      );

      expect(result.current.selectedPayoffResult).toBe(result.current.payoffComparison.avalanche);

      rerender({ strategy: "snowball" });
      expect(result.current.selectedPayoffResult).toBe(result.current.payoffComparison.snowball);

      rerender({ strategy: "custom" });
      expect(result.current.selectedPayoffResult).toBe(result.current.payoffComparison.custom);

      rerender({ strategy: "baseline" });
      expect(result.current.selectedPayoffResult).toBe(result.current.payoffComparison.baseline);
    });

    it("7. correctly computes when extra monthly payment is zero vs positive", () => {
      const { result: zeroExtra } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: mockDebts,
          selectedPayoffStrategy: "avalanche",
          extraMonthlyPayoff: 0,
          customDebtOrder: []
        })
      );

      const { result: positiveExtra } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: mockDebts,
          selectedPayoffStrategy: "avalanche",
          extraMonthlyPayoff: 1000,
          customDebtOrder: []
        })
      );

      expect(zeroExtra.current.payoffComparison.avalanche.totalMonths).toBeGreaterThanOrEqual(
        positiveExtra.current.payoffComparison.avalanche.totalMonths
      );
    });
  });

  describe("What-If Simulation Delta Behavior", () => {
    it("8. returns null when oneTimeOverpayments is empty and previewStrategy is null", () => {
      const { result } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: mockDebts,
          selectedPayoffStrategy: "avalanche",
          extraMonthlyPayoff: 0,
          customDebtOrder: [],
          oneTimeOverpayments: [],
          previewStrategy: null
        })
      );

      expect(result.current.whatIfImpact).toBeNull();
    });

    it("9. computes What-If when previewStrategy is different from selected strategy", () => {
      const { result } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: mockDebts,
          selectedPayoffStrategy: "avalanche",
          extraMonthlyPayoff: 500,
          customDebtOrder: [],
          oneTimeOverpayments: [],
          previewStrategy: "snowball"
        })
      );

      expect(result.current.whatIfImpact).not.toBeNull();
      expect(result.current.whatIfImpact?.debtFreeDate).toBe(
        result.current.payoffComparison.snowball.debtFreeDate
      );
    });

    it("10. computes What-If when positive oneTimeOverpayments is set", () => {
      const { result } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: mockDebts,
          selectedPayoffStrategy: "baseline",
          extraMonthlyPayoff: 0,
          customDebtOrder: [],
          oneTimeOverpayments: [{ month: 1, amount: 3000 }]
        })
      );

      expect(result.current.whatIfImpact).not.toBeNull();
      expect(result.current.whatIfImpact!.intDiff).toBeGreaterThanOrEqual(0);
      expect(result.current.whatIfImpact!.durDiff).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Saved Scenario Previews", () => {
    it("11. handles missing or empty savedScenarios with stable empty record", () => {
      const { result } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: mockDebts,
          selectedPayoffStrategy: "avalanche",
          extraMonthlyPayoff: 500,
          customDebtOrder: [],
          savedScenarios: []
        })
      );

      expect(result.current.savedScenarioPreviews).toEqual({});
    });

    it("12. computes previews for Avalanche, Snowball, and Custom saved scenarios", () => {
      const { result } = renderHook(() =>
        useDebtStrategyAnalytics({
          debts: mockDebts,
          selectedPayoffStrategy: "avalanche",
          extraMonthlyPayoff: 500,
          customDebtOrder: [],
          savedScenarios: mockScenarios
        })
      );

      expect(result.current.savedScenarioPreviews["sc-1"]).toBeDefined();
      expect(result.current.savedScenarioPreviews["sc-1"].debtFreeDate).toBeTruthy();
      expect(typeof result.current.savedScenarioPreviews["sc-1"].totalInterestPaid).toBe("number");

      expect(result.current.savedScenarioPreviews["sc-2"]).toBeDefined();
      expect(result.current.savedScenarioPreviews["sc-2"].debtFreeDate).toBeTruthy();

      expect(result.current.savedScenarioPreviews["sc-3"]).toBeDefined();
      expect(result.current.savedScenarioPreviews["sc-3"].debtFreeDate).toBeTruthy();
    });
  });
});
