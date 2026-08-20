/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AnalysisView } from "./AnalysisView";
import { Profile } from "../types";

describe("AnalysisView (full polish)", () => {
  afterEach(() => {
    cleanup();
  });

  const mockProfile: Profile = {
    id: "test-profile",
    name: "Główne",
    currency: "PLN",
    kind: "personal",
    accounts: [],
    transactions: [
      {
        id: "tx-1",
        name: "Pensja",
        amount: 8000,
        type: "income",
        category: "Wynagrodzenie",
        isoDate: "2026-08-05",
        currency: "PLN",
        account: "Konto",
      },
      {
        id: "tx-2",
        name: "Czynsz",
        amount: 2500,
        type: "expense",
        category: "Dom",
        isoDate: "2026-08-08",
        currency: "PLN",
        account: "Konto",
      },
      {
        id: "tx-3",
        name: "Restauracja",
        amount: 600,
        type: "expense",
        category: "Rozrywka",
        isoDate: "2026-08-12",
        currency: "PLN",
        account: "Konto",
      },
      {
        id: "tx-4",
        name: "Oszczędności",
        amount: 1000,
        type: "expense",
        category: "Oszczędności",
        isoDate: "2026-08-15",
        currency: "PLN",
        account: "Konto",
      },
    ],
    payments: [],
    goals: [],
    budgets: {
      Dom: 3000,
      Rozrywka: 800,
    },
    investments: [],
  };

  const testDate = new Date("2026-08-19T12:00:00");

  it("renders 50/30/20 breakdown section with needs, wants, and savings", () => {
    render(<AnalysisView profile={mockProfile} selectedDate={testDate} />);

    expect(screen.getByText("Reguła 50 / 30 / 20 (Wzorzec Budżetowy)")).toBeTruthy();
    expect(screen.getByText("Potrzeby (Needs)")).toBeTruthy();
    expect(screen.getByText("Zachcianki (Wants)")).toBeTruthy();
    expect(screen.getByText("Oszczędności i Dług (Savings)")).toBeTruthy();

    expect(screen.getByText("Cel: 50%")).toBeTruthy();
    expect(screen.getByText("Cel: 30%")).toBeTruthy();
    expect(screen.getByText("Cel: 20%")).toBeTruthy();
  });

  it("renders monthly operational summary KPIs and advice cards", () => {
    render(<AnalysisView profile={mockProfile} selectedDate={testDate} />);

    expect(screen.getByText("Miesięczny przegląd operacyjny")).toBeTruthy();
    expect(screen.getByText("Przychody")).toBeTruthy();
    expect(screen.getByText("Wydatki")).toBeTruthy();
    expect(screen.getByText("Bilans")).toBeTruthy();
    expect(screen.getByText("Oszczędności")).toBeTruthy();

    expect(screen.getByText("Wnioski i podpowiedzi")).toBeTruthy();
    expect(screen.getByText(/Świetna stopa oszczędności!|Dobry kierunek oszczędzania/)).toBeTruthy();
  });

  it("renders rolling trends and simulator mode toggle", () => {
    render(<AnalysisView profile={mockProfile} selectedDate={testDate} />);

    expect(screen.getByText("Trendy wielomiesięczne")).toBeTruthy();
    expect(screen.getByText("Symulator strategiczny")).toBeTruthy();

    // Toggle simulator mode to debt
    const debtBtn = screen.getByRole("button", { name: /Spłata długu/i });
    fireEvent.click(debtBtn);
    expect(screen.getByText(/Brak aktywnych zobowiązań|Łączne zadłużenie/)).toBeTruthy();
  });

  it("renders category breakdown empty state when no expenses in month", () => {
    const emptyProfile = {
      ...mockProfile,
      transactions: [],
    };

    render(<AnalysisView profile={emptyProfile} selectedDate={testDate} />);

    expect(screen.getByText("Brak widocznych kategorii")).toBeTruthy();
    expect(screen.getByText("Dostosuj filtr widoczności lub dodaj wydatki.")).toBeTruthy();
  });

  it("renders Cashflow Forecast section with horizon tabs and KPI metrics", () => {
    render(<AnalysisView profile={mockProfile} selectedDate={testDate} />);

    expect(screen.getByText("Prognoza Cashflow & Płynności")).toBeTruthy();
    expect(screen.getByText("Najniższy punkt (Cash Dip)")).toBeTruthy();
    expect(screen.getByText(/Dni ryzyka płynności|Stabilność płynności/)).toBeTruthy();
    expect(screen.getByText("Trajektoria salda gotówkowego")).toBeTruthy();

    const horizon60Btn = screen.getByRole("tab", { name: "60 dni" });
    fireEvent.click(horizon60Btn);
    expect(horizon60Btn.getAttribute("aria-selected")).toBe("true");

    const horizon90Btn = screen.getByRole("tab", { name: "90 dni" });
    fireEvent.click(horizon90Btn);
    expect(horizon90Btn.getAttribute("aria-selected")).toBe("true");
  });

  it("renders Financial Health Score section with 4 pillars, grade badge, and alerts", () => {
    render(<AnalysisView profile={mockProfile} selectedDate={testDate} />);

    expect(screen.getByText("Kondycja finansowa")).toBeTruthy();
    expect(screen.getByText("Wynik")).toBeTruthy();
    expect(screen.getByText("na 100 pkt")).toBeTruthy();
    expect(screen.getByText("Budżet")).toBeTruthy();
    expect(screen.getByText("Płatności")).toBeTruthy();
    expect(screen.getByText("Płynność")).toBeTruthy();
    expect(screen.getByText("Koszty stałe")).toBeTruthy();

    expect(screen.getByText(/Alerty i sygnały decyzyjne/)).toBeTruthy();
  });

  it("renders low-data advisory when profile has no financial records", () => {
    const emptyProfile: Profile = {
      ...mockProfile,
      transactions: [],
      payments: [],
      budgets: {},
    };

    render(<AnalysisView profile={emptyProfile} selectedDate={testDate} />);

    expect(screen.getByText("Kondycja finansowa")).toBeTruthy();
    expect(screen.getByText(/Ocena wstępna\./)).toBeTruthy();
    expect(screen.getByText(/Dodaj płatności, budżety lub historię wydatków/)).toBeTruthy();
  });

  it("renders Debt Payoff Simulator with KPIs, comparison cards, and snowball queue", () => {
    const profileWithDebts: Profile = {
      ...mockProfile,
      payments: [
        { id: "pay-1", name: "Rachunek za telefon", amount: 120, dueDate: "2026-08-25", status: "Do opłacenia", currency: "PLN" },
        { id: "pay-2", name: "Czynsz zaległy", amount: 2400, dueDate: "2026-08-30", status: "Do opłacenia", currency: "PLN" }
      ],
      accounts: [
        { id: "acc-1", name: "Karta Kredytowa", bankName: "Santander", hasCreditLimit: true, creditLimit: 2480 }
      ]
    };

    render(<AnalysisView profile={profileWithDebts} selectedDate={testDate} />);

    // Switch to Debt mode
    const debtBtn = screen.getByRole("button", { name: /Spłata długu/i });
    fireEvent.click(debtBtn);

    expect(screen.getByText("Plan spłaty zobowiązań")).toBeTruthy();
    expect(screen.getByText(/Kula śnieżna \(Snowball\)/)).toBeTruthy();
    expect(screen.getByText("Łączne zobowiązania")).toBeTruthy();
    expect(screen.getByText("Liczba pozycji")).toBeTruthy();
    expect(screen.getByText("Szacowany czas")).toBeTruthy();
    expect(screen.getByText("Oszczędność czasu")).toBeTruthy();

    // Check Snowball Queue items rendered
    expect(screen.getAllByText("Rachunek za telefon").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Czynsz zaległy").length).toBeGreaterThan(0);
    expect(screen.getByText("Karta Kredytowa (Limit kredytowy)")).toBeTruthy();

    // Check Extra Payment Buttons and interaction
    const plus500Btn = screen.getByRole("button", { name: "+500" });
    fireEvent.click(plus500Btn);
    expect(plus500Btn.className).toContain("bg-brand");
  });
});


