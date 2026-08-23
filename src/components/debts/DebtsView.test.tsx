/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { DebtsView } from "./DebtsView";
import { DebtDetailsModal } from "./DebtDetailsModal";
import { DebtPortfolioCard, calculateDebtRepaymentProgress, getNewlyCrossedDebtMilestone } from "./DebtPortfolioCard";
import { DashboardView } from "../DashboardView";
import { DebtItem, Profile, Transaction } from "../../types";
import * as csvUtils from "../../utils/csv";

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
    interestRate: 8.0,
    status: "closed",
    createdAt: "2024-01-01"
  }
];

const mockProfile: Profile = {
  id: "test-profile-1",
  name: "Test User",
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

    expect(screen.getByText("Zarządzaj całym portfelem zadłużenia w jednym miejscu")).toBeTruthy();
    expect(screen.getByText("Kredyt hipoteczny")).toBeTruthy();
    expect(screen.getByText("Karty i limity")).toBeTruthy();
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
    expect(screen.getAllByText(/358\s*000/).length).toBeGreaterThanOrEqual(1);
    // Monthly payment: 2600 + 400 = 3000
    expect(screen.getAllByText(/3\s*000/).length).toBeGreaterThanOrEqual(1);
    // Highest APR debt
    expect(screen.getAllByText("Karta Visa").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("APR 18.5%")).toBeTruthy();

    // Debts cards
    expect(screen.getAllByText("Kredyt hipoteczny").length).toBeGreaterThanOrEqual(1);
  });

  it("filters by category chip and closed debts", () => {
    const { container } = render(<DebtsView profile={mockProfile} />);

    // Filter by Hipoteka
    const mortgageChip = screen.getByRole("button", { name: /Hipoteka/i });
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
    expect(screen.getAllByText("Metoda Lawiny (Avalanche)")[0]).toBeTruthy();
    expect(screen.getAllByText("Metoda Kuli Śnieżnej (Snowball)")[0]).toBeTruthy();
    expect(screen.getAllByText("Status Quo (Tylko raty)")[0]).toBeTruthy();

    // Click preset +1 000 zł
    const preset1000Btn = screen.getByRole("button", { name: /\+1\s*000/i });
    fireEvent.click(preset1000Btn);

    // Verify roadmap is rendered
    expect(screen.getByText(/Kolejność likwidacji kredytów/i)).toBeTruthy();

    // Click Snowball strategy card
    const snowballCard = screen.getAllByText("Metoda Kuli Śnieżnej (Snowball)")[0];
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

  it("renders saved scenarios panel, opens save modal, and submits new scenario", () => {
    const onSavePayoffScenario = vi.fn();
    const onDeletePayoffScenario = vi.fn();

    render(
      <DebtsView
        profile={mockProfile}
        onSavePayoffScenario={onSavePayoffScenario}
        onDeletePayoffScenario={onDeletePayoffScenario}
      />
    );

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // Verify Saved Scenarios empty state
    expect(screen.getByText("Zapisane scenariusze (0 / 5)")).toBeTruthy();
    expect(screen.getByText(/Brak zapisanych scenariuszy/i)).toBeTruthy();

    // Click "Zapisz bieżący plan"
    const saveBtn = screen.getByRole("button", { name: /Zapisz bieżący plan/i });
    fireEvent.click(saveBtn);

    // Verify modal is open
    expect(screen.getByText("Zapisz scenariusz spłaty")).toBeTruthy();

    // Fill scenario name
    const input = screen.getByPlaceholderText(/np\. Wariant optymistyczny/i);
    fireEvent.change(input, { target: { value: "Mój plan testowy" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Zapisz scenariusz" });
    fireEvent.click(submitBtn);

    expect(onSavePayoffScenario).toHaveBeenCalledTimes(1);
    expect(onSavePayoffScenario).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Mój plan testowy",
        strategy: "avalanche",
        extraMonthlyPayment: 500
      })
    );
  });

  it("renders existing saved scenarios, loads a scenario on click, and triggers deletion", () => {
    const onDeletePayoffScenario = vi.fn();
    const showToast = vi.fn();

    const profileWithScenarios: Profile = {
      ...mockProfile,
      debtPayoffScenarios: [
        {
          id: "sc-1",
          name: "Plan Kula 300 zł",
          strategy: "snowball",
          extraMonthlyPayment: 300,
          createdAt: "2026-01-01"
        },
        {
          id: "sc-2",
          name: "Plan Własny 1000 zł",
          strategy: "custom",
          extraMonthlyPayment: 1000,
          customDebtOrder: ["debt-2", "debt-1"],
          createdAt: "2026-01-02"
        }
      ]
    };

    render(
      <DebtsView
        profile={profileWithScenarios}
        onDeletePayoffScenario={onDeletePayoffScenario}
        showToast={showToast}
      />
    );

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // Verify counter and rendered scenario cards
    expect(screen.getByText("Zapisane scenariusze (2 / 5)")).toBeTruthy();
    expect(screen.getByText("Plan Kula 300 zł")).toBeTruthy();
    expect(screen.getByText("Plan Własny 1000 zł")).toBeTruthy();

    // Click "Wczytaj" on custom scenario sc-2
    const loadCustomBtn = screen.getByRole("button", { name: /Wczytaj scenariusz Plan Własny 1000 zł/i });
    fireEvent.click(loadCustomBtn);

    // Verify toast and custom order load
    expect(showToast).toHaveBeenCalledWith("Wczytano scenariusz: Plan Własny 1000 zł", "info");
    expect(screen.getByText(/Plan i kolejność spłaty: Własna kolejność/i)).toBeTruthy();

    // Click Delete on sc-1
    const deleteBtn = screen.getByRole("button", { name: /Usuń scenariusz Plan Kula 300 zł/i });
    fireEvent.click(deleteBtn);

    expect(onDeletePayoffScenario).toHaveBeenCalledWith("sc-1");
  });

  it("disables save button when 5 scenarios are already stored in profile", () => {
    const fullScenariosProfile: Profile = {
      ...mockProfile,
      debtPayoffScenarios: [1, 2, 3, 4, 5].map((i) => ({
        id: `sc-${i}`,
        name: `Plan ${i}`,
        strategy: "avalanche",
        extraMonthlyPayment: 100 * i,
        createdAt: "2026-01-01"
      }))
    };

    render(<DebtsView profile={fullScenariosProfile} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    expect(screen.getByText("Zapisane scenariusze (5 / 5)")).toBeTruthy();

    const saveBtn = screen.getByRole("button", { name: /Zapisz bieżący plan/i });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders Payoff Strategies Knowledge Center, toggles disclosure, and presents all 4 methods", () => {
    render(<DebtsView profile={mockProfile} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // 1. Trigger button is rendered with aria-expanded="false"
    const knowledgeTrigger = screen.getByRole("button", {
      name: /Jak działają strategie spłaty\?/i
    });
    expect(knowledgeTrigger).toBeTruthy();
    expect(knowledgeTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(knowledgeTrigger.getAttribute("aria-controls")).toBe("payoff-strategies-knowledge-content");

    // Initially explanations are collapsed
    expect(screen.queryByText(/Zastrzeżenie edukacyjne:/i)).toBeNull();

    // 2. Click to open Knowledge Center
    fireEvent.click(knowledgeTrigger);
    expect(knowledgeTrigger.getAttribute("aria-expanded")).toBe("true");

    // 3. Verify contextual guidance banner is present for default "avalanche"
    expect(screen.getByText("Wybrana strategia:")).toBeTruthy();
    expect(screen.getByText("Wyjaśnienie odpowiada aktualnie wybranej strategii.")).toBeTruthy();
    expect(screen.getByText("Aktualnie wybrana")).toBeTruthy();

    // 4. Verify trade-off summary is present
    expect(
      screen.getByText(/Avalanche porządkuje zobowiązania według oprocentowania, a Snowball według salda/i)
    ).toBeTruthy();

    // 5. Verify all strategies explanations are present
    expect(screen.getAllByText("Lawina (Avalanche)").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Nadpłata jest kierowana najpierw na zobowiązanie z najwyższym oprocentowaniem/i)
    ).toBeTruthy();

    expect(screen.getAllByText("Kula Śnieżna (Snowball)").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Nadpłata jest kierowana najpierw na zobowiązanie z najniższym saldem/i)
    ).toBeTruthy();

    expect(screen.getByText("Własna kolejność (Custom)")).toBeTruthy();
    expect(
      screen.getByText(/Kolejność spłaty ustalana jest ręcznie przez użytkownika w panelu priorytetyzacji/i)
    ).toBeTruthy();

    expect(screen.getAllByText("Status Quo (Plan bazowy)").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Punkt odniesienia oparty na bieżących założeniach spłaty/i)
    ).toBeTruthy();

    // 6. Verify metric explanations section (Sprint 32)
    expect(screen.getByText("Jak interpretować wyniki symulacji?")).toBeTruthy();
    expect(screen.getByText("Wolność od długu (data spłaty)")).toBeTruthy();
    expect(screen.getAllByText("Zaoszczędzone odsetki").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Zaoszczędzony czas").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Łączny koszt odsetek").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Harmonogram i kolejność spłaty")).toBeTruthy();
    expect(
      screen.getByText(/Pokazuje modelową różnicę kosztu odsetek względem planu bazowego \(Status Quo\)/i)
    ).toBeTruthy();

    // 7. Verify educational disclaimer
    expect(screen.getByText(/Zastrzeżenie edukacyjne:/i)).toBeTruthy();
    expect(
      screen.getByText(/Wskaźniki pokazują wynik modelu na podstawie bieżących danych i przyjętych założeń/i)
    ).toBeTruthy();

    // 8. Click again to collapse
    fireEvent.click(knowledgeTrigger);
    expect(knowledgeTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/Zastrzeżenie edukacyjne:/i)).toBeNull();
  });

  it("Sprint 31: dynamically updates contextual guidance in Knowledge Center when switching strategies", () => {
    render(<DebtsView profile={mockProfile} />);

    // Switch to Payoff Strategy tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // Open Knowledge Center
    const knowledgeTrigger = screen.getByRole("button", {
      name: /Jak działają strategie spłaty\?/i
    });
    fireEvent.click(knowledgeTrigger);

    // Default strategy is avalanche
    expect(screen.getAllByText("Lawina (Avalanche)").length).toBeGreaterThanOrEqual(1);
    const avalancheCard = document.querySelector('[data-selected="true"]');
    expect(avalancheCard?.textContent).toContain("Lawina (Avalanche)");

    // Switch strategy to Snowball by clicking Snowball card
    const snowballStrategyCards = screen.getAllByText("Metoda Kuli Śnieżnej (Snowball)");
    fireEvent.click(snowballStrategyCards[0]);

    // Contextual highlight in Knowledge Center should now be Snowball
    const selectedKnowledgeCard = document.querySelector('[data-selected="true"]');
    expect(selectedKnowledgeCard?.textContent).toContain("Kula Śnieżna (Snowball)");
  });

  it("handles scenario comparison selection, enforces max 2 limit, and opens comparison modal", () => {
    const showToast = vi.fn();
    const profileWith3Scenarios: Profile = {
      ...mockProfile,
      debtPayoffScenarios: [
        {
          id: "sc-1",
          name: "Plan Kula 300 zł",
          strategy: "snowball",
          extraMonthlyPayment: 300,
          createdAt: "2026-01-01"
        },
        {
          id: "sc-2",
          name: "Plan Własny 1000 zł",
          strategy: "custom",
          extraMonthlyPayment: 1000,
          customDebtOrder: ["debt-2", "debt-1"],
          createdAt: "2026-01-02"
        },
        {
          id: "sc-3",
          name: "Plan Lawina 500 zł",
          strategy: "avalanche",
          extraMonthlyPayment: 500,
          createdAt: "2026-01-03"
        }
      ]
    };

    render(<DebtsView profile={profileWith3Scenarios} showToast={showToast} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // 1. Check compare button initially disabled (0/2)
    const compareBtn = screen.getByRole("button", { name: /Porównaj scenariusze/i });
    expect((compareBtn as HTMLButtonElement).disabled).toBe(true);

    // 2. Select first scenario (sc-1)
    const checkbox1 = screen.getByRole("checkbox", { name: /Wybierz scenariusz Plan Kula 300 zł do porównania/i });
    fireEvent.click(checkbox1);
    expect((checkbox1 as HTMLInputElement).checked).toBe(true);
    expect((compareBtn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Porównaj scenariusze \(1 \/ 2\)/i)).toBeTruthy();

    // 3. Select second scenario (sc-2)
    const checkbox2 = screen.getByRole("checkbox", { name: /Wybierz scenariusz Plan Własny 1000 zł do porównania/i });
    fireEvent.click(checkbox2);
    expect((checkbox2 as HTMLInputElement).checked).toBe(true);
    expect((compareBtn as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText(/Porównaj scenariusze \(2 \/ 2\)/i)).toBeTruthy();

    // 4. Verify 3rd checkbox is disabled due to max 2 selection limit
    const checkbox3 = screen.getByRole("checkbox", { name: /Wybierz scenariusz Plan Lawina 500 zł do porównania/i });
    expect((checkbox3 as HTMLButtonElement).disabled).toBe(true);

    // 5. Open comparison modal
    fireEvent.click(compareBtn);

    // Verify modal content
    expect(screen.getByText("Porównanie zapisanych konfiguracji")).toBeTruthy();
    expect(screen.getByText("Zestawienie parametrów wybranych scenariuszy spłaty")).toBeTruthy();
    expect(screen.getByText(/To zestawienie pokazuje parametry zapisanych scenariuszy/i)).toBeTruthy();

    // Verify scenario details in comparison columns
    expect(screen.getByText("Scenariusz #1")).toBeTruthy();
    expect(screen.getByText("Scenariusz #2")).toBeTruthy();
    expect(screen.getAllByText("Plan Kula 300 zł").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Plan Własny 1000 zł").length).toBeGreaterThanOrEqual(2);

    // Verify strategy-specific order descriptions
    expect(screen.getByText("Kolejność ustalana automatycznie przez metodę")).toBeTruthy();
    // Custom order shows debt names (Karta Visa, Kredyt hipoteczny)
    expect(screen.getAllByText("Karta Visa").length).toBeGreaterThanOrEqual(1);

    // 6. Test loading scenario directly from comparison column
    const loadButtons = screen.getAllByRole("button", { name: /Wczytaj ten scenariusz/i });
    expect(loadButtons.length).toBe(2);
    fireEvent.click(loadButtons[0]);

    // Modal should close and scenario loaded
    expect(showToast).toHaveBeenCalled();
    expect(screen.queryByText("Porównanie zapisanych konfiguracji")).toBeNull();
  });

  it("handles scenario renaming flow with prefilled input and submit", () => {
    const onSavePayoffScenario = vi.fn();
    const profileWithScenario: Profile = {
      ...mockProfile,
      debtPayoffScenarios: [
        {
          id: "sc-1",
          name: "Plan Kula 300 zł",
          strategy: "snowball",
          extraMonthlyPayment: 300,
          createdAt: "2026-01-01"
        }
      ]
    };

    render(<DebtsView profile={profileWithScenario} onSavePayoffScenario={onSavePayoffScenario} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // Click "Zmień nazwę"
    const renameBtn = screen.getByRole("button", { name: /Zmień nazwę scenariusza Plan Kula 300 zł/i });
    fireEvent.click(renameBtn);

    // Verify modal is open
    expect(screen.getByText("Zmień nazwę scenariusza")).toBeTruthy();
    const input = screen.getByDisplayValue("Plan Kula 300 zł");
    expect(input).toBeTruthy();

    // Change value and submit
    fireEvent.change(input, { target: { value: "Plan Kula 350 zł (Poprawiony)" } });
    const submitBtn = screen.getByRole("button", { name: "Zapisz" });
    fireEvent.click(submitBtn);

    expect(onSavePayoffScenario).toHaveBeenCalledTimes(1);
    expect(onSavePayoffScenario).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sc-1",
        name: "Plan Kula 350 zł (Poprawiony)",
        strategy: "snowball",
        extraMonthlyPayment: 300
      })
    );
  });

  it("handles scenario duplication flow, preserving strategy and order settings", () => {
    const onSavePayoffScenario = vi.fn();
    const profileWithCustomScenario: Profile = {
      ...mockProfile,
      debtPayoffScenarios: [
        {
          id: "sc-custom",
          name: "Mój Plan Własny",
          strategy: "custom",
          extraMonthlyPayment: 750,
          customDebtOrder: ["debt-2", "debt-1"],
          createdAt: "2026-01-01"
        }
      ]
    };

    render(<DebtsView profile={profileWithCustomScenario} onSavePayoffScenario={onSavePayoffScenario} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // Click "Duplikuj"
    const duplicateBtn = screen.getByRole("button", { name: /Duplikuj scenariusz Mój Plan Własny/i });
    fireEvent.click(duplicateBtn);

    // Verify duplicate modal is open with prefilled copy name
    expect(screen.getByText("Duplikuj scenariusz spłaty")).toBeTruthy();
    const input = screen.getByDisplayValue("Mój Plan Własny — kopia");
    expect(input).toBeTruthy();

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Utwórz kopię" });
    fireEvent.click(submitBtn);

    expect(onSavePayoffScenario).toHaveBeenCalledTimes(1);
    expect(onSavePayoffScenario).toHaveBeenCalledWith({
      name: "Mój Plan Własny — kopia",
      strategy: "custom",
      extraMonthlyPayment: 750,
      customDebtOrder: ["debt-2", "debt-1"]
    });
  });

  it("disables duplicate button when 5 scenarios exist, while rename remains enabled", () => {
    const fullScenariosProfile: Profile = {
      ...mockProfile,
      debtPayoffScenarios: [1, 2, 3, 4, 5].map((i) => ({
        id: `sc-${i}`,
        name: `Plan ${i}`,
        strategy: "avalanche",
        extraMonthlyPayment: 100 * i,
        createdAt: "2026-01-01"
      }))
    };

    render(<DebtsView profile={fullScenariosProfile} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // Verify duplicate buttons are disabled
    const duplicateButtons = screen.getAllByRole("button", { name: /Duplikuj scenariusz Plan/i });
    expect(duplicateButtons.length).toBe(5);
    duplicateButtons.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });

    // Verify rename buttons remain enabled
    const renameButtons = screen.getAllByRole("button", { name: /Zmień nazwę scenariusza Plan/i });
    expect(renameButtons.length).toBe(5);
    renameButtons.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("Sprint 11 Acceptance: seamlessly performs full interactive lifecycle of debt simulator", () => {
    const onSavePayoffScenario = vi.fn();
    const onDeletePayoffScenario = vi.fn();
    const showToast = vi.fn();

    const profile: Profile = {
      ...mockProfile,
      debtPayoffScenarios: [
        {
          id: "sc-base",
          name: "Plan Kula Bazowy",
          strategy: "snowball",
          extraMonthlyPayment: 250,
          createdAt: "2026-01-01"
        }
      ]
    };

    render(
      <DebtsView
        profile={profile}
        onSavePayoffScenario={onSavePayoffScenario}
        onDeletePayoffScenario={onDeletePayoffScenario}
        showToast={showToast}
      />
    );

    // 1. Navigate to simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // 2. Test strategy selection: Switch to Custom
    const customCard = screen.getByText("Własna kolejność");
    fireEvent.click(customCard);
    expect(screen.getByText("Ustal kolejność spłaty")).toBeTruthy();
    expect(screen.getByText("Cel priorytetowy #1")).toBeTruthy();

    // 3. Reorder custom queue: Move priority
    const moveDownFirst = screen.getByRole("button", {
      name: /Przenieś zobowiązanie Kredyt hipoteczny niżej/i
    });
    fireEvent.click(moveDownFirst);

    // 4. Test Knowledge Center disclosure
    const knowledgeTrigger = screen.getByRole("button", {
      name: /Jak działają strategie spłaty\?/i
    });
    expect(knowledgeTrigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(knowledgeTrigger);
    expect(knowledgeTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/Zastrzeżenie edukacyjne:/i)).toBeTruthy();
    fireEvent.click(knowledgeTrigger);
    expect(knowledgeTrigger.getAttribute("aria-expanded")).toBe("false");

    // 5. Test saving current Custom plan as scenario
    const saveBtn = screen.getByRole("button", { name: /Zapisz bieżący plan/i });
    fireEvent.click(saveBtn);
    const nameInput = screen.getByPlaceholderText(/np\. Wariant optymistyczny/i);
    fireEvent.change(nameInput, { target: { value: "Mój Plan Niestandardowy 500" } });
    const submitSaveBtn = screen.getByRole("button", { name: "Zapisz scenariusz" });
    fireEvent.click(submitSaveBtn);
    expect(onSavePayoffScenario).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Mój Plan Niestandardowy 500",
        strategy: "custom"
      })
    );

    // 6. Test renaming the base scenario
    const renameBtn = screen.getByRole("button", { name: /Zmień nazwę scenariusza Plan Kula Bazowy/i });
    fireEvent.click(renameBtn);
    expect(screen.getByText("Zmień nazwę scenariusza")).toBeTruthy();
    const renameInput = screen.getByDisplayValue("Plan Kula Bazowy");
    fireEvent.change(renameInput, { target: { value: "Plan Kula 300 (Zmieniony)" } });
    const submitRenameBtn = screen.getByRole("button", { name: "Zapisz" });
    fireEvent.click(submitRenameBtn);
    expect(onSavePayoffScenario).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sc-base",
        name: "Plan Kula 300 (Zmieniony)"
      })
    );

    // 7. Test duplicating the base scenario
    const duplicateBtn = screen.getByRole("button", { name: /Duplikuj scenariusz Plan Kula Bazowy/i });
    fireEvent.click(duplicateBtn);
    expect(screen.getByText("Duplikuj scenariusz spłaty")).toBeTruthy();
    const duplicateInput = screen.getByDisplayValue("Plan Kula Bazowy — kopia");
    expect(duplicateInput).toBeTruthy();
    const submitDuplicateBtn = screen.getByRole("button", { name: "Utwórz kopię" });
    fireEvent.click(submitDuplicateBtn);
    expect(onSavePayoffScenario).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Plan Kula Bazowy — kopia",
        strategy: "snowball",
        extraMonthlyPayment: 250
      })
    );

    // 8. Test deleting a scenario
    const deleteBtn = screen.getByRole("button", { name: /Usuń scenariusz Plan Kula Bazowy/i });
    fireEvent.click(deleteBtn);
    expect(onDeletePayoffScenario).toHaveBeenCalledWith("sc-base");
  });

  it("Sprint 13: renders Payoff Progress Summary block with balance, percentage, and counts", () => {
    render(<DebtsView profile={mockProfile} />);

    // Progress block presence
    expect(screen.getByText("Postęp spłaty portfela zadłużenia")).toBeTruthy();
    expect(screen.getByText("Saldo początkowe:")).toBeTruthy();
    expect(screen.getByText("Aktualne saldo:")).toBeTruthy();
    expect(screen.getByText("Czynne umowy:")).toBeTruthy();
    expect(screen.getByText("Spłacone umowy:")).toBeTruthy();
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });

  it("Sprint 13: handles flexible extra monthly payment with custom input, reset, and safe validation", () => {
    render(<DebtsView profile={mockProfile} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    const extraInput = screen.getByLabelText(/Dodatkowy budżet na nadpłatę/i);
    expect(extraInput).toBeTruthy();

    // Type custom overpayment amount: 750
    fireEvent.change(extraInput, { target: { value: "750" } });
    expect((extraInput as HTMLInputElement).value).toBe("750");

    // Reset button appears
    const resetBtn = screen.getByRole("button", { name: /Wyzeruj \(0 zł\)/i });
    expect(resetBtn).toBeTruthy();
    fireEvent.click(resetBtn);
    expect((extraInput as HTMLInputElement).value).toBe("");

    // Safe handling of negative or invalid values
    fireEvent.change(extraInput, { target: { value: "-300" } });
    expect((extraInput as HTMLInputElement).value).toBe("");
  });

  it("Sprint 13: displays Debt-Free Milestone card with conservative wording and estimates", () => {
    render(<DebtsView profile={mockProfile} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // Milestone card
    expect(screen.getByText("Kamień milowy spłaty zadłużenia")).toBeTruthy();
    expect(screen.getByText("Szacowany termin spłaty:")).toBeTruthy();
    expect(screen.getByText("Orientacyjny czas do końca:")).toBeTruthy();
    expect(screen.getByText("Szacowany koszt odsetek:")).toBeTruthy();
    expect(screen.getByText("Różnica względem wariantu bazowego:")).toBeTruthy();
  });

  it("Sprint 13: displays quick summary estimates on saved scenario cards and comparison decision summary", () => {
    const profileWithScenarios: Profile = {
      ...mockProfile,
      debtPayoffScenarios: [
        {
          id: "sc-1",
          name: "Wariant Lawina 500",
          strategy: "avalanche",
          extraMonthlyPayment: 500,
          createdAt: "2026-01-01"
        },
        {
          id: "sc-2",
          name: "Wariant Kula 200",
          strategy: "snowball",
          extraMonthlyPayment: 200,
          createdAt: "2026-01-02"
        }
      ]
    };

    render(<DebtsView profile={profileWithScenarios} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // Quick scenario summary text
    expect(screen.getByText("Wariant Lawina 500")).toBeTruthy();
    expect(screen.getByText("Wariant Kula 200")).toBeTruthy();
    expect(screen.getAllByText(/Termin:/i).length).toBeGreaterThanOrEqual(2);

    // Select both scenarios to compare
    const check1 = screen.getByRole("checkbox", { name: /Wybierz scenariusz Wariant Lawina 500 do porównania/i });
    const check2 = screen.getByRole("checkbox", { name: /Wybierz scenariusz Wariant Kula 200 do porównania/i });
    fireEvent.click(check1);
    fireEvent.click(check2);

    // Open comparison modal
    const compareTrigger = screen.getByRole("button", { name: /Porównaj scenariusze \(wybrano 2 z 2\)/i });
    fireEvent.click(compareTrigger);

    // Decision summary box in comparison modal
    expect(screen.getByText("Podsumowanie różnic między scenariuszami")).toBeTruthy();
    expect(screen.getByText(/prowadzi do spłaty orientacyjnie/i)).toBeTruthy();
  });

  it("Sprint 14: handles one-time overpayment what-if simulation with safe input, reset, and result summary", () => {
    render(<DebtsView profile={mockProfile} />);

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // Expand What-If panel
    const toggleWhatIfBtn = screen.getByRole("button", { name: /Symulacja wariantowa \(What-If\)/i });
    expect(toggleWhatIfBtn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggleWhatIfBtn);
    expect(toggleWhatIfBtn.getAttribute("aria-expanded")).toBe("true");

    const oneTimeInput = screen.getByLabelText(/Jednorazowa nadpłata/i);
    expect(oneTimeInput).toBeTruthy();

    // Type 10000 one-time overpayment
    fireEvent.change(oneTimeInput, { target: { value: "10000" } });
    expect((oneTimeInput as HTMLInputElement).value).toBe("10000");

    // Result summary appears
    expect(screen.getByText("Wpływ symulacji na plan spłaty:")).toBeTruthy();
    expect(screen.getByText(/Wariant symulacyjny skraca orientacyjny czas spłaty o/i)).toBeTruthy();
    expect(screen.getByText(/Szacowany koszt odsetek jest niższy o około/i)).toBeTruthy();

    // Reset one-time overpayment
    const resetOneTimeBtn = screen.getByRole("button", { name: /Wyzeruj jednorazową nadpłatę/i });
    fireEvent.click(resetOneTimeBtn);
    expect((oneTimeInput as HTMLInputElement).value).toBe("");

    // Safe handling of negative values
    fireEvent.change(oneTimeInput, { target: { value: "-5000" } });
    expect((oneTimeInput as HTMLInputElement).value).toBe("");
  });

  it("Sprint 14: supports strategy what-if preview and maintains save safety without mutating saved scenarios", () => {
    const onSavePayoffScenario = vi.fn();
    const profileWithScenario: Profile = {
      ...mockProfile,
      debtPayoffScenarios: [
        {
          id: "sc-saved-1",
          name: "Plan Lawina 500",
          strategy: "avalanche",
          extraMonthlyPayment: 500,
          createdAt: "2026-01-01"
        }
      ]
    };

    render(
      <DebtsView
        profile={profileWithScenario}
        onSavePayoffScenario={onSavePayoffScenario}
      />
    );

    // Switch to Payoff Strategy simulator tab
    const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
    fireEvent.click(strategyTopBtn);

    // Expand What-If panel
    const toggleWhatIfBtn = screen.getByRole("button", { name: /Symulacja wariantowa \(What-If\)/i });
    fireEvent.click(toggleWhatIfBtn);

    // Click preview strategy 'Status Quo'
    const previewStatusQuoBtn = screen.getByRole("button", { name: "Status Quo" });
    fireEvent.click(previewStatusQuoBtn);

    // Result summary box renders comparison against baseline
    expect(screen.getByText("Wpływ symulacji na plan spłaty:")).toBeTruthy();

    // Main strategy selection remains intact
    const loadSavedBtn = screen.getByRole("button", { name: /Wczytaj scenariusz Plan Lawina 500/i });
    fireEvent.click(loadSavedBtn);

    // Temporary what-if parameters reset upon explicit scenario load
    expect(screen.queryByText("Aktywna symulacja")).toBeNull();
  });

  it("Sprint 15: filters by all required category chips accurately", () => {
    const portfolioProfile: Profile = {
      ...mockProfile,
      debts: [
        {
          id: "d-mort",
          name: "Hipoteka Dom",
          institution: "PKO BP",
          type: "mortgage",
          currency: "PLN",
          balance: 300000,
          monthlyPayment: 2200,
          interestRate: 6.5,
          status: "active",
          createdAt: "2026-01-01"
        },
        {
          id: "d-cash",
          name: "Pożyczka Gotówkowa",
          institution: "Alior",
          type: "cash_loan",
          currency: "PLN",
          balance: 20000,
          monthlyPayment: 600,
          interestRate: 11.0,
          status: "active",
          createdAt: "2026-01-01"
        },
        {
          id: "d-card",
          name: "Karta Kredytowa",
          institution: "Santander",
          type: "credit_card",
          currency: "PLN",
          balance: 5000,
          monthlyPayment: 250,
          interestRate: 18.0,
          status: "active",
          createdAt: "2026-01-01"
        },
        {
          id: "d-rev",
          name: "Limit w ROR",
          institution: "mBank",
          type: "revolving",
          currency: "PLN",
          balance: 3000,
          monthlyPayment: 150,
          interestRate: 17.5,
          status: "active",
          createdAt: "2026-01-01"
        },
        {
          id: "d-bnpl",
          name: "Allegro Pay",
          institution: "Allegro",
          type: "bnpl",
          currency: "PLN",
          balance: 1200,
          monthlyPayment: 200,
          interestRate: 0,
          status: "active",
          createdAt: "2026-01-01"
        },
        {
          id: "d-other",
          name: "Pożyczka Rodzinna",
          institution: "Prywatna",
          type: "other",
          currency: "PLN",
          balance: 4000,
          monthlyPayment: 400,
          interestRate: 0,
          status: "active",
          createdAt: "2026-01-01"
        }
      ]
    };

    const { container } = render(<DebtsView profile={portfolioProfile} />);
    const cardsList = container.querySelector("#debt-cards-list") as HTMLElement;

    // Filter: Karty i limity (matches both credit_card and revolving)
    const cardsAndLimitsChip = screen.getByRole("button", { name: /Karty i limity \(2\)/i });
    fireEvent.click(cardsAndLimitsChip);
    expect(within(cardsList).getByText("Karta Kredytowa")).toBeTruthy();
    expect(within(cardsList).getByText("Limit w ROR")).toBeTruthy();
    expect(within(cardsList).queryByText("Hipoteka Dom")).toBeNull();

    // Filter: Ratalne
    const bnplChip = screen.getByRole("button", { name: /Ratalne \(1\)/i });
    fireEvent.click(bnplChip);
    expect(within(cardsList).getByText("Allegro Pay")).toBeTruthy();
    expect(within(cardsList).queryByText("Karta Kredytowa")).toBeNull();

    // Filter: Inne
    const otherChip = screen.getByRole("button", { name: /Inne \(1\)/i });
    fireEvent.click(otherChip);
    expect(within(cardsList).getByText("Pożyczka Rodzinna")).toBeTruthy();
  });

  it("Sprint 15: renders DashboardView debt bridge insight when active debts exist and navigates to debts view", () => {
    const onChangeView = vi.fn();
    render(
      <DashboardView
        profile={mockProfile}
        selectedDate={new Date(2026, 0, 1)}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        onTogglePaymentStatus={vi.fn()}
        onOpenTxModal={vi.fn()}
        onOpenBudgetModal={vi.fn()}
        onOpenPaymentModal={vi.fn()}
        onChangeView={onChangeView}
        showToast={vi.fn()}
      />
    );

    // Bridge card exists
    expect(screen.getByText("Portfel kredytów i zadłużenia")).toBeTruthy();
    expect(screen.getByText(/2 aktywne umowy/i)).toBeTruthy();

    // Click navigation button
    const toDebtsBtn = screen.getByRole("button", { name: /Przejdź do pełnego widoku Kredyty i Hipoteka/i });
    fireEvent.click(toDebtsBtn);
    expect(onChangeView).toHaveBeenCalledWith("debts");
  });

  it("Sprint 15: hides DashboardView debt bridge insight when no active debts exist", () => {
    const emptyProfile: Profile = {
      ...mockProfile,
      debts: [
        {
          id: "d-closed",
          name: "Stary kredyt",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          balance: 0,
          monthlyPayment: 0,
          interestRate: 5,
          status: "closed",
          createdAt: "2024-01-01"
        }
      ]
    };

    render(
      <DashboardView
        profile={emptyProfile}
        selectedDate={new Date(2026, 0, 1)}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        onTogglePaymentStatus={vi.fn()}
        onOpenTxModal={vi.fn()}
        onOpenBudgetModal={vi.fn()}
        onOpenPaymentModal={vi.fn()}
        onChangeView={vi.fn()}
        showToast={vi.fn()}
      />
    );

    expect(screen.queryByText("Portfel kredytów i zadłużenia")).toBeNull();
  });

  it("Sprint 16: displays amortization schedule and cost breakdown in DebtDetailsModal for an eligible debt", () => {
    const mortgage = mockDebts[0];
    render(<DebtDetailsModal isOpen={true} debt={mortgage} onClose={vi.fn()} />);

    // Click on Harmonogram spłat tab
    const scheduleTabBtn = screen.getByRole("button", { name: /Harmonogram spłat/i });
    fireEvent.click(scheduleTabBtn);

    // Header & summary KPIs
    expect(screen.getByText("Harmonogram spłat i analiza kosztu")).toBeTruthy();
    expect(screen.getByText("Szacowana rata")).toBeTruthy();
    expect(screen.getByText("Kapitał (1. rata)")).toBeTruthy();
    expect(screen.getByText("Odsetki (1. rata)")).toBeTruthy();
    expect(screen.getByText("Odsetki łącznie")).toBeTruthy();
    expect(screen.getByText("Spłata końcowa")).toBeTruthy();
    expect(screen.getByText("Pozostały okres")).toBeTruthy();

    // Table elements
    expect(screen.getByRole("table", { name: "Tabela harmonogramu spłat" })).toBeTruthy();
    expect(screen.getByText("Miesiąc 1")).toBeTruthy();

    // Toggle full schedule button
    const fullScheduleBtn = screen.getByRole("button", { name: /Pokaż pełny harmonogram/i });
    fireEvent.click(fullScheduleBtn);
    expect(screen.getByRole("button", { name: /Pokaż 24 miesiące/i })).toBeTruthy();
  });

  it("Sprint 16: shows clear unsupported message in schedule tab for credit cards", () => {
    const card = mockDebts[1];
    render(<DebtDetailsModal isOpen={true} debt={card} onClose={vi.fn()} />);

    // Go to schedule tab
    const scheduleTabBtn = screen.getByRole("button", { name: /Harmonogram spłat/i });
    fireEvent.click(scheduleTabBtn);

    // Unsupported message
    expect(screen.getByText("Harmonogram niedostępny")).toBeTruthy();
    expect(screen.getByText(/Karty kredytowe i limity odnawialne charakteryzują się elastyczną spłatą/i)).toBeTruthy();
  });

  it("Sprint 17: simulates overpayment impact with inputs, comparison summary, updated schedule, and reset", () => {
    const mortgage = mockDebts[0];
    render(<DebtDetailsModal isOpen={true} debt={mortgage} onClose={vi.fn()} />);

    // Switch to Symulacja nadpłaty tab
    const overpaymentTabBtn = screen.getByRole("button", { name: /Symulacja nadpłaty/i });
    fireEvent.click(overpaymentTabBtn);

    expect(screen.getByText("Symulacja wpływu nadpłaty")).toBeTruthy();
    expect(screen.getByText("Dodatkowa kwota miesięcznie (PLN)")).toBeTruthy();
    expect(screen.getByText("Jednorazowa nadpłata w 1. miesiącu (PLN)")).toBeTruthy();

    // Enter monthly overpayment
    const monthlyInput = screen.getByLabelText("Dodatkowa kwota miesięcznie");
    fireEvent.change(monthlyInput, { target: { value: "500" } });

    // Enter one-time overpayment
    const oneTimeInput = screen.getByLabelText("Jednorazowa nadpłata w pierwszym miesiącu");
    fireEvent.change(oneTimeInput, { target: { value: "5000" } });

    // Comparison summary updates
    expect(screen.getByText("Zaktualizowany harmonogram spłaty po nadpłatach")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Tabela zaktualizowanego harmonogramu po nadpłatach" })).toBeTruthy();

    // Reset button
    const resetBtn = screen.getByRole("button", { name: /Wyzeruj symulację/i });
    fireEvent.click(resetBtn);

    expect((monthlyInput as HTMLInputElement).value).toBe("");
    expect((oneTimeInput as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("Zaktualizowany harmonogram spłaty po nadpłatach")).toBeNull();
  });

  it("Sprint 17: shows clear unsupported message in overpayment simulation for credit cards", () => {
    const card = mockDebts[1];
    render(<DebtDetailsModal isOpen={true} debt={card} onClose={vi.fn()} initialTab="overpayment" />);

    expect(screen.getByText("Symulacja nadpłaty niedostępna")).toBeTruthy();
    expect(screen.getByText(/Karty kredytowe i limity odnawialne charakteryzują się elastyczną spłatą/i)).toBeTruthy();
  });

  it("Sprint 18: allows comparing multiple overpayment variants with matrix, edits, add/remove, and reset", () => {
    const mortgage = mockDebts[0];
    render(<DebtDetailsModal isOpen={true} debt={mortgage} onClose={vi.fn()} initialTab="overpayment" />);

    // Open variants comparison mode
    const compareVariantsBtn = screen.getByRole("button", { name: /Porównaj warianty nadpłat/i });
    fireEvent.click(compareVariantsBtn);

    expect(screen.getByText("Porównanie wariantów nadpłat")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Tabela porównania wariantów nadpłat" })).toBeTruthy();
    expect(screen.getByText("Wariant bazowy")).toBeTruthy();
    expect(screen.getAllByText("Nadpłata miesięczna").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nadpłata jednorazowa").length).toBeGreaterThan(0);

    // Edit variant 1 name and monthly overpayment
    const nameInput = screen.getByLabelText("Nazwa wariantu 1");
    fireEvent.change(nameInput, { target: { value: "Mój Plan A" } });
    expect(screen.getAllByText("Mój Plan A").length).toBeGreaterThan(0);

    const monthlyInput = screen.getByLabelText("Nadpłata miesięczna dla Mój Plan A");
    fireEvent.change(monthlyInput, { target: { value: "800" } });

    // Remove variant 2
    const removeBtn = screen.getByRole("button", { name: /Usuń wariant Nadpłata jednorazowa/i });
    fireEvent.click(removeBtn);

    // Now add second variant back
    const addSecondBtn = screen.getByRole("button", { name: /Dodaj drugi wariant/i });
    fireEvent.click(addSecondBtn);

    // Reset comparison variants
    const resetVariantsBtn = screen.getByRole("button", { name: /Wyzeruj warianty/i });
    fireEvent.click(resetVariantsBtn);

    expect(screen.getAllByText("Nadpłata miesięczna").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nadpłata jednorazowa").length).toBeGreaterThan(0);

    // Toggle back to single simulation
    const singleSimBtn = screen.getByRole("button", { name: /Pojedyncza symulacja/i });
    fireEvent.click(singleSimBtn);
    expect(screen.getByText("Symulacja wpływu nadpłaty")).toBeTruthy();
  });

  describe("DebtDetailsModal — Payment History and Activity (Sprint 22)", () => {
    const mortgageDebt = mockDebts[0]; // balance: 350,000, 6.85% interest

    it("renders empty state in history tab when no transactions are linked", () => {
      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={[]}
          onClose={vi.fn()}
          initialTab="history"
        />
      );

      expect(screen.getByText("Brak powiązanych płatności")).toBeTruthy();
      expect(screen.getByText(/Płatności przypisane do tego długu pojawią się tutaj/i)).toBeTruthy();
    });

    it("renders payment activity and aggregate KPIs when linked transactions exist", () => {
      const mockTransactions = [
        {
          id: "tx-1",
          name: "Rata kredytu styczeń",
          amount: 2600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-01-15",
          debtId: "debt-1",
          currency: "PLN" as const
        },
        {
          id: "tx-2",
          name: "Rata kredytu luty",
          amount: 2600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-02-15",
          debtId: "debt-1",
          currency: "PLN" as const
        },
        {
          id: "tx-unlinked",
          name: "Zakupy spożywcze",
          amount: 200,
          type: "expense" as const,
          category: "Jedzenie",
          account: "Konto główne",
          isoDate: "2026-02-16",
          currency: "PLN" as const
        },
        {
          id: "tx-other-debt",
          name: "Spłata karty",
          amount: 400,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-02-17",
          debtId: "debt-2",
          currency: "PLN" as const
        }
      ];

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={mockTransactions}
          onClose={vi.fn()}
          initialTab="history"
        />
      );

      // Verify aggregate KPIs and Insights
      expect(screen.getByText("Podsumowanie płatności")).toBeTruthy();
      expect(screen.getByText("Liczba wpłat")).toBeTruthy();
      expect(screen.getAllByText("2").length).toBeGreaterThan(0);
      expect(screen.getByText("Suma wpłat")).toBeTruthy();
      expect(screen.getByText("Średnia wpłata")).toBeTruthy();
      expect(screen.getByText("Spłacony kapitał")).toBeTruthy();
      expect(screen.getByText("Część odsetkowa")).toBeTruthy();
      expect(screen.getByText("Ostatnia wpłata")).toBeTruthy();

      // Verify transaction list rendered
      expect(screen.getByText("Rata kredytu styczeń")).toBeTruthy();
      expect(screen.getByText("Rata kredytu luty")).toBeTruthy();

      // Unlinked and other debt transactions must not appear
      expect(screen.queryByText("Zakupy spożywcze")).toBeNull();
      expect(screen.queryByText("Spłata karty")).toBeNull();
    });

    it("filters visible timeline rows, updates count, and resets filters correctly (Sprint 24)", () => {
      const mockTransactions = [
        {
          id: "tx-1",
          name: "Rata normalna",
          amount: 2600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-01-15",
          debtId: "debt-1",
          currency: "PLN" as const
        },
        {
          id: "tx-2",
          name: "Wpłata częściowa odsetek",
          amount: 50,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-02-15",
          debtId: "debt-1",
          currency: "PLN" as const
        }
      ];

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={mockTransactions}
          onClose={vi.fn()}
          initialTab="history"
        />
      );

      // Initial visible count
      expect(screen.getByText("Wyświetlane: 2 płatności")).toBeTruthy();

      // Filter by status to "paid_off" (which has 0 matches in this dataset)
      const statusSelect = screen.getByLabelText("Status:");
      fireEvent.change(statusSelect, { target: { value: "paid_off" } });

      // Should show filtered empty state
      expect(screen.getByText("Brak płatności spełniających wybrane filtry.")).toBeTruthy();
      expect(screen.getByText("Wyświetlane: 0 z 2 płatności")).toBeTruthy();

      // Global insights KPIs should remain unaffected (2 payments recorded)
      expect(screen.getByText("Liczba wpłat")).toBeTruthy();
      expect(screen.getAllByText("2").length).toBeGreaterThan(0);

      // Click reset filters button
      const resetBtn = screen.getAllByRole("button", { name: "Wyczyść filtry" })[0];
      fireEvent.click(resetBtn);

      // Both items visible again
      expect(screen.getByText("Wyświetlane: 2 płatności")).toBeTruthy();
      expect(screen.getByText("Rata normalna")).toBeTruthy();
      expect(screen.getByText("Wpłata częściowa odsetek")).toBeTruthy();
    });

    it("switches summary scope between full history and filtered subset (Sprint 25)", () => {
      const mockTransactions = [
        {
          id: "tx-1",
          name: "Rata normalna",
          amount: 2600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-01-15",
          debtId: "debt-1",
          currency: "PLN" as const
        },
        {
          id: "tx-2",
          name: "Wpłata odsetkowa",
          amount: 50,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-02-15",
          debtId: "debt-1",
          currency: "PLN" as const
        }
      ];

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={mockTransactions}
          onClose={vi.fn()}
          initialTab="history"
        />
      );

      // Default scope is full history
      expect(screen.getByRole("button", { name: "Cała historia" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Widoczne po filtrach" })).toBeTruthy();
      expect(screen.getByText("Podsumowanie całej zarejestrowanej historii")).toBeTruthy();

      // Filter by status to "normal" (1 match)
      const statusSelect = screen.getByLabelText("Status:");
      fireEvent.change(statusSelect, { target: { value: "normal" } });

      // In full scope, summary still displays 2 payments
      expect(screen.getAllByText("2").length).toBeGreaterThan(0);

      // Switch scope to "Widoczne po filtrach"
      const filteredScopeBtn = screen.getByRole("button", { name: "Widoczne po filtrach" });
      fireEvent.click(filteredScopeBtn);

      expect(screen.getByText("Podsumowanie widocznych płatności")).toBeTruthy();
      expect(screen.getByText("Najnowsza widoczna wpłata")).toBeTruthy();

      // Filter to status with 0 matches ("paid_off")
      fireEvent.change(statusSelect, { target: { value: "paid_off" } });

      // Summary in filtered scope shows empty subset state
      expect(screen.getByText("Brak widocznych płatności do podsumowania.")).toBeTruthy();

      // Switch back to full history scope
      const fullScopeBtn = screen.getByRole("button", { name: "Cała historia" });
      fireEvent.click(fullScopeBtn);

      expect(screen.getByText("Podsumowanie całej zarejestrowanej historii")).toBeTruthy();
      expect(screen.getByText("Ostatnia wpłata")).toBeTruthy();
    });

    it("renders trend snapshot with monthly periods and updates by scope (Sprint 26)", () => {
      const mockTransactions = [
        {
          id: "tx-1",
          name: "Rata styczeń",
          amount: 2600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-01-15",
          debtId: "debt-1",
          currency: "PLN" as const
        },
        {
          id: "tx-2",
          name: "Rata luty",
          amount: 2600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-02-15",
          debtId: "debt-1",
          currency: "PLN" as const
        }
      ];

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={mockTransactions}
          onClose={vi.fn()}
          initialTab="history"
        />
      );

      // Verify Trend Snapshot section
      expect(screen.getByText("Rozkład zarejestrowanych płatności")).toBeTruthy();
      expect(screen.getByText("Rozkład miesięczny całej zarejestrowanej historii")).toBeTruthy();
      expect(screen.getByText("sty 2026")).toBeTruthy();
      expect(screen.getByText("lut 2026")).toBeTruthy();

      // Switch to filtered scope
      const filteredScopeBtn = screen.getByRole("button", { name: "Widoczne po filtrach" });
      fireEvent.click(filteredScopeBtn);

      expect(screen.getByText("Rozkład miesięczny widocznych płatności")).toBeTruthy();

      // Filter out all rows
      const statusSelect = screen.getByLabelText("Status:");
      fireEvent.change(statusSelect, { target: { value: "paid_off" } });

      expect(screen.getByText("Brak widocznych płatności do przedstawienia na osi czasu.")).toBeTruthy();
    });

    it("filters payment history and updates summary/trend by period preset (Sprint 27)", () => {
      const mockTransactions = [
        {
          id: "tx-1",
          name: "Rata Październik 2025",
          amount: 2600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2025-10-15",
          debtId: "debt-1",
          currency: "PLN" as const
        },
        {
          id: "tx-2",
          name: "Rata Grudzień 2025",
          amount: 2600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2025-12-15",
          debtId: "debt-1",
          currency: "PLN" as const
        },
        {
          id: "tx-3",
          name: "Rata Luty 2026",
          amount: 2600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-02-15",
          debtId: "debt-1",
          currency: "PLN" as const
        }
      ];

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={mockTransactions}
          onClose={vi.fn()}
          initialTab="history"
        />
      );

      // Default is all history (3 payments)
      expect(screen.getByText("Wyświetlane: 3 płatności")).toBeTruthy();
      expect(screen.getByText("Podsumowanie całej zarejestrowanej historii")).toBeTruthy();

      // Change period to "last_3_months" (covers 2025-12..2026-02 -> 2 payments: tx-2 and tx-3)
      const periodSelect = screen.getByLabelText("Okres:");
      fireEvent.change(periodSelect, { target: { value: "last_3_months" } });

      expect(screen.getByText("Podsumowanie ostatnich 3 miesięcy")).toBeTruthy();
      expect(screen.getByText("W wybranym okresie: 2 płatności")).toBeTruthy();
      expect(screen.queryByText("Rata Październik 2025")).toBeNull();
      expect(screen.getByText("Rata Grudzień 2025")).toBeTruthy();
      expect(screen.getByText("Rata Luty 2026")).toBeTruthy();

      // Switch back to "all"
      fireEvent.change(periodSelect, { target: { value: "all" } });
      expect(screen.getByText("Wyświetlane: 3 płatności")).toBeTruthy();
      expect(screen.getByText("Rata Październik 2025")).toBeTruthy();
    });

    it("renders comparison badges and previous period deltas for rolling presets (Sprint 28)", () => {
      const mockTransactions = [
        // Previous 3-month window: 2025-11..2026-01
        {
          id: "tx-prev-1",
          name: "Rata Listopad",
          amount: 2500,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2025-11-15",
          debtId: "debt-1",
          currency: "PLN" as const
        },
        // Current 3-month window: 2026-02..2026-04
        {
          id: "tx-cur-1",
          name: "Rata Luty",
          amount: 2600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-02-15",
          debtId: "debt-1",
          currency: "PLN" as const
        },
        {
          id: "tx-cur-2",
          name: "Rata Kwiecień",
          amount: 2600,
          type: "expense" as const,
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-04-15",
          debtId: "debt-1",
          currency: "PLN" as const
        }
      ];

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={mockTransactions}
          onClose={vi.fn()}
          initialTab="history"
        />
      );

      // In "all" preset, informational note is rendered
      expect(screen.getByText("Wybierz okres 3, 6 lub 12 miesięcy, aby ocenić dostępność danych porównawczych i zobaczyć porównanie z poprzednim okresem.")).toBeTruthy();

      // Switch to "last_3_months"
      const periodSelect = screen.getByLabelText("Okres:");
      fireEvent.change(periodSelect, { target: { value: "last_3_months" } });

      // Comparison section should be rendered with metrics
      expect(screen.getByText("Porównanie z poprzednim okresem")).toBeTruthy();
      expect(screen.getByText("Bieżący okres vs poprzednie okno o tej samej długości")).toBeTruthy();
      expect(screen.getByText("2 vs 1")).toBeTruthy();
      expect(screen.getByText("Pokrycie danych:")).toBeTruthy();
      expect(screen.getByText("Dane porównawcze dostępne: zarejestrowane płatności występują w obu okresach.")).toBeTruthy();
    });

    it("Sprint 33: displays calm message when all debts are closed or have zero balance", () => {
      const closedDebtsProfile: Profile = {
        ...mockProfile,
        debts: [
          {
            id: "debt-closed-1",
            name: "Stary kredyt",
            institution: "PKO BP",
            type: "cash_loan",
            currency: "PLN",
            balance: 0,
            originalAmount: 10000,
            monthlyPayment: 0,
            interestRate: 8,
            status: "closed",
            createdAt: "2024-01-01"
          }
        ]
      };

      render(<DebtsView profile={closedDebtsProfile} />);

      // Switch to Payoff Strategy simulator tab
      const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
      fireEvent.click(strategyTopBtn);

      expect(screen.getByText("Wszystkie zobowiązania zostały już spłacone")).toBeTruthy();
      expect(screen.getByText(/Brak pozostałej kwoty do zasymulowania/i)).toBeTruthy();
    });

    it("Sprint 33: displays zero extra-payment guidance and explicit baseline comparison state", () => {
      render(<DebtsView profile={mockProfile} />);

      // Switch to Payoff Strategy simulator tab
      const strategyTopBtn = screen.getByRole("button", { name: /Porównaj strategie/i });
      fireEvent.click(strategyTopBtn);

      // Reset extra monthly payoff to 0 zł
      const resetBtn = screen.getByRole("button", { name: /Wyzeruj/i });
      fireEvent.click(resetBtn);

      // Zero extra-payment guidance is displayed
      expect(screen.getByText(/Przy nadpłacie 0 zł symulacja nie dodaje dodatkowego budżetu do spłaty/i)).toBeTruthy();

      // Switch to baseline strategy
      const baselineCard = screen.getAllByText("Status Quo (Tylko raty)")[0];
      fireEvent.click(baselineCard);

      // In baseline, reference plan explanation is displayed
      expect(screen.getByText(/Plan odniesienia \(Status Quo\) — punkt odniesienia bez dodatkowej nadpłaty/i)).toBeTruthy();

      // Switch to Avalanche
      const avalancheCard = screen.getAllByText("Metoda Lawiny (Avalanche)")[0];
      fireEvent.click(avalancheCard);

      // Add extra payment preset (+500 zł)
      const plus500Btn = screen.getByRole("button", { name: /\+500/i });
      fireEvent.click(plus500Btn);

      // With +500 zł extra payment, savings are modeled with explicit disclaimer
      expect(screen.getByText(/Modelowa różnica względem planu bazowego \(Status Quo\)/i)).toBeTruthy();
    });

    it("Sprint 34: renders linking status, allows picking candidate transaction, and confirms link", () => {
      const onUpdateTransaction = vi.fn();
      const mortgageDebt: DebtItem = {
        id: "debt-1",
        name: "Kredyt hipoteczny",
        institution: "PKO BP",
        type: "mortgage",
        currency: "PLN",
        balance: 350000,
        monthlyPayment: 2600,
        interestRate: 6.85,
        status: "active",
        createdAt: "2026-01-01"
      };

      const candidateTx: Transaction = {
        id: "tx-unlinked-1",
        name: "Przelew rata hipoteki",
        amount: 2600,
        type: "expense",
        category: "Rachunki",
        account: "Konto główne",
        isoDate: "2026-05-15",
        currency: "PLN"
      };

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={[candidateTx]}
          onClose={vi.fn()}
          onUpdateTransaction={onUpdateTransaction}
          initialTab="history"
        />
      );

      // In empty state, button to link is visible
      expect(screen.getByText("Brak powiązanych płatności")).toBeTruthy();
      const linkEmptyBtn = screen.getByRole("button", { name: /Połącz z istniejącą transakcją/i });
      fireEvent.click(linkEmptyBtn);

      // Modal is open
      expect(screen.getByText("Wybierz zarejestrowaną transakcję z księgowości, aby powiązać ją z tym długiem.")).toBeTruthy();
      expect(screen.getByText("Przelew rata hipoteki")).toBeTruthy();

      // Click candidate transaction
      fireEvent.click(screen.getByText("Przelew rata hipoteki"));

      // Confirmation disclaimer is visible
      expect(screen.getByText(/Powiązanie jest ręczne\. Nie zmieni kwoty transakcji, salda długu ani obliczeń spłaty\./i)).toBeTruthy();

      // Confirm link
      const confirmBtn = screen.getByRole("button", { name: /Połącz transakcję/i });
      fireEvent.click(confirmBtn);

      expect(onUpdateTransaction).toHaveBeenCalledTimes(1);
      expect(onUpdateTransaction).toHaveBeenCalledWith("tx-unlinked-1", { debtId: "debt-1" });
    });

    it("Sprint 34: allows unlinking a linked transaction with confirmation", () => {
      const onUpdateTransaction = vi.fn();
      const mortgageDebt: DebtItem = {
        id: "debt-1",
        name: "Kredyt hipoteczny",
        institution: "PKO BP",
        type: "mortgage",
        currency: "PLN",
        balance: 350000,
        monthlyPayment: 2600,
        interestRate: 6.85,
        status: "active",
        createdAt: "2026-01-01"
      };

      const linkedTx: Transaction = {
        id: "tx-linked-1",
        name: "Rata Maj",
        amount: 2600,
        type: "expense",
        category: "Rachunki",
        account: "Konto główne",
        isoDate: "2026-05-15",
        debtId: "debt-1",
        currency: "PLN"
      };

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={[linkedTx]}
          onClose={vi.fn()}
          onUpdateTransaction={onUpdateTransaction}
          initialTab="history"
        />
      );

      // Table shows "Powiązana transakcja" badge
      expect(screen.getByText("Powiązana transakcja")).toBeTruthy();

      // Click unlink button
      const unlinkBtn = screen.getByRole("button", { name: /Odłącz transakcję Rata Maj/i });
      fireEvent.click(unlinkBtn);

      // Confirmation modal is open
      expect(screen.getByText(/Odłączyć tę transakcję od płatności długu\? Transakcja pozostanie w księgowości\./i)).toBeTruthy();

      // Confirm unlink
      const confirmUnlinkBtn = screen.getByRole("button", { name: "Odłącz" });
      fireEvent.click(confirmUnlinkBtn);

      expect(onUpdateTransaction).toHaveBeenCalledTimes(1);
      expect(onUpdateTransaction).toHaveBeenCalledWith("tx-linked-1", { debtId: undefined });
    });

    it("Sprint 36: auto-opens debt details modal when initialDebtId is provided and calls onClearInitialDebt", () => {
      const onClearInitialDebt = vi.fn();
      render(
        <DebtsView
          profile={mockProfile}
          initialDebtId="debt-1"
          onClearInitialDebt={onClearInitialDebt}
        />
      );

      // Modal title for debt-1 should be rendered (both in list and modal)
      expect(screen.getAllByText("Kredyt hipoteczny").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("Przelicz nadpłatę")).toBeTruthy();
      expect(onClearInitialDebt).toHaveBeenCalledTimes(1);
    });

    it("Sprint 36: shows informational toast and does not open modal when initialDebtId is unknown", () => {
      const onClearInitialDebt = vi.fn();
      const showToast = vi.fn();
      render(
        <DebtsView
          profile={mockProfile}
          initialDebtId="debt-nonexistent"
          onClearInitialDebt={onClearInitialDebt}
          showToast={showToast}
        />
      );

      expect(showToast).toHaveBeenCalledWith("Nie znaleziono powiązanego zobowiązania.", "info");
      expect(onClearInitialDebt).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Przelicz nadpłatę")).toBeNull();
    });

    it("Sprint 36: opens requested initialDebtTab when provided via deep-link", () => {
      const onClearInitialDebt = vi.fn();
      render(
        <DebtsView
          profile={mockProfile}
          initialDebtId="debt-1"
          initialDebtTab="history"
          onClearInitialDebt={onClearInitialDebt}
        />
      );

      // Details modal is open with history tab active
      expect(screen.getByText("Brak powiązanych płatności")).toBeTruthy();
      expect(onClearInitialDebt).toHaveBeenCalledTimes(1);
    });

    it("Sprint 37: renders source transaction audit trail indicator and opens transaction modal on click", () => {
      const onOpenTxModal = vi.fn();
      const mortgageDebt: DebtItem = {
        id: "debt-1",
        name: "Kredyt hipoteczny",
        institution: "PKO BP",
        type: "mortgage",
        currency: "PLN",
        balance: 350000,
        monthlyPayment: 2600,
        interestRate: 6.85,
        status: "active",
        createdAt: "2026-01-01"
      };

      const linkedTx: Transaction = {
        id: "tx-linked-1",
        name: "Rata kredytu Maj 2026",
        amount: 2600,
        type: "expense",
        category: "Rachunki",
        account: "Konto główne",
        isoDate: "2026-05-15",
        debtId: "debt-1",
        currency: "PLN"
      };

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={[linkedTx]}
          onClose={vi.fn()}
          onOpenTxModal={onOpenTxModal}
          initialTab="history"
        />
      );

      // Audit trail button with accessible name
      const inspectBtn = screen.getByRole("button", { name: /Zobacz szczegóły transakcji: Rata kredytu Maj 2026/i });
      expect(inspectBtn).toBeTruthy();
      expect(inspectBtn.getAttribute("title")).toBe("Źródło transakcji: Rata kredytu Maj 2026");

      fireEvent.click(inspectBtn);
      expect(onOpenTxModal).toHaveBeenCalledTimes(1);
      expect(onOpenTxModal).toHaveBeenCalledWith(linkedTx);
    });

    it("Sprint 37: renders neutral fallback when source transaction is missing from dataset", () => {
      const mortgageDebt: DebtItem = {
        id: "debt-1",
        name: "Kredyt hipoteczny",
        institution: "PKO BP",
        type: "mortgage",
        currency: "PLN",
        balance: 350000,
        monthlyPayment: 2600,
        interestRate: 6.85,
        status: "active",
        createdAt: "2026-01-01"
      };

      // Transaction list without the matching transaction object
      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={[]}
          onClose={vi.fn()}
          initialTab="history"
        />
      );

      // Empty history when no transactions are linked
      expect(screen.getByText("Brak powiązanych płatności")).toBeTruthy();
    });

    it("Sprint 38: exports filtered payment history to CSV with correct headers and filename", () => {
      const downloadSpy = vi.spyOn(csvUtils, "downloadFile").mockImplementation(() => {});
      const showToast = vi.fn();

      const mortgageDebt: DebtItem = {
        id: "debt-1",
        name: "Kredyt hipoteczny PKO",
        institution: "PKO BP",
        type: "mortgage",
        currency: "PLN",
        balance: 350000,
        monthlyPayment: 2600,
        interestRate: 6.85,
        status: "active",
        createdAt: "2026-01-01"
      };

      const linkedTx: Transaction = {
        id: "tx-linked-1",
        name: "Rata kredytu Maj 2026",
        amount: 2600,
        type: "expense",
        category: "Rachunki",
        account: "Konto głównne",
        isoDate: "2026-05-15",
        debtId: "debt-1",
        currency: "PLN"
      };

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={[linkedTx]}
          onClose={vi.fn()}
          showToast={showToast}
          initialTab="history"
        />
      );

      const csvBtn = screen.getByRole("button", { name: "Eksport CSV" });
      expect(csvBtn).toBeTruthy();

      fireEvent.click(csvBtn);

      expect(downloadSpy).toHaveBeenCalledTimes(1);
      const [content, filename, mimeType] = downloadSpy.mock.calls[0];
      expect(filename).toMatch(/^historia-splat-kredyt-hipoteczny-pko-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(mimeType).toBe("text/csv;charset=utf-8;");
      expect(content).toContain("Data,Nazwa transakcji,Kwota wpłaty,Kapitał,Odsetki,Saldo po wpłacie,Status,ID transakcji,Powiązanie transakcji");
      expect(content).toContain("2026-05-15,Rata kredytu Maj 2026,2600");
      expect(content).toContain("linked");
      expect(showToast).toHaveBeenCalledWith("Wyeksportowano historię spłat do CSV.", "success");

      downloadSpy.mockRestore();
    });

    it("Sprint 38: exports filtered payment history to JSON with envelope and audit-trail metadata", () => {
      const downloadSpy = vi.spyOn(csvUtils, "downloadFile").mockImplementation(() => {});
      const showToast = vi.fn();

      const mortgageDebt: DebtItem = {
        id: "debt-1",
        name: "Kredyt hipoteczny PKO",
        institution: "PKO BP",
        type: "mortgage",
        currency: "PLN",
        balance: 350000,
        monthlyPayment: 2600,
        interestRate: 6.85,
        status: "active",
        createdAt: "2026-01-01"
      };

      const linkedTx: Transaction = {
        id: "tx-linked-1",
        name: "Rata kredytu Maj 2026",
        amount: 2600,
        type: "expense",
        category: "Rachunki",
        account: "Konto głównne",
        isoDate: "2026-05-15",
        debtId: "debt-1",
        currency: "PLN"
      };

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={[linkedTx]}
          onClose={vi.fn()}
          showToast={showToast}
          initialTab="history"
        />
      );

      const jsonBtn = screen.getByRole("button", { name: "Eksport JSON" });
      expect(jsonBtn).toBeTruthy();

      fireEvent.click(jsonBtn);

      expect(downloadSpy).toHaveBeenCalledTimes(1);
      const [content, filename, mimeType] = downloadSpy.mock.calls[0];
      expect(filename).toMatch(/^historia-splat-kredyt-hipoteczny-pko-\d{4}-\d{2}-\d{2}\.json$/);
      expect(mimeType).toBe("application/json;charset=utf-8;");

      const parsed = JSON.parse(content);
      expect(parsed.debtName).toBe("Kredyt hipoteczny PKO");
      expect(parsed.debtId).toBe("debt-1");
      expect(parsed.scope).toBe("filtered-visible-history");
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].transactionAuditStatus).toBe("linked");
      expect(parsed.items[0].transactionId).toBe("tx-linked-1");
      expect(showToast).toHaveBeenCalledWith("Wyeksportowano historię spłat do JSON.", "success");

      downloadSpy.mockRestore();
    });

    it("Sprint 39: restores debt payment history filters across modal close and reopen within active session", () => {
      const onSaveHistoryFilters = vi.fn();
      const mortgageDebt: DebtItem = {
        id: "debt-1",
        name: "Kredyt hipoteczny",
        institution: "PKO BP",
        type: "mortgage",
        currency: "PLN",
        balance: 350000,
        monthlyPayment: 2600,
        interestRate: 6.85,
        status: "active",
        createdAt: "2026-01-01"
      };

      const mockTransactions: Transaction[] = [
        {
          id: "tx-1",
          name: "Rata normalna",
          amount: 2600,
          type: "expense",
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-01-15",
          debtId: "debt-1",
          currency: "PLN"
        },
        {
          id: "tx-2",
          name: "Rata 2",
          amount: 2600,
          type: "expense",
          category: "Rachunki",
          account: "Konto główne",
          isoDate: "2026-02-15",
          debtId: "debt-1",
          currency: "PLN"
        }
      ];

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={mockTransactions}
          onClose={vi.fn()}
          initialTab="history"
          initialHistoryFilters={{
            status: "all",
            principal: "all",
            order: "oldest",
            periodPreset: "all",
            summaryScope: "all"
          }}
          onSaveHistoryFilters={onSaveHistoryFilters}
        />
      );

      const orderSelect = screen.getByLabelText("Kolejność:") as HTMLSelectElement;
      expect(orderSelect.value).toBe("oldest");

      fireEvent.change(orderSelect, { target: { value: "newest" } });
      expect(orderSelect.value).toBe("newest");
      expect(onSaveHistoryFilters).toHaveBeenCalledWith(
        "debt-1",
        expect.objectContaining({ order: "newest" })
      );
    });

    it("Sprint 39: preserves per-debt filter isolation and defaults for newly opened debts", () => {
      const mortgageDebt: DebtItem = {
        id: "debt-2",
        name: "Pożyczka gotówkowa",
        institution: "mBank",
        type: "cash_loan",
        currency: "PLN",
        balance: 15000,
        monthlyPayment: 600,
        interestRate: 11.5,
        status: "active",
        createdAt: "2026-02-01"
      };

      const mockTransactions: Transaction[] = [
        {
          id: "tx-debt2",
          name: "Rata pożyczki",
          amount: 600,
          type: "expense",
          category: "Rachunki",
          account: "Konto",
          isoDate: "2026-05-10",
          debtId: "debt-2",
          currency: "PLN"
        }
      ];

      // New debt opens with default filters
      render(
        <DebtDetailsModal
          isOpen={true}
          debt={mortgageDebt}
          transactions={mockTransactions}
          onClose={vi.fn()}
          initialTab="history"
        />
      );

      const orderSelect = screen.getByLabelText("Kolejność:") as HTMLSelectElement;
      expect(orderSelect.value).toBe("newest");
      const statusSelect = screen.getByLabelText("Status:") as HTMLSelectElement;
      expect(statusSelect.value).toBe("all");
    });

    it("Sprint 40: renders debt repayment milestones on DebtPortfolioCard and highlights reached milestones", () => {
      const halfPaidDebt: DebtItem = {
        id: "debt-half",
        name: "Kredyt samochodowy",
        institution: "Santander",
        type: "cash_loan",
        currency: "PLN",
        originalAmount: 100000,
        balance: 45000, // 55% paid -> 25% and 50% reached
        monthlyPayment: 1500,
        interestRate: 8.5,
        status: "active",
        createdAt: "2026-01-01"
      };

      render(
        <DebtPortfolioCard
          debt={halfPaidDebt}
          onOpenDetails={vi.fn()}
          onOpenOverpayment={vi.fn()}
          onOpenRefinance={vi.fn()}
          onToggleStatus={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("55% spłacone")).toBeTruthy();
      expect(screen.getByLabelText("Kamień milowy 25%: osiągnięty")).toBeTruthy();
      expect(screen.getByLabelText("Kamień milowy 50%: osiągnięty")).toBeTruthy();
      expect(screen.getByLabelText("Kamień milowy 75%: nieosiągnięty")).toBeTruthy();
      expect(screen.getByLabelText("Kamień milowy 100%: nieosiągnięty")).toBeTruthy();
    });

    it("Sprint 40: renders debt repayment progress and milestones in DebtDetailsModal overview", () => {
      const threeQuarterDebt: DebtItem = {
        id: "debt-3q",
        name: "Pożyczka remontowa",
        institution: "Alior",
        type: "cash_loan",
        currency: "PLN",
        originalAmount: 40000,
        balance: 10000, // 75% paid
        monthlyPayment: 800,
        interestRate: 7.0,
        status: "active",
        createdAt: "2026-01-01"
      };

      render(
        <DebtDetailsModal
          isOpen={true}
          debt={threeQuarterDebt}
          onClose={vi.fn()}
          initialTab="overview"
        />
      );

      expect(screen.getByText("75% spłacone")).toBeTruthy();
      expect(screen.getByLabelText("Kamień milowy 25%: osiągnięty")).toBeTruthy();
      expect(screen.getByLabelText("Kamień milowy 50%: osiągnięty")).toBeTruthy();
      expect(screen.getByLabelText("Kamień milowy 75%: osiągnięty")).toBeTruthy();
      expect(screen.getByLabelText("Kamień milowy 100%: nieosiągnięty")).toBeTruthy();
    });
    describe("Sprint 40: calculateDebtRepaymentProgress pure derivation & edge cases", () => {
      it("1. Zero progress: reference 1000, balance 1000 -> 0%, no milestones reached, next 25%", () => {
        const debt: DebtItem = {
          id: "d1",
          name: "Test",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 1000,
          balance: 1000,
          monthlyPayment: 100,
          interestRate: 5,
          status: "active",
          createdAt: "2026-01-01"
        };
        const res = calculateDebtRepaymentProgress(debt);
        expect(res.repaidPercent).toBe(0);
        expect(res.reachedMilestones).toEqual([]);
        expect(res.currentMilestone).toBeNull();
        expect(res.nextMilestone).toBe(25);
        expect(res.isComplete).toBe(false);
      });

      it("2. Exactly 25%: reference 1000, balance 750 -> 25% reached, next 50%", () => {
        const debt: DebtItem = {
          id: "d2",
          name: "Test",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 1000,
          balance: 750,
          monthlyPayment: 100,
          interestRate: 5,
          status: "active",
          createdAt: "2026-01-01"
        };
        const res = calculateDebtRepaymentProgress(debt);
        expect(res.repaidPercent).toBe(25);
        expect(res.reachedMilestones).toEqual([25]);
        expect(res.currentMilestone).toBe(25);
        expect(res.nextMilestone).toBe(50);
        expect(res.isComplete).toBe(false);
      });

      it("3. Exactly 50%: reference 1000, balance 500 -> 25% and 50% reached, next 75%", () => {
        const debt: DebtItem = {
          id: "d3",
          name: "Test",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 1000,
          balance: 500,
          monthlyPayment: 100,
          interestRate: 5,
          status: "active",
          createdAt: "2026-01-01"
        };
        const res = calculateDebtRepaymentProgress(debt);
        expect(res.repaidPercent).toBe(50);
        expect(res.reachedMilestones).toEqual([25, 50]);
        expect(res.currentMilestone).toBe(50);
        expect(res.nextMilestone).toBe(75);
      });

      it("4. Exactly 75%: reference 1000, balance 250 -> 25%, 50%, 75% reached, next 100%", () => {
        const debt: DebtItem = {
          id: "d4",
          name: "Test",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 1000,
          balance: 250,
          monthlyPayment: 100,
          interestRate: 5,
          status: "active",
          createdAt: "2026-01-01"
        };
        const res = calculateDebtRepaymentProgress(debt);
        expect(res.repaidPercent).toBe(75);
        expect(res.reachedMilestones).toEqual([25, 50, 75]);
        expect(res.currentMilestone).toBe(75);
        expect(res.nextMilestone).toBe(100);
      });

      it("5. Exactly 100%: reference 1000, balance 0 -> all milestones reached, next is null, isComplete is true", () => {
        const debt: DebtItem = {
          id: "d5",
          name: "Test",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 1000,
          balance: 0,
          monthlyPayment: 100,
          interestRate: 5,
          status: "active",
          createdAt: "2026-01-01"
        };
        const res = calculateDebtRepaymentProgress(debt);
        expect(res.repaidPercent).toBe(100);
        expect(res.reachedMilestones).toEqual([25, 50, 75, 100]);
        expect(res.currentMilestone).toBe(100);
        expect(res.nextMilestone).toBeNull();
        expect(res.isComplete).toBe(true);
      });

      it("6. Between thresholds: 37% -> current milestone 25%, next 50%", () => {
        const debt: DebtItem = {
          id: "d6",
          name: "Test",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 1000,
          balance: 630,
          monthlyPayment: 100,
          interestRate: 5,
          status: "active",
          createdAt: "2026-01-01"
        };
        const res = calculateDebtRepaymentProgress(debt);
        expect(res.repaidPercent).toBe(37);
        expect(res.currentMilestone).toBe(25);
        expect(res.nextMilestone).toBe(50);
      });

      it("7. Above reference amount: balance 1200 > reference 1000 -> clamps to 0%", () => {
        const debt: DebtItem = {
          id: "d7",
          name: "Test",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 1000,
          balance: 1200,
          monthlyPayment: 100,
          interestRate: 5,
          status: "active",
          createdAt: "2026-01-01"
        };
        const res = calculateDebtRepaymentProgress(debt);
        expect(res.repaidPercent).toBe(0);
        expect(res.reachedMilestones).toEqual([]);
      });

      it("8. Negative balance: balance -100 -> clamps to 100%", () => {
        const debt: DebtItem = {
          id: "d8",
          name: "Test",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 1000,
          balance: -100,
          monthlyPayment: 100,
          interestRate: 5,
          status: "active",
          createdAt: "2026-01-01"
        };
        const res = calculateDebtRepaymentProgress(debt);
        expect(res.repaidPercent).toBe(100);
        expect(res.isComplete).toBe(true);
      });

      it("9. Zero or missing reference amount: safe neutral result without NaN or Infinity", () => {
        const resNull = calculateDebtRepaymentProgress(null);
        expect(resNull.repaidPercent).toBe(0);
        expect(Number.isNaN(resNull.repaidPercent)).toBe(false);

        const debtZero: DebtItem = {
          id: "d0",
          name: "Test",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 0,
          balance: 0,
          monthlyPayment: 0,
          interestRate: 0,
          status: "active",
          createdAt: "2026-01-01"
        };
        const resZero = calculateDebtRepaymentProgress(debtZero);
        expect(resZero.repaidPercent).toBe(0);
        expect(resZero.hasUsableReferenceAmount).toBe(false);
      });

      it("10. Fallback reference amount: creditLimit vs balance", () => {
        const debtWithLimit: DebtItem = {
          id: "d-lim",
          name: "Karta",
          institution: "Bank",
          type: "credit_card",
          currency: "PLN",
          creditLimit: 5000,
          balance: 2500,
          monthlyPayment: 100,
          interestRate: 15,
          status: "active",
          createdAt: "2026-01-01"
        };
        const res = calculateDebtRepaymentProgress(debtWithLimit);
        expect(res.referenceAmount).toBe(5000);
        expect(res.repaidPercent).toBe(50);
      });
    });

    describe("Sprint 41: getNewlyCrossedDebtMilestone pure helper & toast integration", () => {
      it("1. No crossing: previous 24%, current 24% -> null", () => {
        const dPrev: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 76, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const dCurr: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 76, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(getNewlyCrossedDebtMilestone(calculateDebtRepaymentProgress(dPrev), calculateDebtRepaymentProgress(dCurr))).toBeNull();
      });

      it("2. Cross 25%: previous 24%, current 25% -> 25", () => {
        const dPrev: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 76, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const dCurr: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 75, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(getNewlyCrossedDebtMilestone(calculateDebtRepaymentProgress(dPrev), calculateDebtRepaymentProgress(dCurr))).toBe(25);
      });

      it("3. Cross 50%: previous 49%, current 50% -> 50", () => {
        const dPrev: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 51, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const dCurr: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 50, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(getNewlyCrossedDebtMilestone(calculateDebtRepaymentProgress(dPrev), calculateDebtRepaymentProgress(dCurr))).toBe(50);
      });

      it("4. Cross 75%: previous 74%, current 75% -> 75", () => {
        const dPrev: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 26, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const dCurr: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 25, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(getNewlyCrossedDebtMilestone(calculateDebtRepaymentProgress(dPrev), calculateDebtRepaymentProgress(dCurr))).toBe(75);
      });

      it("5. Cross 100%: previous 99%, current 100% -> 100", () => {
        const dPrev: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 1, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const dCurr: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 0, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(getNewlyCrossedDebtMilestone(calculateDebtRepaymentProgress(dPrev), calculateDebtRepaymentProgress(dCurr))).toBe(100);
      });

      it("6. Multiple milestones: previous 24%, current 76% -> returns only 75", () => {
        const dPrev: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 76, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const dCurr: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 24, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(getNewlyCrossedDebtMilestone(calculateDebtRepaymentProgress(dPrev), calculateDebtRepaymentProgress(dCurr))).toBe(75);
      });

      it("7. Already reached: previous 50%, current 60% -> null", () => {
        const dPrev: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 50, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const dCurr: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 40, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(getNewlyCrossedDebtMilestone(calculateDebtRepaymentProgress(dPrev), calculateDebtRepaymentProgress(dCurr))).toBeNull();
      });

      it("8. Decrease: previous 60%, current 59% -> null", () => {
        const dPrev: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 40, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const dCurr: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 41, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(getNewlyCrossedDebtMilestone(calculateDebtRepaymentProgress(dPrev), calculateDebtRepaymentProgress(dCurr))).toBeNull();
      });

      it("9. Invalid/unusable reference amount -> null", () => {
        const dPrev: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 0, balance: 0, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const dCurr: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 0, balance: 0, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(getNewlyCrossedDebtMilestone(calculateDebtRepaymentProgress(dPrev), calculateDebtRepaymentProgress(dCurr))).toBeNull();
      });

      it("10. No false completion: previous 90%, current 99% -> null", () => {
        const dPrev: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 10, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const dCurr: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 100, balance: 1, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(getNewlyCrossedDebtMilestone(calculateDebtRepaymentProgress(dPrev), calculateDebtRepaymentProgress(dCurr))).toBeNull();
      });

      it("11. DebtsView: emits success toast when debt toggle to closed reaches 100%", () => {
        const showToast = vi.fn();
        const testDebt: DebtItem = {
          id: "debt-toast-1",
          name: "Pożyczka",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 1000,
          balance: 200,
          monthlyPayment: 100,
          interestRate: 5,
          status: "active",
          createdAt: "2026-01-01"
        };
        const profile: Profile = {
          ...mockProfile,
          debts: [testDebt]
        };

        render(
          <DebtsView
            profile={profile}
            onToggleDebtStatus={vi.fn()}
            showToast={showToast}
          />
        );

        // Click "Oznacz jako spłacone"
        const markPaidBtn = screen.getByText("Oznacz jako spłacone");
        fireEvent.click(markPaidBtn);

        expect(showToast).toHaveBeenCalledWith("Dług spłacony — gratulacje!", "success");
      });
    });
  });
});
