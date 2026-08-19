/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BudgetWarningsWidget } from "./BudgetWarningsWidget";
import { BudgetWarning } from "../../services/budgetCalculations";

describe("BudgetWarningsWidget", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    currency: "PLN",
    totalPlannedBudget: 0,
    totalActualSpentInBudget: 0,
    budgetWarnings: [] as BudgetWarning[],
    onChangeView: vi.fn(),
    onOpenBudgetModal: vi.fn(),
  };

  it("renders empty state correctly when there are no budget warnings / limits configured", () => {
    render(<BudgetWarningsWidget {...defaultProps} />);

    expect(screen.getByText("Brak skonfigurowanych limitów")).toBeTruthy();
    expect(screen.getByText("Ustaw budżety dla kategorii, by śledzić wydatki.")).toBeTruthy();
  });

  it("calculates global budget ratio badge correctly for normal, warning, and exceeded thresholds", () => {
    // Normal (< 80%)
    const { rerender } = render(
      <BudgetWarningsWidget
        {...defaultProps}
        totalPlannedBudget={1000}
        totalActualSpentInBudget={500}
      />
    );
    expect(screen.getByText("50% planu")).toBeTruthy();

    // Warning (> 80%)
    rerender(
      <BudgetWarningsWidget
        {...defaultProps}
        totalPlannedBudget={1000}
        totalActualSpentInBudget={850}
      />
    );
    expect(screen.getByText("85% planu")).toBeTruthy();

    // Exceeded (> 100%)
    rerender(
      <BudgetWarningsWidget
        {...defaultProps}
        totalPlannedBudget={1000}
        totalActualSpentInBudget={1200}
      />
    );
    expect(screen.getByText("120% planu")).toBeTruthy();
  });

  it("handles totalPlannedBudget = 0 without crashing or showing NaN", () => {
    render(
      <BudgetWarningsWidget
        {...defaultProps}
        totalPlannedBudget={0}
        totalActualSpentInBudget={200}
      />
    );

    expect(screen.getByText("0% planu")).toBeTruthy();
  });

  it("renders warning items with correct status badges ('Przekroczony', 'Uwaga', 'W normie')", () => {
    const warnings: BudgetWarning[] = [
      {
        category: "Jedzenie",
        limit: 1000,
        spent: 1200,
        ratio: 1.2,
        percent: 120,
        status: "exceeded",
      },
      {
        category: "Rozrywka",
        limit: 500,
        spent: 425,
        ratio: 0.85,
        percent: 85,
        status: "warning",
      },
      {
        category: "Paliwo",
        limit: 800,
        spent: 300,
        ratio: 0.375,
        percent: 38,
        status: "normal",
      },
    ];

    render(
      <BudgetWarningsWidget
        {...defaultProps}
        totalPlannedBudget={2300}
        totalActualSpentInBudget={1925}
        budgetWarnings={warnings}
      />
    );

    // Badges
    expect(screen.getByText("Przekroczony")).toBeTruthy();
    expect(screen.getByText("Uwaga")).toBeTruthy();
    expect(screen.getByText("W normie")).toBeTruthy();

    // Category names
    expect(screen.getByText("Jedzenie")).toBeTruthy();
    expect(screen.getByText("Rozrywka")).toBeTruthy();
    expect(screen.getByText("Paliwo")).toBeTruthy();

    // Percentages
    expect(screen.getByText("120%")).toBeTruthy();
    expect(screen.getByText("85%")).toBeTruthy();
    expect(screen.getByText("38%")).toBeTruthy();
  });

  it("triggers navigation and modal open callbacks on button clicks", () => {
    const onChangeView = vi.fn();
    const onOpenBudgetModal = vi.fn();

    render(
      <BudgetWarningsWidget
        {...defaultProps}
        onChangeView={onChangeView}
        onOpenBudgetModal={onOpenBudgetModal}
      />
    );

    const detailsBtn = screen.getByRole("button", { name: /Szczegóły/i });
    fireEvent.click(detailsBtn);
    expect(onChangeView).toHaveBeenCalledWith("budget");

    const configBtn = screen.getByRole("button", { name: /Konfiguruj budżety/i });
    fireEvent.click(configBtn);
    expect(onOpenBudgetModal).toHaveBeenCalledTimes(1);
  });
});
