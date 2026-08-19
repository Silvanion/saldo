/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ActivityWidget } from "./ActivityWidget";
import { Transaction } from "../../types";

describe("ActivityWidget", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    currency: "PLN",
    recentTransactions: [] as Transaction[],
    onChangeView: vi.fn(),
    onOpenTxModal: vi.fn(),
  };

  it("renders empty state correctly when there are no recent transactions", () => {
    render(<ActivityWidget {...defaultProps} />);

    expect(screen.getByText("Brak zarejestrowanych transakcji")).toBeTruthy();
    expect(screen.getByText("Dodaj pierwszy wydatek lub przychód.")).toBeTruthy();
  });

  it("renders transactions list with category, name, and formatted amount", () => {
    const transactions: Transaction[] = [
      { id: "tx-1", name: "Biedronka", amount: 124.5, type: "expense", category: "Żywność", isoDate: "2026-08-15", currency: "PLN", paidBy: "me", account: "Główne" },
      { id: "tx-2", name: "Wynagrodzenie", amount: 6500, type: "income", category: "Wynagrodzenie", isoDate: "2026-08-10", currency: "PLN", account: "Główne" },
    ];

    render(<ActivityWidget {...defaultProps} recentTransactions={transactions} />);

    expect(screen.getByText("Biedronka")).toBeTruthy();
    expect(screen.getByText("Ja")).toBeTruthy();
    expect(screen.getByText("Wynagrodzenie")).toBeTruthy();
  });

  it("triggers callbacks on action buttons click", () => {
    const onChangeView = vi.fn();
    const onOpenTxModal = vi.fn();

    render(<ActivityWidget {...defaultProps} onChangeView={onChangeView} onOpenTxModal={onOpenTxModal} />);

    const bookBtn = screen.getByRole("button", { name: /Księga/i });
    fireEvent.click(bookBtn);
    expect(onChangeView).toHaveBeenCalledWith("transactions");

    const quickAddBtn = screen.getByRole("button", { name: "Szybki zapis" });
    fireEvent.click(quickAddBtn);
    expect(onOpenTxModal).toHaveBeenCalled();
  });
});
