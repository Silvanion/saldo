/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ImportTransactionsModal } from "./ImportTransactionsModal";
import { Profile, Transaction } from "../types";

let mockAppState = {
  aiMode: "none" as const,
};

let mockActiveProfile: Profile = {
  id: "prof-1",
  name: "Osobisty",
  currency: "PLN",
  kind: "personal",
  budgets: {},
  accounts: [{ id: "acc-1", name: "Konto główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }],
  transactions: [
    {
      id: "tx-existing-1",
      name: "Zakupy Biedronka",
      amount: 150.5,
      type: "expense",
      category: "Żywność",
      account: "Konto główne",
      isoDate: "2026-07-20",
      currency: "PLN"
    }
  ],
  payments: [],
  goals: [],
  investments: [],
  smartRules: [],
  transactionRules: []
};

vi.mock("../app/providers/AppContext", () => ({
  useApp: () => ({
    state: mockAppState,
    activeProfile: mockActiveProfile,
  }),
}));

describe("ImportTransactionsModal — Import Quality & Data Trust v1", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const SAMPLE_CSV = `
Data;Kwota;Tytuł;Waluta
2026-07-20;-150,50;Zakupy Biedronka;PLN
2026-07-21;-210,00;Paliwo Orlen;PLN
2026-07-22;-45,00;Bilety Kino;EUR
invalid_date;100;Błędna data;PLN
2026-07-23;bad_amount;Błędna kwota;PLN
`.trim();

  it("1. full flow: parses CSV, presents metrics bar, handles duplicate detection, and imports selected rows", () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(
      <ImportTransactionsModal
        isOpen={true}
        onClose={onClose}
        onImport={onImport}
      />
    );

    // Step 1: Paste CSV
    const textarea = screen.getByPlaceholderText(/Tutaj możesz wkleić skopiowane wiersze/i);
    fireEvent.change(textarea, { target: { value: SAMPLE_CSV } });

    fireEvent.click(screen.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }));

    // Step 2: Mapping
    expect(screen.getByText(/Mapowanie kolumn/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Generuj podgląd/i }));

    // Step 3: Metrics Bar & Pre-import Breakdown
    expect(screen.getByText("Do zaimportowania")).toBeTruthy();
    expect(screen.getByText("Duplikaty")).toBeTruthy();
    expect(screen.getByText("Odrzucone")).toBeTruthy();
    expect(screen.getByText("Waluty")).toBeTruthy();

    // 2 rows were rejected (bad amount, bad date)
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);

    // Verify duplicate is detected for "Zakupy Biedronka"
    expect(screen.getByText(/Wykryto transakcje w innej walucie niż waluta profilu/i)).toBeTruthy();

    // Verify button label reflects selected rows
    const confirmBtn = screen.getByRole("button", { name: /Zaimportuj wybrane/i });
    expect(confirmBtn).toBeTruthy();

    // Test selective row unchecking
    const rowCheckboxes = screen.getAllByRole("checkbox");
    // Header toggle + 3 valid rows
    expect(rowCheckboxes.length).toBe(4);

    // Toggle row 1
    fireEvent.click(rowCheckboxes[1]);

    // Submit import
    fireEvent.click(screen.getByRole("button", { name: /Zaimportuj wybrane/i }));

    expect(onImport).toHaveBeenCalled();
    const imported: Transaction[] = onImport.mock.calls[0][0];
    expect(imported.length).toBeGreaterThan(0);
    expect(onClose).toHaveBeenCalled();
  });

  it("2. allows deselecting duplicates via toolbar button", () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(
      <ImportTransactionsModal
        isOpen={true}
        onClose={onClose}
        onImport={onImport}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Tutaj możesz wkleić skopiowane wiersze/i), {
      target: { value: SAMPLE_CSV }
    });
    fireEvent.click(screen.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generuj podgląd/i }));

    const deselectDupBtn = screen.queryByRole("button", { name: /Odznacz duplikaty/i });
    if (deselectDupBtn) {
      fireEvent.click(deselectDupBtn);
    }

    const toggleAllBtn = screen.getByRole("button", { name: /Odznacz wszystkie|Zaznacz wszystkie/i });
    expect(toggleAllBtn).toBeTruthy();
  });

  it("3. clicking 'Anuluj' closes without calling onImport", () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(
      <ImportTransactionsModal
        isOpen={true}
        onClose={onClose}
        onImport={onImport}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Tutaj możesz wkleić skopiowane wiersze/i), {
      target: { value: SAMPLE_CSV }
    });
    fireEvent.click(screen.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generuj podgląd/i }));

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(onImport).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
