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
  }
];

describe("useDebtStrategyAnalytics", () => {
  it("1. handles empty debts list gracefully", () => {
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

  it("2. filters out closed and zero-balance debts for activeDebts", () => {
    const { result } = renderHook(() =>
      useDebtStrategyAnalytics({
        debts: mockDebts,
        selectedPayoffStrategy: "avalanche",
        extraMonthlyPayoff: 500,
        customDebtOrder: []
      })
    );

    expect(result.current.activeDebts.length).toBe(2);
    expect(result.current.activeDebts.map((d) => d.id)).toEqual(["debt-1", "debt-2"]);
  });

  it("3. validates and falls back customDebtOrder correctly", () => {
    const { result } = renderHook(() =>
      useDebtStrategyAnalytics({
        debts: mockDebts,
        selectedPayoffStrategy: "custom",
        extraMonthlyPayoff: 500,
        customDebtOrder: ["invalid-id", "debt-2"]
      })
    );

    expect(result.current.validatedCustomOrder[0]).toBe("debt-2");
    expect(result.current.validatedCustomOrder).toContain("debt-1");
  });

  it("4. computes selectedPayoffResult for Avalanche, Snowball, and Custom", () => {
    const { result, rerender } = renderHook(
      (props: { strategy: "avalanche" | "snowball" | "custom" }) =>
        useDebtStrategyAnalytics({
          debts: mockDebts,
          selectedPayoffStrategy: props.strategy,
          extraMonthlyPayoff: 500,
          customDebtOrder: []
        }),
      { initialProps: { strategy: "avalanche" } }
    );

    expect(result.current.selectedPayoffResult).toBe(result.current.payoffComparison.avalanche);

    rerender({ strategy: "snowball" });
    expect(result.current.selectedPayoffResult).toBe(result.current.payoffComparison.snowball);

    rerender({ strategy: "custom" });
    expect(result.current.selectedPayoffResult).toBe(result.current.payoffComparison.custom);
  });

  it("5. computes What-If impact when oneTimeOverpayment is positive", () => {
    const { result } = renderHook(() =>
      useDebtStrategyAnalytics({
        debts: mockDebts,
        selectedPayoffStrategy: "avalanche",
        extraMonthlyPayoff: 500,
        customDebtOrder: [],
        oneTimeOverpayment: 2000
      })
    );

    expect(result.current.whatIfImpact).not.toBeNull();
    expect(result.current.whatIfImpact?.debtFreeDate).toBeTruthy();
    expect(typeof result.current.whatIfImpact?.durDiff).toBe("number");
    expect(typeof result.current.whatIfImpact?.intDiff).toBe("number");
  });

  it("6. computes savedScenarioPreviews for provided saved scenarios", () => {
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
    expect(typeof result.current.savedScenarioPreviews["sc-2"].totalInterestPaid).toBe("number");
  });
});
