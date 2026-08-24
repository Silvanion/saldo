/* @vitest-environment jsdom */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
    
    // Check specific conditions
    expect(screen.getAllByText("Brak opisu transakcji").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brak daty transakcji").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nieprawidłowa data transakcji").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Użyto waluty zobowiązania jako wartości domyślnej").length).toBeGreaterThan(0);
  });
});
