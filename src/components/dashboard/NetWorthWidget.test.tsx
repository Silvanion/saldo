/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NetWorthWidget } from "./NetWorthWidget";
import { Profile } from "../../types";

describe("NetWorthWidget", () => {
  afterEach(() => cleanup());

  const baseProfile: Profile = {
    id: "p1",
    name: "Jan",
    kind: "personal",
    currency: "PLN",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    debts: [],
  };

  it("renderuje widget dla pustego profilu z wartością 0,00 zł", () => {
    render(<NetWorthWidget profile={baseProfile} />);
    expect(screen.getByTestId("net-worth-widget")).toBeTruthy();
    expect(screen.getByText("Majątek Netto")).toBeTruthy();
    expect(screen.getByTestId("net-worth-value").textContent).toContain("0,00");
  });

  it("poprawnie wyświetla wyliczoną wartość majątku netto i wskaźniki", () => {
    const richProfile: Profile = {
      ...baseProfile,
      transactions: [
        {
          id: "t1",
          name: "Przychód",
          category: "Praca",
          account: "Konto",
          amount: 50000,
          type: "income",
          isoDate: "2026-03-01",
          currency: "PLN",
        },
      ],
      goals: [{ id: "g1", name: "Oszczędności", target: 30000, saved: 25000 }],
      debts: [
        {
          id: "d1",
          name: "Kredyt gotówkowy",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          balance: 15000,
          monthlyPayment: 500,
          interestRate: 7,
          status: "active",
          createdAt: "2025-01-01",
        },
      ],
    };

    render(<NetWorthWidget profile={richProfile} />);
    // Aktywa: 50000 + 25000 = 75000
    // Pasywa: 15000
    // Majątek netto: 60000
    const valueEl = screen.getByTestId("net-worth-value");
    expect(valueEl.textContent).toContain("60");
    expect(screen.getByText(/Zadłużenie \/ Aktywa/i)).toBeTruthy();
    expect(screen.getByText("20.0%")).toBeTruthy(); // 15000 / 75000 * 100%
  });

  it("wywołuje onOpenNetWorthModal po kliknięciu w przycisk Szczegóły", () => {
    const handleOpen = vi.fn();
    render(<NetWorthWidget profile={baseProfile} onOpenNetWorthModal={handleOpen} />);

    const btn = screen.getByRole("button", { name: /Otwórz szczegóły majątku netto/i });
    fireEvent.click(btn);
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });
});
