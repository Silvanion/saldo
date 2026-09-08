/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BudgetView } from "./BudgetView";
import { BudgetModal } from "./Modals";
import { Profile, Transaction } from "../types";

describe("BudgetView (Header metrics, CTA, Alert banners & Category cards)", () => {
  afterEach(() => {
    cleanup();
  });

  const selectedDate = new Date("2026-08-15T12:00:00.000Z");

  const mockProfile: Profile = {
    id: "prof-1",
    name: "Osobisty",
    currency: "PLN",
    kind: "personal",
    budgets: {
      "Żywność": 1000,
      "Dom i rachunki": 500,
      "Transport": 200,
    },
    accounts: [{ id: "acc-1", name: "Konto Główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }],
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    recurringRules: [],
  };

  it("renders header metrics and CTA button", () => {
    const onOpenBudgetModal = vi.fn();
    render(
      <BudgetView
        profile={mockProfile}
        selectedDate={selectedDate}
        onOpenBudgetModal={onOpenBudgetModal}
      />
    );

    expect(screen.getByText("Plan Kontroli Kosztów")).toBeTruthy();
    expect(screen.getByText("Budżety miesięczne")).toBeTruthy();
    expect(screen.getByText(/Zaplanowano:/)).toBeTruthy();
    expect(screen.getByText(/Wydano:/)).toBeTruthy();

    const cta = screen.getByRole("button", { name: /Modyfikuj limity/i });
    expect(cta).toBeTruthy();
    fireEvent.click(cta);
    expect(onOpenBudgetModal).toHaveBeenCalled();
  });

  it("renders alert banner when budget is exceeded or close to limit", () => {
    const txOver: Transaction = {
      id: "tx-over",
      name: "Supermarket Zakupy",
      amount: 1100, // Limit is 1000 for Żywność -> Exceeded!
      type: "expense",
      category: "Żywność",
      account: "Konto Główne",
      isoDate: "2026-08-10",
      currency: "PLN",
    };
    const txClose: Transaction = {
      id: "tx-close",
      name: "Paliwo",
      amount: 180, // Limit is 200 for Transport -> 90% Close to limit!
      type: "expense",
      category: "Transport",
      account: "Konto Główne",
      isoDate: "2026-08-11",
      currency: "PLN",
    };

    const profileWithExpenses: Profile = {
      ...mockProfile,
      transactions: [txOver, txClose],
    };

    render(
      <BudgetView
        profile={profileWithExpenses}
        selectedDate={selectedDate}
        onOpenBudgetModal={vi.fn()}
      />
    );

    // Over budget banner
    const alertOver = screen.getByText(/Przekroczono zaplanowany budżet o/i);
    expect(alertOver).toBeTruthy();

    // Close to limit banner
    const alertClose = screen.getByText(/Blisko limitu. Pozostało/i);
    expect(alertClose).toBeTruthy();
  });

  it("renders recent expenses inside category cards and empty state for unused categories", () => {
    const tx: Transaction = {
      id: "tx-rach",
      name: "Prąd Enea",
      amount: 250,
      type: "expense",
      category: "Dom i rachunki",
      account: "Konto Główne",
      isoDate: "2026-08-05",
      currency: "PLN",
    };

    const profileWithExpense: Profile = {
      ...mockProfile,
      transactions: [tx],
    };

    render(
      <BudgetView
        profile={profileWithExpense}
        selectedDate={selectedDate}
        onOpenBudgetModal={vi.fn()}
      />
    );

    // Recent expense item and count
    expect(screen.getByText("Prąd Enea")).toBeTruthy();
    expect(screen.getByText("1 wpis")).toBeTruthy();

    // Contextual remaining amount under progress bar for normal budget state
    expect(screen.getAllByText("Pozostało do limitu:").length).toBeGreaterThan(0);

    // Empty state for categories with no expenses
    expect(screen.getAllByText("Brak wydatków w tym miesiącu").length).toBeGreaterThan(0);
  });
});

describe("BudgetModal (UI unification, inputs, close & submission)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders when open and handles form changes and submission", () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const currentBudgets = { "Żywność": 1000 };

    render(
      <BudgetModal
        isOpen={true}
        onClose={onClose}
        currentBudgets={currentBudgets}
        onSave={onSave}
      />
    );

    expect(screen.getByText("Ustaw limity wydatków")).toBeTruthy();

    // Check close button has min 44px touch target
    const closeBtn = screen.getByLabelText("Zamknij");
    expect(closeBtn.className).toContain("min-h-[44px]");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Check submit button has min 44px touch target
    const submitBtn = screen.getByRole("button", { name: /Zapisz limity/i });
    expect(submitBtn.className).toContain("min-h-[44px]");
    fireEvent.click(submitBtn);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ "Żywność": 1000 }));
  });
});
