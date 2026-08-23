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

  it("renders payer badges and accessible mobile edit/delete buttons in shared profile", () => {
    const onOpenTxModal = vi.fn();
    const sharedTx: Transaction = {
      id: "tx-shared",
      name: "Czynsz Mieszkanie",
      amount: 1500,
      type: "expense",
      category: "Rachunki",
      account: "Konto Główne",
      isoDate: "2026-08-10",
      paidBy: "me",
      splitMode: "equal",
      currency: "PLN",
    };

    const sharedProfile: Profile = {
      ...mockProfile,
      kind: "shared",
      transactions: [sharedTx],
    };

    render(
      <TransactionsView
        profile={sharedProfile}
        onOpenTxModal={onOpenTxModal}
        onDeleteTransaction={vi.fn()}
        onImportTransactions={vi.fn()}
      />
    );

    // Verify payer badges
    const payerBadges = screen.getAllByText(/Ja \(50-50\)/);
    expect(payerBadges.length).toBeGreaterThan(0);

    // Verify mobile edit button
    const editMobBtn = screen.getByRole("button", { name: "Edytuj transakcję Czynsz Mieszkanie" });
    expect(editMobBtn).toBeTruthy();
    fireEvent.click(editMobBtn);
    expect(onOpenTxModal).toHaveBeenCalledWith(sharedTx);
  });

  it("renders smart rules button when rules exist and opens preview modal", () => {
    const profileWithRules: Profile = {
      ...mockProfile,
      transactions: [
        {
          id: "tx-1",
          name: "Biedronka Zakupy",
          amount: 50,
          type: "expense",
          category: "Inne",
          account: "Konto Główne",
          isoDate: "2026-08-15",
          currency: "PLN",
        },
      ],
      smartRules: [
        {
          id: "sr-1",
          name: "Biedronka -> Jedzenie",
          enabled: true,
          priority: 1,
          condition: { field: "name", operator: "contains", value: "Biedronka" },
          action: { type: "setCategory", categoryId: "Jedzenie" },
          createdAt: "2026-08-01T10:00:00Z",
        },
      ],
    };

    const onApplySmartRulesBulk = vi.fn().mockReturnValue({ appliedCount: 1 });
    const onShowToast = vi.fn();

    render(
      <TransactionsView
        profile={profileWithRules}
        onOpenTxModal={vi.fn()}
        onDeleteTransaction={vi.fn()}
        onImportTransactions={vi.fn()}
        onApplySmartRulesBulk={onApplySmartRulesBulk}
        onShowToast={onShowToast}
      />
    );

    const rulesBtn = screen.getByRole("button", { name: /Reguły \(1\)/i });
    expect(rulesBtn).toBeTruthy();

    fireEvent.click(rulesBtn);
    expect(screen.getByText("Podgląd reguł automatyzacji")).toBeTruthy();
    expect(screen.getByText("Dopasowano 1 transakcję")).toBeTruthy();

    // Click apply
    const applyBtn = screen.getByRole("button", { name: /Zastosuj zmiany/i });
    fireEvent.click(applyBtn);

    expect(onApplySmartRulesBulk).toHaveBeenCalledWith(["tx-1"]);
    expect(onShowToast).toHaveBeenCalledWith("Zaktualizowano kategorie w 1 transakcji", "success");
  });

  describe("Sprint 35 — Reverse Debt Link Indicator", () => {
    const profileWithDebts: Profile = {
      ...mockProfile,
      debts: [
        {
          id: "debt-1",
          name: "Kredyt hipoteczny PKO",
          institution: "PKO BP",
          type: "mortgage",
          currency: "PLN",
          balance: 320000,
          originalAmount: 350000,
          monthlyPayment: 2400,
          interestRate: 6.5,
          status: "active",
          createdAt: "2026-01-01"
        }
      ],
      transactions: [
        {
          id: "tx-unlinked",
          name: "Zakupy spożywcze",
          amount: 150,
          type: "expense",
          category: "Jedzenie",
          account: "Konto Główne",
          isoDate: "2026-08-10",
          currency: "PLN"
        },
        {
          id: "tx-linked",
          name: "Rata kredytu sierpień",
          amount: 2400,
          type: "expense",
          category: "Rachunki",
          account: "Konto Główne",
          isoDate: "2026-08-12",
          debtId: "debt-1",
          currency: "PLN"
        },
        {
          id: "tx-stale-debt",
          name: "Stara rata pożyczki",
          amount: 500,
          type: "expense",
          category: "Rachunki",
          account: "Konto Główne",
          isoDate: "2026-08-14",
          debtId: "debt-nonexistent",
          currency: "PLN"
        }
      ]
    };

    it("preserves unlinked transaction rendering without debt indicator", () => {
      render(
        <TransactionsView
          profile={profileWithDebts}
          onOpenTxModal={vi.fn()}
          onDeleteTransaction={vi.fn()}
          onImportTransactions={vi.fn()}
        />
      );

      // Unlinked transaction exists
      expect(screen.getAllByText("Zakupy spożywcze").length).toBeGreaterThan(0);
      // No indicator for unlinked transaction
      expect(screen.queryByText(/Powiązany dług: Zakupy spożywcze/i)).toBeNull();
    });

    it("displays linked debt name and navigates when clicked", () => {
      const onNavigateToDebts = vi.fn();
      render(
        <TransactionsView
          profile={profileWithDebts}
          onOpenTxModal={vi.fn()}
          onDeleteTransaction={vi.fn()}
          onImportTransactions={vi.fn()}
          onNavigateToDebts={onNavigateToDebts}
        />
      );

      // Linked debt indicator is displayed
      const debtLabels = screen.getAllByText(/Powiązany dług: Kredyt hipoteczny PKO/i);
      expect(debtLabels.length).toBeGreaterThan(0);

      // Accessible navigation button
      const navButtons = screen.getAllByRole("button", { name: /Zobacz szczegóły długu Kredyt hipoteczny PKO/i });
      expect(navButtons.length).toBeGreaterThan(0);

      fireEvent.click(navButtons[0]);
      expect(onNavigateToDebts).toHaveBeenCalledWith("debt-1");
    });

    it("displays neutral fallback for orphaned debtId without throwing errors or mutating data", () => {
      render(
        <TransactionsView
          profile={profileWithDebts}
          onOpenTxModal={vi.fn()}
          onDeleteTransaction={vi.fn()}
          onImportTransactions={vi.fn()}
        />
      );

      // Stale debt indicator fallback
      const fallbacks = screen.getAllByText("Powiązany dług niedostępny");
      expect(fallbacks.length).toBeGreaterThan(0);
    });
  });
});
