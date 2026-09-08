/* @vitest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { DebtDetailsModal } from "./DebtDetailsModal";
import { DebtItem, Transaction } from "../../types";

const mockDebt: DebtItem = {
  id: "debt-test-1",
  name: "Kredyt hipoteczny PKO",
  balance: 350000,
  monthlyPayment: 2500,
  interestRate: 7.5,
  type: "mortgage",
  status: "active",
  currency: "PLN",
  institution: "PKO BP",
  createdAt: "2026-01-01T00:00:00Z"
};

const tx1: Transaction = {
  id: "tx-1",
  name: "Rata majowa",
  amount: 2500,
  category: "Kredyty",
  type: "expense",
  account: "Główne",
  isoDate: "2026-05-10",
  debtId: "debt-test-1",
  currency: "PLN"
};

const tx2: Transaction = {
  id: "tx-2",
  name: "Rata czerwcowa",
  amount: 2500,
  category: "Kredyty",
  type: "expense",
  account: "Główne",
  isoDate: "2026-06-10",
  debtId: "debt-test-1",
  currency: "PLN"
};

const txUnrelated: Transaction = {
  id: "tx-unrelated",
  name: "Paliwo",
  amount: 200,
  category: "Auto",
  type: "expense",
  account: "Główne",
  isoDate: "2026-06-05",
  debtId: "debt-other",
  currency: "PLN"
};

const txNoDescription: Transaction = {
  id: "tx-nodesc",
  name: "",
  amount: 150,
  category: "Inne",
  type: "expense",
  account: "Główne",
  isoDate: "2026-06-01",
  debtId: "debt-test-1",
  currency: "PLN"
};

describe("Sprint 77: Debt-Linked Transaction History", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders empty state when no transactions are linked", () => {
    render(
      <DebtDetailsModal 
        isOpen={true} 
        onClose={vi.fn()} 
        debt={mockDebt} 
        transactions={[txUnrelated]} 
      />
    );
    
    expect(screen.getAllByText("Powiązane transakcje").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brak transakcji powiązanych z tym zobowiązaniem.").length).toBeGreaterThan(0);
    expect(screen.queryByText("Paliwo")).toBeNull();
  });

  it("renders linked transactions and correctly filters out unrelated ones", () => {
    render(
      <DebtDetailsModal 
        isOpen={true} 
        onClose={vi.fn()} 
        debt={mockDebt} 
        transactions={[tx1, txUnrelated, tx2]} 
      />
    );
    
    expect(screen.getAllByText("Powiązane transakcje (2)").length).toBeGreaterThan(0);
    expect(screen.getByText("Rata majowa")).toBeTruthy();
    expect(screen.getByText("Rata czerwcowa")).toBeTruthy();
    expect(screen.queryByText("Paliwo")).toBeNull();
  });

  it("renders fallback for transaction without description", () => {
    render(
      <DebtDetailsModal 
        isOpen={true} 
        onClose={vi.fn()} 
        debt={mockDebt} 
        transactions={[txNoDescription]} 
      />
    );
    
    expect(screen.getByText("Transakcja bez opisu")).toBeTruthy();
  });

  it("handles missing transactions gracefully", () => {
    render(
      <DebtDetailsModal 
        isOpen={true} 
        onClose={vi.fn()} 
        debt={mockDebt} 
      />
    );
    
    expect(screen.getAllByText("Brak transakcji powiązanych z tym zobowiązaniem.").length).toBeGreaterThan(0);
  });

  it("calls onOpenTxModal when edit button is clicked", () => {
    const onOpenTxModal = vi.fn();
    render(
      <DebtDetailsModal 
        isOpen={true} 
        onClose={vi.fn()} 
        debt={mockDebt} 
        transactions={[tx1]} 
        onOpenTxModal={onOpenTxModal}
      />
    );
    
    const editBtn = screen.getByRole("button", { name: "Edytuj transakcję Rata majowa — 2026-05-10" });
    fireEvent.click(editBtn);
    expect(onOpenTxModal).toHaveBeenCalledWith(tx1);
  });

  it("renders the transaction summary block with correct values", () => {
    render(
      <DebtDetailsModal 
        isOpen={true} 
        onClose={vi.fn()} 
        debt={mockDebt} 
        transactions={[tx1, tx2]} // Both are clean
      />
    );
    
    // Check summary block labels
    expect(screen.getAllByText("Łącznie transakcji").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Suma kwot transakcji").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Zakres dat").length).toBeGreaterThan(0);

    // Check count value in summary
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    
    // Check that there is no "Brak danych"
    expect(screen.queryAllByText("Brak danych").length).toBe(0);
  });

  it("renders data quality notice when transactions have incomplete data", () => {
    const txMissingDesc = { ...tx1, id: "tx-missing-desc", name: "" };
    const txMissingDate = { ...tx2, id: "tx-missing-date", isoDate: "" };
    const txInvalidDate = { ...tx2, id: "tx-invalid-date", isoDate: "invalid-date" };
    const txMissingCurr = { ...tx1, id: "tx-missing-curr", currency: undefined };

    render(
      <DebtDetailsModal 
        isOpen={true} 
        onClose={vi.fn()} 
        debt={mockDebt} 
        transactions={[txMissingDesc, txMissingDate, txInvalidDate, txMissingCurr]} 
      />
    );

    // Notice should be visible
    expect(screen.getAllByText("Jakość danych historii").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Niektóre powiązane transakcje mają niepełne dane. Historia obejmuje wyłącznie transakcje ręcznie powiązane z tym zobowiązaniem.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sprawdź szczegóły transakcji, jeśli chcesz uzupełnić brakujące informacje.").length).toBeGreaterThan(0);

    // Review action button should be visible
    expect(screen.getAllByText("Sprawdź transakcje").length).toBeGreaterThan(0);
    
    // Check specific conditions
    expect(screen.getAllByText("Brak opisu transakcji").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brak daty transakcji").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nieprawidłowa data transakcji").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Użyto waluty zobowiązania jako wartości domyślnej").length).toBeGreaterThan(0);
  });
  it("focuses the linked history list when review action is clicked", () => {
    const txMissingDesc = { ...tx1, id: "tx-missing-desc", name: "" };
    
    render(
      <DebtDetailsModal 
        isOpen={true} 
        onClose={vi.fn()} 
        debt={mockDebt} 
        transactions={[txMissingDesc]} 
      />
    );

    const reviewBtns = screen.getAllByRole("button", { name: "Sprawdź transakcje" });
    const reviewBtn = reviewBtns[reviewBtns.length - 1]; // get the latest rendered one
    
    // Mock scrollIntoView (jsdom doesn't implement it)
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    fireEvent.click(reviewBtn);

    const headings = screen.getAllByText(/Powiązane transakcje/);
    const heading = headings[headings.length - 1];
    expect(document.activeElement).toBe(heading);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("renders row-level review state for missing description", () => {
    const txMissingDesc = { ...tx1, id: "tx-missing-desc", name: "" };
    render(
      <DebtDetailsModal isOpen={true} onClose={vi.fn()} debt={mockDebt} transactions={[txMissingDesc, tx2]} />
    );
    // tx2 should not have a warning
    expect(screen.queryByText("Do sprawdzenia")).toBeTruthy();
    expect(screen.getAllByText("Brak opisu transakcji").length).toBeGreaterThan(0); // once in summary, once in row
  });

  it("renders row-level review state for missing or invalid date", () => {
    const txMissingDate = { ...tx1, id: "tx-missing-date", isoDate: "" };
    const txInvalidDate = { ...tx2, id: "tx-invalid-date", isoDate: "invalid-date" };
    render(
      <DebtDetailsModal isOpen={true} onClose={vi.fn()} debt={mockDebt} transactions={[txMissingDate, txInvalidDate]} />
    );
    expect(screen.getAllByText("Do sprawdzenia").length).toBe(2);
    expect(screen.getAllByText("Brak daty transakcji").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nieprawidłowa data transakcji").length).toBeGreaterThan(0);
  });

  it("renders row-level review state for missing currency", () => {
    const txMissingCurr = { ...tx1, id: "tx-missing-curr", currency: undefined };
    render(
      <DebtDetailsModal isOpen={true} onClose={vi.fn()} debt={mockDebt} transactions={[txMissingCurr]} />
    );
    expect(screen.getAllByText("Do sprawdzenia").length).toBe(1);
    expect(screen.getAllByText("Użyto waluty zobowiązania jako wartości domyślnej").length).toBeGreaterThan(0);
  });

  it("aggregates multiple issues on a single row without repeating the 'Do sprawdzenia' label", () => {
    const txMultiIssue = { ...tx1, id: "tx-multi", name: "", isoDate: "" };
    render(
      <DebtDetailsModal isOpen={true} onClose={vi.fn()} debt={mockDebt} transactions={[txMultiIssue]} />
    );
    // Only 1 'Do sprawdzenia' for the row
    expect(screen.getAllByText("Do sprawdzenia").length).toBe(1);
    
    // Check that both issues are present
    expect(screen.getAllByText("Brak opisu transakcji").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brak daty transakcji").length).toBeGreaterThan(0);
  });

  it("renders review navigation and focuses first affected row", () => {
    const txMissingDate = { ...tx1, id: "tx-missing-date", isoDate: "" };
    render(
      <DebtDetailsModal isOpen={true} onClose={vi.fn()} debt={mockDebt} transactions={[txMissingDate, tx2]} />
    );
    
    // Check count
    expect(screen.getByText("Liczba transakcji wymagających sprawdzenia: 1")).toBeTruthy();
    
    // Check navigation button exists
    const navBtn = screen.getByText("Przejdź do pierwszej");
    expect(navBtn).toBeTruthy();
    
    // Test behavior
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    fireEvent.click(navBtn);
    
    const firstRow = document.getElementById(`review-row-tx-missing-date`);
    expect(firstRow).toBeTruthy();
    expect(firstRow?.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(firstRow);
  });
});

describe("Sprint 86: Linked History Review Progression", () => {
  afterEach(() => {
    cleanup();
  });

  const txBad1: Transaction = {
    id: "tx-bad-1",
    name: "", // missing name
    amount: 1000,
    category: "Kredyty",
    type: "expense",
    account: "Główne",
    isoDate: "2026-06-15",
    debtId: "debt-test-1",
    currency: "PLN"
  };

  const txBad2: Transaction = {
    id: "tx-bad-2",
    name: "Rata majowa",
    amount: 1000,
    category: "Kredyty",
    type: "expense",
    account: "Główne",
    isoDate: "invalid-date", // invalid date
    debtId: "debt-test-1",
    currency: "PLN"
  };

  const txBad3: Transaction = {
    id: "tx-bad-3",
    name: "Rata kwietniowa",
    amount: 1000,
    category: "Kredyty",
    type: "expense",
    account: "Główne",
    isoDate: "2026-04-15",
    debtId: "debt-test-1",
    currency: undefined as any // missing currency
  };

  it("progresses through multiple affected rows with correct position indicator and boundary disabled states", () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    const onOpenTxModal = vi.fn();

    render(
      <DebtDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        debt={mockDebt}
        transactions={[txBad1, txBad2, txBad3, tx1]}
        onOpenTxModal={onOpenTxModal}
      />
    );

    // Initial check: 3 transactions with issues
    expect(screen.getByText("Liczba transakcji wymagających sprawdzenia: 3")).toBeTruthy();

    // Before review navigation begins, previous/next controls are not displayed
    expect(screen.queryByRole("button", { name: /Poprzednia transakcja do sprawdzenia/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Następna transakcja do sprawdzenia/i })).toBeNull();
    expect(screen.queryByText(/1 z 3/)).toBeNull();

    // Begin review navigation by clicking "Przejdź do pierwszej"
    const firstNavBtn = screen.getByText("Przejdź do pierwszej");
    fireEvent.click(firstNavBtn);

    // Review navigation has begun: position is 1 z 3
    expect(screen.getByText("1 z 3")).toBeTruthy();
    const row1 = document.getElementById(`review-row-tx-bad-1`);
    expect(document.activeElement).toBe(row1);

    // Boundary: Poprzednia is disabled on first affected row
    const prevBtn = screen.getByRole("button", { name: "Poprzednia transakcja do sprawdzenia" });
    const nextBtn = screen.getByRole("button", { name: "Następna transakcja do sprawdzenia" });
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
    expect((nextBtn as HTMLButtonElement).disabled).toBe(false);

    // Click "Następna" -> position 2 z 3
    fireEvent.click(nextBtn);
    expect(screen.getByText("2 z 3")).toBeTruthy();
    const row2 = document.getElementById(`review-row-tx-bad-2`);
    expect(document.activeElement).toBe(row2);
    expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
    expect((nextBtn as HTMLButtonElement).disabled).toBe(false);

    // Click "Następna" again -> position 3 z 3 (final affected row)
    fireEvent.click(nextBtn);
    expect(screen.getByText("3 z 3")).toBeTruthy();
    const row3 = document.getElementById(`review-row-tx-bad-3`);
    expect(document.activeElement).toBe(row3);

    // Boundary: Następna is disabled on the final affected row
    expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
    expect((nextBtn as HTMLButtonElement).disabled).toBe(true);

    // Click "Poprzednia" -> position 2 z 3
    fireEvent.click(prevBtn);
    expect(screen.getByText("2 z 3")).toBeTruthy();
    expect(document.activeElement).toBe(row2);

    // Click "Przejdź do pierwszej" -> jumps back to row 1 (1 z 3)
    fireEvent.click(firstNavBtn);
    expect(screen.getByText("1 z 3")).toBeTruthy();
    expect(document.activeElement).toBe(row1);
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
    expect((nextBtn as HTMLButtonElement).disabled).toBe(false);

    // Non-destructive: onOpenTxModal was never called
    expect(onOpenTxModal).not.toHaveBeenCalled();
  });

  it("does not render progression previous/next controls when there is only one affected row", () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    render(
      <DebtDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        debt={mockDebt}
        transactions={[txBad1, tx1, tx2]}
      />
    );

    expect(screen.getByText("Liczba transakcji wymagających sprawdzenia: 1")).toBeTruthy();
    const firstNavBtn = screen.getByText("Przejdź do pierwszej");
    expect(firstNavBtn).toBeTruthy();

    fireEvent.click(firstNavBtn);

    // Still no previous/next progression controls or indicator for a single affected row
    expect(screen.queryByRole("button", { name: /Poprzednia transakcja do sprawdzenia/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Następna transakcja do sprawdzenia/i })).toBeNull();
    expect(screen.queryByText(/1 z 1/)).toBeNull();
  });

  it("does not render review controls when there are zero affected rows", () => {
    render(
      <DebtDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        debt={mockDebt}
        transactions={[tx1, tx2]}
      />
    );

    expect(screen.queryByText("Jakość danych historii")).toBeNull();
    expect(screen.queryByText("Przejdź do pierwszej")).toBeNull();
    expect(screen.queryByRole("button", { name: /Poprzednia transakcja do sprawdzenia/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Następna transakcja do sprawdzenia/i })).toBeNull();
  });

  it("maintains newest-first rendered order for review progression regardless of original transaction array order", () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    const txJune: Transaction = {
      id: "tx-order-june",
      name: "",
      amount: 500,
      category: "Kredyty",
      type: "expense",
      account: "Główne",
      isoDate: "2026-06-20",
      debtId: "debt-test-1",
      currency: "PLN"
    };

    const txMay: Transaction = {
      id: "tx-order-may",
      name: "Rata majowa",
      amount: 500,
      category: "Kredyty",
      type: "expense",
      account: "Główne",
      isoDate: "2026-05-20",
      debtId: "debt-test-1",
      currency: undefined as any
    };

    const txApril: Transaction = {
      id: "tx-order-april",
      name: "",
      amount: 500,
      category: "Kredyty",
      type: "expense",
      account: "Główne",
      isoDate: "2026-04-20",
      debtId: "debt-test-1",
      currency: "PLN"
    };

    // Pass in reverse order: April, June, May
    render(
      <DebtDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        debt={mockDebt}
        transactions={[txApril, txJune, txMay]}
      />
    );

    fireEvent.click(screen.getByText("Przejdź do pierwszej"));
    // First in sorted newest-first order must be June 20
    expect(screen.getByText("1 z 3")).toBeTruthy();
    expect(document.activeElement).toBe(document.getElementById("review-row-tx-order-june"));

    const nextBtn = screen.getByRole("button", { name: "Następna transakcja do sprawdzenia" });
    fireEvent.click(nextBtn);
    // Second in sorted order must be May 20
    expect(screen.getByText("2 z 3")).toBeTruthy();
    expect(document.activeElement).toBe(document.getElementById("review-row-tx-order-may"));

    fireEvent.click(nextBtn);
    // Third in sorted order must be April 20
    expect(screen.getByText("3 z 3")).toBeTruthy();
    expect(document.activeElement).toBe(document.getElementById("review-row-tx-order-april"));
  });
});
