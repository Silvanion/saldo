/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NetWorthView } from "./NetWorthView";
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

describe("NetWorthView", () => {
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

  it("renderuje się poprawnie z wszystkimi sekcjami", () => {
    render(<NetWorthView profile={mockProfile} />);
    expect(screen.getByText("Bilans Majątku Netto")).toBeTruthy();
    expect(screen.getByText("Struktura Aktywów")).toBeTruthy();
    expect(screen.getByText("Struktura Zobowiązań")).toBeTruthy();
    expect(screen.getByTestId("area-chart")).toBeTruthy();
  });

  it("pozwala zmienić okres na osi czasu (3M, 6M, 12M)", () => {
    render(<NetWorthView profile={mockProfile} />);
    const btn12m = screen.getByRole("button", { name: "12M" });
    fireEvent.click(btn12m);
    expect(btn12m.className).toContain("bg-brand");
  });

  it("działa symulator spłaty długu", () => {
    render(<NetWorthView profile={mockProfile} />);
    const select = screen.getByLabelText(/Wybierz dług do symulacji/i);
    expect(select).toBeTruthy();

    fireEvent.change(select, { target: { value: "d1" } });
    expect(screen.getByText(/Po spłacie/i)).toBeTruthy();
    expect(screen.getByText(/Wskaźnik długu spadnie/i)).toBeTruthy();
  });

  it("przekierowuje do widoku długów z karty zobowiązań", () => {
    const onChangeView = vi.fn();
    render(<NetWorthView profile={mockProfile} onChangeView={onChangeView} />);
    fireEvent.click(screen.getByText("Zarządzaj długami i strategią spłat"));
    expect(onChangeView).toHaveBeenCalledWith("debts");
  });

  it("pusty profil pokazuje stan pusty zamiast wykresu zer i kieruje do celów/kredytów", () => {
    const emptyProfile = {
      id: "p0", name: "Pusty", kind: "personal", currency: "PLN",
      transactions: [], payments: [], goals: [], investments: [], budgets: {}, debts: [],
    } as unknown as Profile;
    const onChangeView = vi.fn();
    render(<NetWorthView profile={emptyProfile} onChangeView={onChangeView} />);

    expect(screen.getByText("Nie ma jeszcze czego wyliczyć")).toBeTruthy();
    expect(screen.queryByTestId("area-chart")).toBeNull();
    fireEvent.click(screen.getByText("Dodaj kredyt"));
    expect(onChangeView).toHaveBeenCalledWith("debts");
  });
});
