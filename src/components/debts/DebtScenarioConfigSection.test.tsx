/** @vitest-environment jsdom */
// src/components/debts/DebtScenarioConfigSection.test.tsx
import React from "react";
import { render, fireEvent, screen, within, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import DebtsView from "./DebtsView";
import { Profile, DebtItem } from "../../types";
const mockDebts: DebtItem[] = [
  {
    id: "debt-1",
    name: "Kredyt hipoteczny",
    institution: "PKO BP",
    type: "mortgage",
    currency: "PLN",
    balance: 350000,
    originalAmount: 400000,
    monthlyPayment: 2600,
    interestRate: 6.85,
    rateType: "fixed",
    fixedRateEndDate: "03.2028",
    propertyValue: 500000,
    status: "active",
    createdAt: "2026-01-01"
  },
  {
    id: "debt-2",
    name: "Karta Visa",
    institution: "mBank",
    type: "credit_card",
    currency: "PLN",
    balance: 8000,
    creditLimit: 10000,
    monthlyPayment: 400,
    interestRate: 18.5,
    status: "active",
    createdAt: "2026-01-01"
  }
];

const mockProfile: Profile = {
  id: "test-profile-1",
  name: "Test User",
  kind: "personal",
  currency: "PLN",
  transactions: [],
  payments: [],
  goals: [],
  investments: [],
  budgets: {},
  debts: mockDebts,
};

const profileWithOneScenario: Profile = {
  ...mockProfile,
  debtPayoffScenarios: [
    { id: "sc-1", name: "Plan A", strategy: "snowball", extraMonthlyPayment: 300, createdAt: "2026-01-01" },
  ],
};

const profileWithThreeScenarios: Profile = {
  ...mockProfile,
  debtPayoffScenarios: [
    { id: "sc-1", name: "Plan A", strategy: "snowball", extraMonthlyPayment: 300, createdAt: "2026-01-01" },
    { id: "sc-2", name: "Plan B", strategy: "avalanche", extraMonthlyPayment: 500, createdAt: "2026-01-02" },
    { id: "sc-3", name: "Plan C", strategy: "custom", extraMonthlyPayment: 1000, customDebtOrder: [], createdAt: "2026-01-03" },
  ],
};

describe("DebtScenarioConfigSection Compare CTA accessibility", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows helper text when fewer than two saved scenarios and CTA is disabled", async () => {
    const { container } = render(<DebtsView profile={profileWithOneScenario} showToast={vi.fn()} />);
    
    // Open tab
    const strategyTopBtn = screen.getAllByRole("button", { name: /Porównaj strategie/i }).find((btn) => !(btn as HTMLButtonElement).disabled);
    fireEvent.click(strategyTopBtn!);

    await waitFor(() => {
      expect(container.querySelector("#btn-compare-scenarios")).toBeTruthy();
    });
    const compareBtn = container.querySelector("#btn-compare-scenarios") as HTMLButtonElement;
    
    expect(compareBtn.disabled).toBe(true);
    expect(compareBtn.getAttribute("aria-disabled")).toBe("true");

    expect(screen.getByText(/Zapisz przynajmniej dwa scenariusze, aby móc je porównać\./i)).toBeTruthy();
  });

  it("shows helper text when saved scenarios exist but selection count is insufficient", async () => {
    const { container } = render(<DebtsView profile={profileWithThreeScenarios} showToast={vi.fn()} />);
    
    const strategyTopBtn = screen.getAllByRole("button", { name: /Porównaj strategie/i }).find((btn) => !(btn as HTMLButtonElement).disabled);
    fireEvent.click(strategyTopBtn!);

    await waitFor(() => {
      expect(container.querySelector("#btn-compare-scenarios")).toBeTruthy();
    });
    const compareBtn = container.querySelector("#btn-compare-scenarios") as HTMLButtonElement;
    
    expect(compareBtn.disabled).toBe(true);
    expect(compareBtn.getAttribute("aria-disabled")).toBe("true");
    
    expect(screen.getByText(/Wybierz dwa scenariusze do porównania\./i)).toBeTruthy();
  });

  it("enables compare CTA with exactly two valid selected scenarios and labels are correct", async () => {
    const { container } = render(<DebtsView profile={profileWithThreeScenarios} showToast={vi.fn()} />);
    
    const strategyTopBtn = screen.getAllByRole("button", { name: /Porównaj strategie/i }).find((btn) => !(btn as HTMLButtonElement).disabled);
    fireEvent.click(strategyTopBtn!);

    const checkboxA = await screen.findByRole("checkbox", { name: /Wybierz scenariusz Plan A do porównania/i });
    const checkboxB = screen.getByRole("checkbox", { name: /Wybierz scenariusz Plan B do porównania/i });
    
    fireEvent.click(checkboxA);
    fireEvent.click(checkboxB);

    const compareBtn = container.querySelector("#btn-compare-scenarios") as HTMLButtonElement;
    
    // Enabled assertions
    await waitFor(() => {
      expect(compareBtn.disabled).toBe(false);
    });
    expect(compareBtn.getAttribute("aria-disabled")).toBe("false");

    // Labels assertions
    expect(compareBtn.getAttribute("aria-label")).toMatch(/wybrano 2 z 2/i);
    expect(within(compareBtn).getByText(/Porównaj scenariusze \(2 \/ 2\)/i)).toBeTruthy();

    // Helper text should disappear
    expect(screen.queryByText(/Wybierz dwa scenariusze do porównania\./i)).toBeNull();
  });

  it("scenario controls have accessible names", async () => {
    render(<DebtsView profile={profileWithThreeScenarios} showToast={vi.fn()} />);
    const strategyTopBtn = screen.getAllByRole("button", { name: /Porównaj strategie/i }).find((btn) => !(btn as HTMLButtonElement).disabled);
    fireEvent.click(strategyTopBtn!);

    expect(await screen.findByRole("checkbox", { name: /Wybierz scenariusz Plan A do porównania/i })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Wybierz scenariusz Plan B do porównania/i })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Wybierz scenariusz Plan C do porównania/i })).toBeTruthy();
  });

  it("disables unselected scenario after two scenarios are selected, and re-enables on deselection", async () => {
    render(<DebtsView profile={profileWithThreeScenarios} showToast={vi.fn()} />);
    const strategyTopBtn = screen.getAllByRole("button", { name: /Porównaj strategie/i }).find((btn) => !(btn as HTMLButtonElement).disabled);
    fireEvent.click(strategyTopBtn!);

    const checkboxA = await screen.findByRole("checkbox", { name: /Wybierz scenariusz Plan A do porównania/i }) as HTMLInputElement;
    const checkboxB = screen.getByRole("checkbox", { name: /Wybierz scenariusz Plan B do porównania/i }) as HTMLInputElement;
    const checkboxC = screen.getByRole("checkbox", { name: /Wybierz scenariusz Plan C do porównania/i }) as HTMLInputElement;

    // Select two scenarios
    fireEvent.click(checkboxA);
    fireEvent.click(checkboxB);

    // Unselected scenario is disabled
    await waitFor(() => {
      expect(checkboxC.disabled).toBe(true);
    });
    
    // Selected scenarios can be deselected (not disabled)
    expect(checkboxA.disabled).toBe(false);
    expect(checkboxB.disabled).toBe(false);

    // Deselect one
    fireEvent.click(checkboxB);

    // Re-enables another scenario
    await waitFor(() => {
      expect(checkboxC.disabled).toBe(false);
    });
  });
  
  it("stale selected IDs do not enable compare or inflate the count", async () => {
    const { container, rerender } = render(<DebtsView profile={profileWithThreeScenarios} showToast={vi.fn()} />);
    const strategyTopBtn = screen.getAllByRole("button", { name: /Porównaj strategie/i }).find((btn) => !(btn as HTMLButtonElement).disabled);
    fireEvent.click(strategyTopBtn!);

    const checkboxA = await screen.findByRole("checkbox", { name: /Wybierz scenariusz Plan A do porównania/i });
    const checkboxB = screen.getByRole("checkbox", { name: /Wybierz scenariusz Plan B do porównania/i });
    
    // Select two scenarios
    fireEvent.click(checkboxA);
    fireEvent.click(checkboxB);

    const compareBtn = container.querySelector("#btn-compare-scenarios") as HTMLButtonElement;
    await waitFor(() => {
      expect(compareBtn.disabled).toBe(false);
    });

    // Now remove Plan B from profile
    const profileWithoutB = {
      ...profileWithThreeScenarios,
      debtPayoffScenarios: [
        { id: "sc-1", name: "Plan A", strategy: "snowball", extraMonthlyPayment: 300, createdAt: "2026-01-01" },
        { id: "sc-3", name: "Plan C", strategy: "custom", extraMonthlyPayment: 1000, customDebtOrder: [], createdAt: "2026-01-03" },
      ]
    };

    rerender(<DebtsView profile={profileWithoutB as any} showToast={vi.fn()} />);
    
    // Count should drop to 1
    await waitFor(() => {
      expect(compareBtn.disabled).toBe(true);
    });
    expect(compareBtn.getAttribute("aria-label")).toMatch(/wybrano 1 z 2/i);
    expect(within(compareBtn).getByText(/Porównaj scenariusze \(1 \/ 2\)/i)).toBeTruthy();
  });
});
