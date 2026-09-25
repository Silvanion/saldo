/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FinancialHealthBridgeCard } from "./FinancialHealthBridgeCard";
import { Profile } from "../../types";
import { getLocalDateIso } from "../../utils";

describe("FinancialHealthBridgeCard", () => {
  afterEach(() => cleanup());

  const emptyProfile: Profile = {
    id: "p1",
    name: "Test",
    kind: "personal",
    currency: "PLN",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {}
  };

  it("pokazuje komunikat o braku danych dla profilu bez transakcji (INSUFFICIENT_DATA)", () => {
    render(<FinancialHealthBridgeCard profile={emptyProfile} onChangeView={vi.fn()} />);
    expect(screen.getByText(/Brak wystarczających danych/i)).toBeTruthy();
    expect(screen.getByText(/Dodaj pierwsze transakcje/i)).toBeTruthy();
    expect(screen.queryByText(/83\/100/)).toBeNull();
    expect(screen.queryByText(/Niski bufor gotówkowy/i)).toBeNull();
  });

  it("pokazuje najwyżej priorytetowy alert (nawet pozytywny), gdy dane są wystarczające", () => {
    const healthyProfile: Profile = {
      ...emptyProfile,
      transactions: [
        { id: "t1", name: "Pensja", category: "Wynagrodzenie", account: "A", amount: 8000, type: "income", isoDate: getLocalDateIso(), currency: "PLN" }
      ],
      accounts: [{ id: "a1", name: "Konto", balance: 15000, type: "checking" } as any]
    };
    render(<FinancialHealthBridgeCard profile={healthyProfile} onChangeView={vi.fn()} />);
    // Realny wynik getFinancialHealthSummary dla tego profilu: jeden alert "positive" (płynność).
    expect(screen.getByText(/Stabilność gotówkowa/i)).toBeTruthy();
  });

  it("gdy nie ma żadnych alertów, pokazuje neutralny komunikat zamiast pustego miejsca", async () => {
    vi.doMock("../../services/financialHealth", () => ({
      getFinancialHealthSummary: () => ({
        score: 80,
        status: "ACTIVE",
        grade: "good",
        gradeLabel: "Dobra",
        pillars: {} as any,
        alerts: [],
        positiveDrivers: [],
        negativeDrivers: [],
        isLowData: false
      })
    }));
    vi.resetModules();
    const { FinancialHealthBridgeCard: Card } = await import("./FinancialHealthBridgeCard");
    render(<Card profile={emptyProfile} onChangeView={vi.fn()} />);
    expect(screen.getByText(/Brak krytycznych sygnałów/i)).toBeTruthy();
    vi.doUnmock("../../services/financialHealth");
    vi.resetModules();
  });

  it("pokazuje najważniejszy alert (krytyczny) po przekroczeniu budżetu", () => {
    const today = getLocalDateIso();
    const overBudgetProfile: Profile = {
      ...emptyProfile,
      budgets: { Żywność: 100 },
      transactions: [
        { id: "t1", name: "Zakupy", category: "Żywność", account: "A", amount: 150, type: "expense", isoDate: today, currency: "PLN" }
      ]
    };
    render(<FinancialHealthBridgeCard profile={overBudgetProfile} onChangeView={vi.fn()} />);
    expect(screen.getByText(/Przekroczony budżet: Żywność/i)).toBeTruthy();
  });

  it("przycisk 'Szczegóły' nawiguje do widoku analizy", () => {
    const onChangeView = vi.fn();
    render(<FinancialHealthBridgeCard profile={emptyProfile} onChangeView={onChangeView} />);
    fireEvent.click(screen.getByRole("button", { name: /Przejdź do pełnej analizy kondycji finansowej/i }));
    expect(onChangeView).toHaveBeenCalledWith("analysis");
  });

  it("pokazuje wynik liczbowy w formacie X/100 dla profilu z transakcjami", () => {
    const profileWithTx: Profile = {
      ...emptyProfile,
      transactions: [
        { id: "t1", name: "Pensja", amount: 5000, type: "income", category: "Wynagrodzenie", isoDate: getLocalDateIso(), account: "Konto", currency: "PLN" }
      ]
    };
    render(<FinancialHealthBridgeCard profile={profileWithTx} onChangeView={vi.fn()} />);
    expect(screen.getByText(/\/100/)).toBeTruthy();
  });
});
