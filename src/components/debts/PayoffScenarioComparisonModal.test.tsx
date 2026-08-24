/** @vitest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { PayoffScenarioComparisonModal } from "./PayoffScenarioComparisonModal";
import { DebtPayoffScenario, DebtItem } from "../../types";

const mockActiveDebts: DebtItem[] = [
  {
    id: "debt-1",
    name: "Kredyt hipoteczny",
    institution: "Bank A",
    type: "mortgage",
    currency: "PLN",
    balance: 100000,
    originalAmount: 120000,
    monthlyPayment: 1000,
    interestRate: 5.0,
    status: "active",
    createdAt: "2026-01-01"
  }
];

const mockScenarios: DebtPayoffScenario[] = [
  {
    id: "sc-1",
    name: "Wariant agresywny spłaty hipoteki ze szczegółową analizą", // Long name test
    strategy: "avalanche",
    extraMonthlyPayment: 1000,
    createdAt: "2026-01-01"
  },
  {
    id: "sc-2",
    name: "Status Quo",
    strategy: "baseline",
    extraMonthlyPayment: 0,
    createdAt: "2026-01-02"
  }
];

describe("PayoffScenarioComparisonModal", () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders with accessible dialog role and title", () => {
    render(
      <PayoffScenarioComparisonModal
        isOpen={true}
        onClose={vi.fn()}
        scenarios={mockScenarios}
        activeDebts={mockActiveDebts}
        currency="PLN"
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("scenario-comparison-modal-title");

    const title = screen.getByText(/Porównanie scenariuszy spłaty/i);
    expect(title).toBeTruthy();
    expect(title.id).toBe("scenario-comparison-modal-title");
  });

  it("has an accessible close button that calls onClose", () => {
    const onCloseMock = vi.fn();
    render(
      <PayoffScenarioComparisonModal
        isOpen={true}
        onClose={onCloseMock}
        scenarios={mockScenarios}
        activeDebts={mockActiveDebts}
        currency="PLN"
      />
    );

    const closeButtons = screen.getAllByRole("button", { name: /zamknij/i });
    expect(closeButtons.length).toBeGreaterThan(0);
    
    // Top corner button has aria-label="Zamknij"
    const topCloseBtn = closeButtons[0];
    fireEvent.click(topCloseBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape key press", () => {
    const onCloseMock = vi.fn();
    render(
      <PayoffScenarioComparisonModal
        isOpen={true}
        onClose={onCloseMock}
        scenarios={mockScenarios}
        activeDebts={mockActiveDebts}
        currency="PLN"
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("displays both scenario names correctly even if long", () => {
    render(
      <PayoffScenarioComparisonModal
        isOpen={true}
        onClose={vi.fn()}
        scenarios={mockScenarios}
        activeDebts={mockActiveDebts}
        currency="PLN"
      />
    );

    expect(screen.getAllByText(/Wariant agresywny spłaty hipoteki ze szczegółową analizą/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Status Quo/i).length).toBeGreaterThan(0);
  });

  it("displays safe defensive state when fewer than two scenarios are passed", () => {
    render(
      <PayoffScenarioComparisonModal
        isOpen={true}
        onClose={vi.fn()}
        scenarios={[mockScenarios[0]]}
        activeDebts={mockActiveDebts}
        currency="PLN"
      />
    );

    expect(screen.getByText(/Aby porównać, wybierz dokładnie dwa scenariusze\./i)).toBeTruthy();
    expect(screen.queryAllByText("NaN").length).toBe(0);
    expect(screen.queryAllByText("undefined").length).toBe(0);
  });

  it("displays properly formatted metrics and associates them with scenarios", () => {
    render(
      <PayoffScenarioComparisonModal
        isOpen={true}
        onClose={vi.fn()}
        scenarios={mockScenarios}
        activeDebts={mockActiveDebts}
        currency="PLN"
      />
    );

    // Scenario #1 check - use a regex that ignores NBSP
    const textContent = screen.getByRole("dialog").textContent;
    expect(textContent).toMatch(/\+1.*000,00/);
    
    // Check that there is no NaN or undefined
    expect(textContent).not.toMatch(/\bNaN\b/);
    expect(textContent).not.toMatch(/\bundefined\b/);
  });
});
