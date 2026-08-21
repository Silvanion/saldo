/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { DebtsView } from "./DebtsView";
import { DebtItem, Profile } from "../../types";

const mockDebts: DebtItem[] = [
  {
    id: "debt-1",
    name: "Kredyt hipoteczny",
    institution: "PKO BP",
    type: "mortgage",
    currency: "PLN",
    balance: 350000,
    originalAmount: 400000,
    monthlyPayment: 2600,
    interestRate: 6.85,
    rateType: "fixed",
    fixedRateEndDate: "03.2028",
    propertyValue: 500000,
    status: "active",
    createdAt: "2026-01-01"
  },
  {
    id: "debt-2",
    name: "Karta Visa",
    institution: "mBank",
    type: "credit_card",
    currency: "PLN",
    balance: 8000,
    creditLimit: 10000,
    monthlyPayment: 400,
    interestRate: 18.5,
    status: "active",
    createdAt: "2026-01-01"
  },
  {
    id: "debt-3",
    name: "Stary kredyt gotówkowy",
    institution: "Santander",
    type: "cash_loan",
    currency: "PLN",
    balance: 0,
    monthlyPayment: 0,
    interestRate: 9.5,
    status: "closed",
    createdAt: "2025-01-01"
  }
];

const mockProfile: Profile = {
  id: "prof-1",
  name: "Główny",
  kind: "personal",
  currency: "PLN",
  transactions: [],
  payments: [],
  goals: [],
  investments: [],
  budgets: {},
  debts: mockDebts
};

describe("DebtsView (Sprint 1 MVP)", () => {
  afterEach(cleanup);

  it("renders empty state when no debts exist", () => {
    const emptyProfile: Profile = { ...mockProfile, debts: [] };
    const onAddDebt = vi.fn();

    render(<DebtsView profile={emptyProfile} onAddDebt={onAddDebt} />);

    expect(screen.getByText("Nie dodałeś jeszcze żadnych zobowiązań")).toBeTruthy();
    expect(screen.getByText("Dodaj pierwsze zobowiązanie")).toBeTruthy();

    // KPIs show 0
    expect(screen.getByText("Łączne saldo")).toBeTruthy();
    expect(screen.getByText("0 aktywne długi")).toBeTruthy();
  });

  it("opens add debt modal and submits new debt", () => {
    const emptyProfile: Profile = { ...mockProfile, debts: [] };
    const onAddDebt = vi.fn();

    const { container } = render(<DebtsView profile={emptyProfile} onAddDebt={onAddDebt} />);

    const addBtn = screen.getByRole("button", { name: /Dodaj pierwsze zobowiązanie/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Dodaj nowe zobowiązanie")).toBeTruthy();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText("Hipoteka mieszkanie"), {
      target: { value: "Nowy kredyt gotówkowy" }
    });
    fireEvent.change(screen.getByPlaceholderText("350000"), {
      target: { value: "15000" }
    });
    fireEvent.change(screen.getByPlaceholderText("2500"), {
      target: { value: "650" }
    });
    fireEvent.change(screen.getByPlaceholderText("6.85"), {
      target: { value: "11.5" }
    });

    const submitBtn = container.ownerDocument.querySelector('button[type="submit"]') as HTMLButtonElement;
    fireEvent.click(submitBtn);

    expect(onAddDebt).toHaveBeenCalledTimes(1);
    expect(onAddDebt).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Nowy kredyt gotówkowy",
        balance: 15000,
        monthlyPayment: 650,
        interestRate: 11.5
      })
    );
  });

  it("renders real debts and computed portfolio KPIs", () => {
    render(<DebtsView profile={mockProfile} />);

    expect(screen.getByText("Kredyty i Hipoteka")).toBeTruthy();

    // Real computed total balance: 350000 + 8000 = 358000
    expect(screen.getByText(/358\s*000/)).toBeTruthy();
    // Monthly payment: 2600 + 400 = 3000
    expect(screen.getByText(/3\s*000/)).toBeTruthy();
    // Highest APR debt
    expect(screen.getAllByText("Karta Visa").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("APR 18.5%")).toBeTruthy();

    // Debts cards
    expect(screen.getAllByText("Kredyt hipoteczny").length).toBeGreaterThanOrEqual(1);
  });

  it("filters by category chip and closed debts", () => {
    const { container } = render(<DebtsView profile={mockProfile} />);

    // Filter by Hipoteki
    const mortgageChip = screen.getByRole("button", { name: "Hipoteki" });
    fireEvent.click(mortgageChip);

    const cardsList = container.querySelector("#debt-cards-list") as HTMLElement;
    expect(within(cardsList).getAllByText("Kredyt hipoteczny").length).toBeGreaterThanOrEqual(1);
    expect(within(cardsList).queryByText("Karta Visa")).toBeNull();

    // Filter by Zamknięte
    const closedChip = screen.getByRole("button", { name: /Zamknięte \(1\)/i });
    fireEvent.click(closedChip);

    expect(within(cardsList).getByText("Stary kredyt gotówkowy")).toBeTruthy();
    expect(within(cardsList).queryByText("Kredyt hipoteczny")).toBeNull();
  });

  it("triggers edit and delete actions", () => {
    const onUpdateDebt = vi.fn();
    const onDeleteDebt = vi.fn();

    render(
      <DebtsView
        profile={mockProfile}
        onUpdateDebt={onUpdateDebt}
        onDeleteDebt={onDeleteDebt}
      />
    );

    // Edit button on first card
    const editBtns = screen.getAllByTitle("Edytuj zobowiązanie");
    fireEvent.click(editBtns[0]);
    expect(screen.getByText("Edytuj zobowiązanie")).toBeTruthy();

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /Anuluj/i }));

    // Delete button
    const deleteBtns = screen.getAllByTitle("Usuń zobowiązanie");
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByText("Czy na pewno chcesz usunąć to zobowiązanie?")).toBeTruthy();

    // Confirm delete
    const confirmDeleteBtn = screen.getByRole("button", { name: "Usuń" });
    fireEvent.click(confirmDeleteBtn);

    expect(onDeleteDebt).toHaveBeenCalledTimes(1);
  });

  it("opens debt details and overpayment modals", () => {
    render(<DebtsView profile={mockProfile} />);

    // Click Szczegóły on first card
    const detailBtns = screen.getAllByText("Szczegóły");
    fireEvent.click(detailBtns[0]);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Warunki i parametry")).toBeTruthy();

    // Close details
    const closeBtn = screen.getByRole("button", { name: "Zamknij" });
    fireEvent.click(closeBtn);

    // Click Symulator nadpłaty
    const overpaymentBtn = screen.getByRole("button", { name: "Symulator nadpłaty" });
    fireEvent.click(overpaymentBtn);

    expect(screen.getByText("Symulator nadpłaty zobowiązania")).toBeTruthy();
    expect(screen.getByText("Rzeczywiste porównanie scenariuszy")).toBeTruthy();
  });

  it("renders deeper debt analytics signals and mix breakdown", () => {
    render(<DebtsView profile={mockProfile} />);

    expect(screen.getByText("Struktura portfela i sygnały decyzyjne")).toBeTruthy();
    expect(screen.getByText("Rozkład kapitału i miesięcznego obciążenia wg typu")).toBeTruthy();

    // Toggle collapse/expand
    const toggleBtn = screen.getByRole("button", { name: "Zwiń" });
    fireEvent.click(toggleBtn);
    expect(screen.queryByText("Rozkład kapitału i miesięcznego obciążenia wg typu")).toBeNull();
  });

  it("opens multi-offer refinance comparison modal and simulates offers", () => {
    render(<DebtsView profile={mockProfile} />);

    // Click Refinansowanie on mortgage card
    const refiBtn = screen.getByRole("button", { name: "Refinansowanie" });
    fireEvent.click(refiBtn);

    expect(screen.getByText("Wieloofertowy kalkulator refinansowania")).toBeTruthy();
    expect(screen.getByText("Zestawienie porównawcze ofert vs Obecny kredyt")).toBeTruthy();

    // Check adding a third offer
    const addOfferBtn = screen.getByRole("button", { name: /Dodaj ofertę/i });
    fireEvent.click(addOfferBtn);
    expect(screen.getAllByText(/Oferta C/i).length).toBeGreaterThanOrEqual(1);

    // Check presets
    const lowerRateBtn = screen.getByRole("button", { name: "-1.5% stopa" });
    fireEvent.click(lowerRateBtn);

    // Verify matrix rows
    expect(screen.getByText("Łączny zysk netto po kosztach")).toBeTruthy();
    expect(screen.getByText("Czas zwrotu (Break-even)")).toBeTruthy();
  });

  it("switches to Payoff Strategy simulator tab and tests Avalanche and Snowball strategies", () => {
    render(<DebtsView profile={mockProfile} />);

    // Click 'Porównaj strategie'
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    expect(screen.getByText("Symulator strategii spłaty całego portfela")).toBeTruthy();
    expect(screen.getByText("Metoda Lawiny (Avalanche)")).toBeTruthy();
    expect(screen.getByText("Metoda Kuli Śnieżnej (Snowball)")).toBeTruthy();
    expect(screen.getByText("Status Quo (Tylko raty)")).toBeTruthy();

    // Click preset +1 000 zł
    const preset1000Btn = screen.getByRole("button", { name: /\+1\s*000/i });
    fireEvent.click(preset1000Btn);

    // Verify roadmap is rendered
    expect(screen.getByText(/Kolejność likwidacji kredytów/i)).toBeTruthy();

    // Click Snowball strategy card
    const snowballCard = screen.getByText("Metoda Kuli Śnieżnej (Snowball)");
    fireEvent.click(snowballCard);

    expect(screen.getByText(/Plan i kolejność spłaty: Metoda Kuli Śnieżnej/i)).toBeTruthy();
  });

  it("renders Custom strategy card with refined copy and interactive reorder panel", () => {
    render(<DebtsView profile={mockProfile} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // 1. Verify Custom card and copy
    expect(screen.getByText("Własna kolejność")).toBeTruthy();
    expect(
      screen.getByText(/Elastyczna — samodzielnie ustalasz priorytety spłaty/i)
    ).toBeTruthy();

    // 2. Click Custom strategy card
    const customCard = screen.getByText("Własna kolejność");
    fireEvent.click(customCard);

    // 3. Verify Reorder panel header & active goals counter
    expect(screen.getByText("Ustal kolejność spłaty")).toBeTruthy();
    expect(screen.getByText(/Liczba aktywnych celów: 2/i)).toBeTruthy();

    // 4. Verify Priority Leader #1 badge and explainer text
    expect(screen.getByText("Cel priorytetowy #1")).toBeTruthy();
    expect(
      screen.getByText(/To zobowiązanie otrzymuje całą nadwyżkę nadpłaty do czasu pełnej spłaty/i)
    ).toBeTruthy();

    // 5. Verify action explainer box
    expect(screen.getByText(/Zasada działania:/i)).toBeTruthy();

    // 6. Verify accessible aria-labels and disabled states
    const moveUpFirst = screen.getByRole("button", {
      name: /Przenieś zobowiązanie Kredyt hipoteczny wyżej \(obecnie pozycja 1 z 2\)/i
    });
    const moveDownFirst = screen.getByRole("button", {
      name: /Przenieś zobowiązanie Kredyt hipoteczny niżej \(obecnie pozycja 1 z 2\)/i
    });
    const moveUpLast = screen.getByRole("button", {
      name: /Przenieś zobowiązanie Karta Visa wyżej \(obecnie pozycja 2 z 2\)/i
    });
    const moveDownLast = screen.getByRole("button", {
      name: /Przenieś zobowiązanie Karta Visa niżej \(obecnie pozycja 2 z 2\)/i
    });

    expect((moveUpFirst as HTMLButtonElement).disabled).toBe(true);
    expect((moveDownFirst as HTMLButtonElement).disabled).toBe(false);
    expect((moveUpLast as HTMLButtonElement).disabled).toBe(false);
    expect((moveDownLast as HTMLButtonElement).disabled).toBe(true);

    // 7. Click Move Down on the first debt to change priority leader
    fireEvent.click(moveDownFirst);

    // Now Karta Visa is position 1
    const newMoveDownFirst = screen.getByRole("button", {
      name: /Przenieś zobowiązanie Karta Visa niżej \(obecnie pozycja 1 z 2\)/i
    });
    expect((newMoveDownFirst as HTMLButtonElement).disabled).toBe(false);

    // Verify roadmap and plan reflect Custom strategy
    expect(screen.getByText(/Plan i kolejność spłaty: Własna kolejność/i)).toBeTruthy();

    // 8. Verify switching to Avalanche works without regressions
    const avalancheCard = screen.getByText("Metoda Lawiny (Avalanche)");
    fireEvent.click(avalancheCard);
    expect(screen.getByText(/Plan i kolejność spłaty: Metoda Lawiny/i)).toBeTruthy();
  });

  it("handles single active debt safely with disabled reorder buttons", () => {
    const singleDebtProfile = {
      ...mockProfile,
      debts: [mockProfile.debts[0]]
    };

    render(<DebtsView profile={singleDebtProfile} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // Click Custom strategy card
    const customCard = screen.getByText("Własna kolejność");
    fireEvent.click(customCard);

    expect(screen.getByText(/Liczba aktywnych celów: 1/i)).toBeTruthy();
    expect(screen.getByText("Cel priorytetowy #1")).toBeTruthy();

    const moveUp = screen.getByRole("button", {
      name: /Przenieś zobowiązanie Kredyt hipoteczny wyżej \(obecnie pozycja 1 z 1\)/i
    });
    const moveDown = screen.getByRole("button", {
      name: /Przenieś zobowiązanie Kredyt hipoteczny niżej \(obecnie pozycja 1 z 1\)/i
    });

    expect((moveUp as HTMLButtonElement).disabled).toBe(true);
    expect((moveDown as HTMLButtonElement).disabled).toBe(true);
  });
});
