/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TransactionModal } from "./TransactionModal";
import { Profile } from "../types";

let mockAppState = {
  profiles: [
    {
      id: "prof-1",
      name: "Osobisty",
      currency: "PLN",
      accounts: [{ id: "acc-1", name: "Konto główne", bankName: "mBank" }],
      transactions: [],
      smartRules: [],
      transactionRules: [],
    },
  ],
  activeProfileId: "prof-1",
};

const mockHandleAddSmartRule = vi.fn();
const mockShowToast = vi.fn();

vi.mock("../app/providers/AppContext", () => ({
  useApp: () => ({
    state: mockAppState,
    handleAddSmartRule: mockHandleAddSmartRule,
    showToast: mockShowToast,
  }),
}));

describe("TransactionModal — Smart Rule Suggestion Flow (Sprint 2)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockProfile: Profile = {
    id: "prof-1",
    name: "Osobisty",
    currency: "PLN",
    kind: "personal",
    budgets: {},
    accounts: [{ id: "acc-1", name: "Konto główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }],
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    smartRules: [],
    transactionRules: [],
  };

  it("triggers rule suggestion prompt after saving a new transaction with a category", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const onAddSmartRule = vi.fn();
    const onShowToast = vi.fn();

    render(
      <TransactionModal
        isOpen={true}
        onClose={onClose}
        activeProfile={mockProfile}
        onSave={onSave}
        onAddSmartRule={onAddSmartRule}
        onShowToast={onShowToast}
      />
    );

    // Fill form
    const amountInput = screen.getByLabelText("Kwota");
    const nameInput = screen.getByLabelText("Opis transakcji");
    const categorySelect = screen.getByLabelText("Kategoria");

    fireEvent.change(amountInput, { target: { value: "145.50" } });
    fireEvent.change(nameInput, { target: { value: "Zakupy Biedronka #124" } });
    fireEvent.change(categorySelect, { target: { value: "Żywność" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Dodaj transakcję|Zapisz zmiany/i }));

    // Verify transaction was saved immediately
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Zakupy Biedronka #124",
        amount: 145.5,
        category: "Żywność",
      })
    );

    // Verify suggestion prompt is rendered
    expect(screen.getByText("Utworzyć regułę dla podobnych wpisów?")).toBeTruthy();
    expect(screen.getByText(/"Biedronka"/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Utwórz regułę/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Nie teraz/i })).toBeTruthy();

    // Accept suggestion
    fireEvent.click(screen.getByRole("button", { name: /Utwórz regułę/i }));

    expect(onAddSmartRule).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Auto: Biedronka → Żywność",
        condition: {
          field: "name",
          operator: "contains",
          value: "Biedronka",
        },
        action: {
          type: "setCategory",
          categoryId: "Żywność",
        },
      })
    );
    expect(onShowToast).toHaveBeenCalledWith('Utworzono regułę dla "Biedronka"', "success");
    expect(onClose).toHaveBeenCalled();
  });

  it("does not suggest rule when dismissed via 'Nie teraz' button", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const onAddSmartRule = vi.fn();

    render(
      <TransactionModal
        isOpen={true}
        onClose={onClose}
        activeProfile={mockProfile}
        onSave={onSave}
        onAddSmartRule={onAddSmartRule}
      />
    );

    fireEvent.change(screen.getByLabelText("Kwota"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Opis transakcji"), { target: { value: "Uber *Trip" } });
    fireEvent.change(screen.getByLabelText("Kategoria"), { target: { value: "Transport" } });

    fireEvent.click(screen.getByRole("button", { name: /Dodaj transakcję|Zapisz zmiany/i }));

    expect(onSave).toHaveBeenCalled();
    expect(screen.getByText("Utworzyć regułę dla podobnych wpisów?")).toBeTruthy();

    // Click 'Nie teraz'
    fireEvent.click(screen.getByRole("button", { name: "Nie teraz" }));

    expect(onAddSmartRule).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("does not suggest rule for weak/short or pure-number description", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <TransactionModal
        isOpen={true}
        onClose={onClose}
        activeProfile={mockProfile}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText("Kwota"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Opis transakcji"), { target: { value: "123" } });

    fireEvent.click(screen.getByRole("button", { name: /Dodaj transakcję|Zapisz zmiany/i }));

    expect(onSave).toHaveBeenCalled();
    expect(screen.queryByText("Utworzyć regułę dla podobnych wpisów?")).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it("does not suggest rule when an equivalent rule already exists in profile", () => {
    const profileWithExistingRule: Profile = {
      ...mockProfile,
      smartRules: [
        {
          id: "r-1",
          name: "Biedronka -> Żywność",
          enabled: true,
          priority: 1,
          condition: { field: "name", operator: "contains", value: "Biedronka" },
          action: { type: "setCategory", categoryId: "Żywność" },
          createdAt: "2026-08-01T10:00:00Z",
        },
      ],
    };

    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <TransactionModal
        isOpen={true}
        onClose={onClose}
        activeProfile={profileWithExistingRule}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText("Kwota"), { target: { value: "70" } });
    fireEvent.change(screen.getByLabelText("Opis transakcji"), { target: { value: "Biedronka Zakupy" } });
    fireEvent.change(screen.getByLabelText("Kategoria"), { target: { value: "Żywność" } });

    fireEvent.click(screen.getByRole("button", { name: /Dodaj transakcję|Zapisz zmiany/i }));

    expect(onSave).toHaveBeenCalled();
    expect(screen.queryByText("Utworzyć regułę dla podobnych wpisów?")).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it("in edit mode: does not suggest rule if category was not changed", () => {
    const initialTx = {
      id: "tx-1",
      name: "Stacja Orlen",
      amount: 250,
      type: "expense" as const,
      category: "Transport",
      account: "Konto główne",
      isoDate: "2026-08-15",
    };

    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <TransactionModal
        isOpen={true}
        onClose={onClose}
        activeProfile={mockProfile}
        initialData={initialTx}
        onSave={onSave}
      />
    );

    // Only change amount
    fireEvent.change(screen.getByLabelText("Kwota"), { target: { value: "300" } });

    fireEvent.click(screen.getByRole("button", { name: /Dodaj transakcję|Zapisz zmiany/i }));

    expect(onSave).toHaveBeenCalled();
    expect(screen.queryByText("Utworzyć regułę dla podobnych wpisów?")).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it("in edit mode: suggests rule when category was changed", () => {
    const initialTx = {
      id: "tx-1",
      name: "Stacja Orlen",
      amount: 250,
      type: "expense" as const,
      category: "Inne",
      account: "Konto główne",
      isoDate: "2026-08-15",
    };

    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <TransactionModal
        isOpen={true}
        onClose={onClose}
        activeProfile={mockProfile}
        initialData={initialTx}
        onSave={onSave}
      />
    );

    // Change category to Transport
    fireEvent.change(screen.getByLabelText("Kategoria"), { target: { value: "Transport" } });

    fireEvent.click(screen.getByRole("button", { name: /Dodaj transakcję|Zapisz zmiany/i }));

    expect(onSave).toHaveBeenCalled();
    expect(screen.getByText("Utworzyć regułę dla podobnych wpisów?")).toBeTruthy();
    expect(screen.getByText(/"Orlen"/i)).toBeTruthy();
  });
});
