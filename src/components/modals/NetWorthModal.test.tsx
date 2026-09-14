/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NetWorthModal } from "./NetWorthModal";
import { Profile } from "../../types";

// Mock Recharts to avoid jsdom SVG sizing issues
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <svg data-testid="area-chart">{children}</svg>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

describe("NetWorthModal", () => {
  afterEach(() => cleanup());

  const mockProfile: Profile = {
    id: "p1",
    name: "Jan Kowalski",
    kind: "personal",
    currency: "PLN",
    transactions: [
      {
        id: "t1",
        name: "Pensja",
        category: "Praca",
        account: "Konto",
        amount: 20000,
        type: "income",
        isoDate: "2026-03-01",
        currency: "PLN",
      },
    ],
    payments: [
      {
        id: "pm1",
        name: "Rachunek za prąd",
        amount: 300,
        dueDate: "2026-03-10",
        status: "Do opłacenia",
        currency: "PLN",
      },
    ],
    goals: [{ id: "g1", name: "Poduszka", target: 50000, saved: 40000 }],
    investments: [{ id: "i1", name: "Akcje", amount: 15000, isoDate: "2026-01-01" }],
    budgets: {},
    debts: [
      {
        id: "d1",
        name: "Kredyt hipoteczny",
        institution: "Bank",
        type: "mortgage",
        currency: "PLN",
        balance: 100000,
        monthlyPayment: 1500,
        interestRate: 6,
        propertyValue: 300000,
        status: "active",
        createdAt: "2024-01-01",
      },
    ],
  };

  it("nie renderuje się gdy isOpen jest false", () => {
    render(<NetWorthModal isOpen={false} onClose={vi.fn()} profile={mockProfile} />);
    expect(screen.queryByText("Bilans Majątku Netto")).toBeNull();
  });

  it("renderuje się poprawnie z wszystkimi sekcjami gdy isOpen jest true", () => {
    render(<NetWorthModal isOpen={true} onClose={vi.fn()} profile={mockProfile} />);
    expect(screen.getByText("Bilans Majątku Netto")).toBeTruthy();
    expect(screen.getByText("Struktura Aktywów")).toBeTruthy();
    expect(screen.getByText("Struktura Zobowiązań")).toBeTruthy();
    expect(screen.getByTestId("area-chart")).toBeTruthy();
  });

  it("pozwala zmienić okres na osi czasu (3M, 6M, 12M)", () => {
    render(<NetWorthModal isOpen={true} onClose={vi.fn()} profile={mockProfile} />);
    const btn12m = screen.getByRole("button", { name: "12M" });
    fireEvent.click(btn12m);
    expect(btn12m.className).toContain("bg-brand");
  });

  it("działa symulator spłaty długu", () => {
    render(<NetWorthModal isOpen={true} onClose={vi.fn()} profile={mockProfile} />);
    const select = screen.getByLabelText(/Wybierz dług do symulacji/i);
    expect(select).toBeTruthy();

    fireEvent.change(select, { target: { value: "d1" } });
    expect(screen.getByText(/Po spłacie/i)).toBeTruthy();
    expect(screen.getByText(/Wskaźnik długu spadnie/i)).toBeTruthy();
  });

  it("wywołuje onClose po kliknięciu przycisku zamknięcia", () => {
    const handleClose = vi.fn();
    render(<NetWorthModal isOpen={true} onClose={handleClose} profile={mockProfile} />);
    const closeBtn = screen.getByRole("button", { name: /Zamknij modal majątku netto/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
