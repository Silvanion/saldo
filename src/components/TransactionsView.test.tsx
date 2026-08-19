/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TransactionsView } from "./TransactionsView";
import { Profile, Transaction } from "../types";

let mockAppState = {
  profiles: [
    {
      id: "prof-1",
      name: "Osobisty",
      kind: "personal" as const,
      currency: "PLN",
      budgets: { "Jedzenie": 1000, "Rachunki": 500 },
      accounts: [{ id: "acc-1", name: "Konto Główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }],
      transactions: [] as Transaction[],
      payments: [],
      goals: [],
      investments: [],
      recurringRules: [],
    },
  ],
  activeProfileId: "prof-1",
};

vi.mock("../app/providers/AppContext", () => ({
  useApp: () => ({
    state: mockAppState,
  }),
}));

describe("TransactionsView (Filter controls, Empty states & Tag Ribbon)", () => {
  afterEach(() => {
    cleanup();
  });

  const mockProfile: Profile = {
    id: "prof-1",
    name: "Osobisty",
    currency: "PLN",
    kind: "personal",
    budgets: { "Jedzenie": 1000, "Rachunki": 500 },
    accounts: [{ id: "acc-1", name: "Konto Główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }],
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    recurringRules: [],
  };

  it("renders empty state when there are no transactions in profile", () => {
    const onOpenTxModal = vi.fn();
    render(
      <TransactionsView
        profile={mockProfile}
        onOpenTxModal={onOpenTxModal}
        onDeleteTransaction={vi.fn()}
        onImportTransactions={vi.fn()}
      />
    );

    expect(screen.getAllByText("Brak zarejestrowanych transakcji").length).toBeGreaterThan(0);
    const addFirstBtns = screen.getAllByText(/\+ Dodaj pierwszą transakcję|\+ Dodaj transakcję/);
    expect(addFirstBtns.length).toBeGreaterThan(0);
    fireEvent.click(addFirstBtns[0]);
    expect(onOpenTxModal).toHaveBeenCalled();
  });

  it("renders filter controls and empty state when search matches nothing", () => {
    const tx: Transaction = {
      id: "tx-1",
      name: "Biedronka Zakupy",
      amount: 120.5,
      type: "expense",
      category: "Jedzenie",
      account: "Konto Główne",
      isoDate: "2026-08-15",
      tags: ["spożywcze"],
      currency: "PLN",
    };

    const profileWithTx: Profile = {
      ...mockProfile,
      transactions: [tx],
    };

    render(
      <TransactionsView
        profile={profileWithTx}
        onOpenTxModal={vi.fn()}
        onDeleteTransaction={vi.fn()}
        onImportTransactions={vi.fn()}
      />
    );

    // Initial state: transaction name should be visible
    expect(screen.getAllByText("Biedronka Zakupy").length).toBeGreaterThan(0);

    // Filter by Income
    const incomeBtn = screen.getByRole("button", { name: "Przychody" });
    fireEvent.click(incomeBtn);

    // Now empty filter state should appear
    expect(screen.getAllByText("Brak transakcji pasujących do filtrów").length).toBeGreaterThan(0);
  });

  it("allows selecting and clearing tag from tag ribbon", () => {
    const tx1: Transaction = {
      id: "tx-1",
      name: "Supermarket",
      amount: 50,
      type: "expense",
      category: "Jedzenie",
      account: "Konto Główne",
      isoDate: "2026-08-15",
      tags: ["spożywcze"],
      currency: "PLN",
    };
    const tx2: Transaction = {
      id: "tx-2",
      name: "Paliwo Orlen",
      amount: 200,
      type: "expense",
      category: "Transport",
      account: "Konto Główne",
      isoDate: "2026-08-14",
      tags: ["auto"],
      currency: "PLN",
    };

    const profileWithTags: Profile = {
      ...mockProfile,
      transactions: [tx1, tx2],
    };

    render(
      <TransactionsView
        profile={profileWithTags}
        onOpenTxModal={vi.fn()}
        onDeleteTransaction={vi.fn()}
        onImportTransactions={vi.fn()}
      />
    );

    const tagBtn = screen.getByRole("button", { name: "#spożywcze" });
    fireEvent.click(tagBtn);

    // Clear tag button should now be visible
    const clearTagBtn = screen.getByRole("button", { name: /Wyczyść filtr tagu/i });
    expect(clearTagBtn).toBeTruthy();

    fireEvent.click(clearTagBtn);
    expect(screen.queryByRole("button", { name: /Wyczyść filtr tagu/i })).toBeNull();
  });
});
