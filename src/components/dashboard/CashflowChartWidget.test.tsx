/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CashflowChartWidget } from "./CashflowChartWidget";
import { DashboardChartPoint } from "../../hooks/useDashboardMetrics";

describe("CashflowChartWidget", () => {
  afterEach(() => {
    cleanup();
  });

  const mockChartData: DashboardChartPoint[] = [
    { year: 2026, month: 5, label: "Maj", income: 5000, expense: 3000, incomeHeight: 80, expenseHeight: 50, isCurrent: false },
    { year: 2026, month: 6, label: "Cze", income: 4500, expense: 4000, incomeHeight: 70, expenseHeight: 65, isCurrent: true },
  ];

  it("renders months and data without empty state label when data exists", () => {
    render(<CashflowChartWidget chartData={mockChartData} currency="PLN" />);
    expect(screen.getByText("Ostatnie 6 miesięcy")).toBeDefined();
    expect(screen.getByText("Maj")).toBeDefined();
    expect(screen.getByText("Cze")).toBeDefined();
    expect(screen.queryByText("Brak zarejestrowanych przepływów")).toBeNull();
  });

  it("renders subtle empty state hint when all months have 0 income and 0 expense", () => {
    const emptyData: DashboardChartPoint[] = [
      { year: 2026, month: 5, label: "Maj", income: 0, expense: 0, incomeHeight: 0, expenseHeight: 0, isCurrent: false },
      { year: 2026, month: 6, label: "Cze", income: 0, expense: 0, incomeHeight: 0, expenseHeight: 0, isCurrent: true },
    ];
    render(<CashflowChartWidget chartData={emptyData} currency="PLN" />);
    expect(screen.getByText("Brak zarejestrowanych przepływów")).toBeDefined();
  });
});
