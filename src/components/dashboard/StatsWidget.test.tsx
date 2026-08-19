/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StatsWidget } from "./StatsWidget";
import { SafeToSpendBreakdown, RunwayCalculation, MoMTrend } from "../../services/budgetCalculations";

describe("StatsWidget (KPI cards, typography & actions)", () => {
  afterEach(() => {
    cleanup();
  });

  const mockSafeBreakdown: SafeToSpendBreakdown = {
    currentBalance: 12000,
    reservedGoalsSum: 3000,
    futureRecurringExpensesSum: 1500,
    unpaidPaymentsSum: 500,
    safeToSpend: 5000,
    isNegative: false,
  };

  const mockForecast = {
    forecastDate: "31.08.2026",
    forecastedBalance: 4500,
    unpaidPaymentsSum: 500,
    futureRecurringExpensesSum: 1500,
    futureRecurringIncomesSum: 0,
    isNegative: false,
  };

  const mockRunway: RunwayCalculation = {
    runwayMonths: 6.5,
    liquidAssets: 26000,
    avgMonthlyExpenses: 4000,
    status: "healthy",
  };

  const mockMomTrends: MoMTrend = {
    currentMonthIncome: 9000,
    previousMonthIncome: 8000,
    incomeDiffAmount: 1000,
    incomeDiffPercent: 12.5,
    currentMonthExpenses: 3300,
    previousMonthExpenses: 3500,
    expensesDiffAmount: -200,
    expensesDiffPercent: -5.7,
  };

  it("renders KPI cards, totals, and MoM trend pills", () => {
    render(
      <StatsWidget
        currency="PLN"
        totalIncome={9000}
        totalExpense={3300}
        balance={5700}
        emergencyLimit={2000}
        investmentCushion={1000}
        endOfMonthForecast={mockForecast}
        safeBreakdown={mockSafeBreakdown}
        runway={mockRunway}
        momTrends={mockMomTrends}
        onChangeView={vi.fn()}
      />
    );

    expect(screen.getByText("Przychody")).toBeTruthy();
    expect(screen.getByText("Wydatki")).toBeTruthy();
    expect(screen.getByText("Pozostaje (Bilans)")).toBeTruthy();

    expect(screen.getByText("+12.5% MoM")).toBeTruthy();
    expect(screen.getByText("-5.7% MoM")).toBeTruthy();
    expect(screen.getByText(/Limit awaryjny:/)).toBeTruthy();
  });

  it("handles navigation clicks on SafeToSpend and Runway CTAs", () => {
    const onChangeView = vi.fn();
    render(
      <StatsWidget
        currency="PLN"
        totalIncome={9000}
        totalExpense={3300}
        balance={5700}
        emergencyLimit={0}
        investmentCushion={0}
        endOfMonthForecast={mockForecast}
        safeBreakdown={mockSafeBreakdown}
        runway={mockRunway}
        onChangeView={onChangeView}
      />
    );

    const analysisBtn = screen.getByRole("button", { name: "Zobacz Analizę" });
    fireEvent.click(analysisBtn);
    expect(onChangeView).toHaveBeenCalledWith("analysis");

    const runwayBtn = screen.getByRole("button", { name: "Szczegóły płynności" });
    fireEvent.click(runwayBtn);
    expect(onChangeView).toHaveBeenCalledWith("analysis");
  });

  it("renders debit alert when forecast is negative", () => {
    const negativeForecast = {
      ...mockForecast,
      forecastedBalance: -800,
      isNegative: true,
    };

    render(
      <StatsWidget
        currency="PLN"
        totalIncome={2000}
        totalExpense={5000}
        balance={-3000}
        emergencyLimit={0}
        investmentCushion={0}
        endOfMonthForecast={negativeForecast}
        safeBreakdown={{ ...mockSafeBreakdown, safeToSpend: -800, isNegative: true }}
        onChangeView={vi.fn()}
      />
    );

    expect(screen.getByText(/Zbliżasz się do debetu!/)).toBeTruthy();
  });
});
