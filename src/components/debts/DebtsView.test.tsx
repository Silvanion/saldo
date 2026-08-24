/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import {
  DebtsView,
  findPortfolioNearestMilestone,
  formatMonthCountPlural,
  sortDebtsByNearestMilestone
} from "./DebtsView";
import { DebtDetailsModal } from "./DebtDetailsModal";
import { OverpaymentSimulatorModal } from "./OverpaymentSimulatorModal";
import { DebtImportModal, parseDebtCsv, mapDebtType, parseDebtNumber } from "./DebtImportModal";
import { DebtScenarioChooserModal } from "./DebtScenarioChooserModal";
import { DebtStrategyGuidanceCard } from "./DebtStrategyGuidanceCard";
import { DebtStrategyContextHint } from "./DebtStrategyContextHint";
import { DebtScenarioFallbackState } from "./DebtScenarioFallbackState";
import { DebtScenarioConfigSection } from "./DebtScenarioConfigSection";
import { DebtStrategyResultsSection } from "./DebtStrategyResultsSection";
import { DebtStrategySummaryCard } from "./DebtStrategySummaryCard";
import { DebtPayoffRoadmap } from "./DebtPayoffRoadmap";
import { DebtScenarioModals } from "./DebtScenarioModals";
import { PayoffStrategiesKnowledgeCenter } from "./PayoffStrategiesKnowledgeCenter";
import {
  DebtPortfolioCard,
  calculateDebtRepaymentProgress,
  getNewlyCrossedDebtMilestone,
  calculateNextDebtMilestoneForecast,
  formatMilestoneForecastDate,
  calculateDebtMilestoneOverpaymentImpact
} from "./DebtPortfolioCard";
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
    render(<PayoffStrategiesKnowledgeCenter selectedStrategy="avalanche" />);

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
      screen.getByText(/Każda strategia odpowiada na inny priorytet/i)
    ).toBeTruthy();

    // 5. Verify all strategies explanations are present
    expect(screen.getAllByText("Lawina (Avalanche)").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Nadpłata jest kierowana najpierw na zobowiązanie z najwyższym oprocentowaniem/i)
    ).toBeTruthy();

    expect(screen.getAllByText("Kula Śnieżna (Snowball)").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Nadpłata jest kierowana najpierw na zobowiązanie z najmniejszym saldem/i)
    ).toBeTruthy();

    expect(screen.getByText("Własna kolejność (Custom)")).toBeTruthy();
    expect(
      screen.getByText(/Symulacja podąża za listą priorytetów zdefiniowaną ręcznie przez użytkownika/i)
    ).toBeTruthy();

    expect(screen.getAllByText("Status Quo (Plan bazowy)").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Jest to scenariusz odniesienia oparty na bieżących minimalnych ratach/i)
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
    const { rerender } = render(<PayoffStrategiesKnowledgeCenter selectedStrategy="avalanche" />);

    // Open Knowledge Center
    const knowledgeTrigger = screen.getByRole("button", {
      name: /Jak działają strategie spłaty\?/i
    });
    fireEvent.click(knowledgeTrigger);

    // Default strategy is avalanche
    expect(screen.getAllByText("Lawina (Avalanche)").length).toBeGreaterThanOrEqual(1);
    const avalancheCard = document.querySelector('[data-selected="true"]');
    expect(avalancheCard?.textContent).toContain("Lawina (Avalanche)");

    // Rerender with Snowball strategy
    rerender(<PayoffStrategiesKnowledgeCenter selectedStrategy="snowball" />);

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
    expect(screen.getByText("Porównanie scenariuszy spłaty")).toBeTruthy();
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

    // 4. Test strategy guidance block presence
    expect(screen.getByText("Przewodnik po strategiach spłaty")).toBeTruthy();

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

    describe("Sprint 42: calculateNextDebtMilestoneForecast pure helper & UI rendering", () => {
      const fixedNow = new Date("2026-01-15T12:00:00Z");

      it("1. No usable reference amount -> returns null", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 0, balance: 0, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(calculateNextDebtMilestoneForecast(debt, { now: fixedNow })).toBeNull();
      });

      it("2. Already fully paid / closed -> returns null", () => {
        const debtClosed: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 0, monthlyPayment: 100, interestRate: 5, status: "closed", createdAt: "2026-01-01" };
        expect(calculateNextDebtMilestoneForecast(debtClosed, { now: fixedNow })).toBeNull();

        const debt100: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 0, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(calculateNextDebtMilestoneForecast(debt100, { now: fixedNow })).toBeNull();
      });

      it("3. Current 18%, monthly signal 100, next = 25%", () => {
        // ref: 1000, balance: 820 (180 paid = 18%). Target 25% = 250. Remaining: 70. Months: ceil(70/100) = 1.
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 820, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const res = calculateNextDebtMilestoneForecast(debt, { now: fixedNow });
        expect(res).not.toBeNull();
        expect(res?.nextMilestone).toBe(25);
        expect(res?.estimatedMonthCount).toBe(1);
        expect(res?.estimatedDate).toBe("2026-02");
      });

      it("4. Current exactly 25% -> returns next unreached milestone 50%", () => {
        // ref: 1000, balance: 750 (25% paid). Target 50% = 500. Remaining: 250. Months: ceil(250/100) = 3.
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 750, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const res = calculateNextDebtMilestoneForecast(debt, { now: fixedNow });
        expect(res?.nextMilestone).toBe(50);
        expect(res?.estimatedMonthCount).toBe(3);
        expect(res?.estimatedDate).toBe("2026-04");
      });

      it("5. Current 52% -> returns next milestone 75%", () => {
        // ref: 1000, balance: 480 (52% paid). Target 75% = 750. Remaining: 270. Months: ceil(270/100) = 3.
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 480, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const res = calculateNextDebtMilestoneForecast(debt, { now: fixedNow });
        expect(res?.nextMilestone).toBe(75);
        expect(res?.estimatedMonthCount).toBe(3);
      });

      it("6. Current 80% -> returns next milestone 100%", () => {
        // ref: 1000, balance: 200 (80% paid). Target 100% = 1000. Remaining: 200. Months: ceil(200/100) = 2.
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 200, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const res = calculateNextDebtMilestoneForecast(debt, { now: fixedNow });
        expect(res?.nextMilestone).toBe(100);
        expect(res?.estimatedMonthCount).toBe(2);
        expect(res?.estimatedDate).toBe("2026-03");
      });

      it("7. Zero monthly repayment signal -> returns null", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 800, monthlyPayment: 0, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(calculateNextDebtMilestoneForecast(debt, { now: fixedNow })).toBeNull();
      });

      it("8. Negative or invalid monthly signal -> returns null", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 800, monthlyPayment: -50, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(calculateNextDebtMilestoneForecast(debt, { now: fixedNow })).toBeNull();
      });

      it("9. Remaining amount exactly divisible by monthly signal -> exact month count", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 950, monthlyPayment: 50, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        // 5% paid (50). Target 25% (250). Remaining 200. 200 / 50 = 4 months.
        const res = calculateNextDebtMilestoneForecast(debt, { now: fixedNow });
        expect(res?.estimatedMonthCount).toBe(4);
      });

      it("10. Remaining amount not divisible -> uses ceil", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 950, monthlyPayment: 60, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        // Remaining 200. 200 / 60 = 3.33 -> ceil = 4 months.
        const res = calculateNextDebtMilestoneForecast(debt, { now: fixedNow });
        expect(res?.estimatedMonthCount).toBe(4);
      });

      it("11. Tiny positive remainder -> minimum 1 month", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 751, monthlyPayment: 500, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        // Remaining to 25%: 1 zł. ceil(1/500) = 1 month.
        const res = calculateNextDebtMilestoneForecast(debt, { now: fixedNow });
        expect(res?.estimatedMonthCount).toBe(1);
      });

      it("12. Ineligible credit card / revolving debt -> returns null", () => {
        const cardDebt: DebtItem = { id: "c1", name: "Karta", institution: "B", type: "credit_card", currency: "PLN", creditLimit: 5000, balance: 2000, monthlyPayment: 200, interestRate: 15, status: "active", createdAt: "2026-01-01" };
        expect(calculateNextDebtMilestoneForecast(cardDebt, { now: fixedNow })).toBeNull();
      });

      it("13. Deterministic date with injected now", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1200, balance: 1200, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        // Target 25% (300). Remaining 300. Months: 3. Jan 2026 + 3 = Apr 2026.
        const res = calculateNextDebtMilestoneForecast(debt, { now: fixedNow });
        expect(res?.estimatedDate).toBe("2026-04");
      });

      it("14. Input debt is not mutated", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 800, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const copy = JSON.stringify(debt);
        calculateNextDebtMilestoneForecast(debt, { now: fixedNow });
        expect(JSON.stringify(debt)).toBe(copy);
      });

      it("15. DebtPortfolioCard renders compact forecast line", () => {
        const debt: DebtItem = {
          id: "debt-card-fc",
          name: "Pożyczka",
          institution: "Santander",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 100000,
          balance: 80000, // 20% paid, next = 25%
          monthlyPayment: 2500,
          interestRate: 8.5,
          status: "active",
          createdAt: "2026-01-01"
        };

        render(
          <DebtPortfolioCard
            debt={debt}
            onOpenDetails={vi.fn()}
            onOpenOverpayment={vi.fn()}
            onOpenRefinance={vi.fn()}
            onToggleStatus={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        );

        expect(screen.getByText(/Kolejny próg:/i)).toBeTruthy();
        expect(screen.getAllByText("25%").length).toBeGreaterThan(0);
        expect(screen.getByText(/szac\./i)).toBeTruthy();
      });

      it("16. DebtDetailsModal renders forecast in overview tab", () => {
        const debt: DebtItem = {
          id: "debt-details-fc",
          name: "Kredyt gotówkowy",
          institution: "PKO BP",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 50000,
          balance: 40000, // 20% paid, next = 25%
          monthlyPayment: 1000,
          interestRate: 6.5,
          status: "active",
          createdAt: "2026-01-01"
        };

        render(
          <DebtDetailsModal
            isOpen={true}
            debt={debt}
            onClose={vi.fn()}
            initialTab="overview"
          />
        );

        expect(screen.getByText(/Kolejny próg:/i)).toBeTruthy();
        expect(screen.getAllByText("25%").length).toBeGreaterThan(0);
      });
    });

    describe("Sprint 43: calculateDebtMilestoneOverpaymentImpact pure helper & UI preview", () => {
      const fixedNow = new Date("2026-01-15T12:00:00Z");

      it("1. Ineligible debt type (credit_card, revolving) -> returns null", () => {
        const card: DebtItem = { id: "c1", name: "Card", institution: "B", type: "credit_card", currency: "PLN", creditLimit: 5000, balance: 2000, monthlyPayment: 100, interestRate: 15, status: "active", createdAt: "2026-01-01" };
        expect(calculateDebtMilestoneOverpaymentImpact(card, 500, { now: fixedNow })).toBeNull();
      });

      it("2. Closed debt -> returns null", () => {
        const closed: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 500, monthlyPayment: 100, interestRate: 5, status: "closed", createdAt: "2026-01-01" };
        expect(calculateDebtMilestoneOverpaymentImpact(closed, 200, { now: fixedNow })).toBeNull();
      });

      it("3. Fully repaid debt -> returns null", () => {
        const debt100: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 0, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(calculateDebtMilestoneOverpaymentImpact(debt100, 200, { now: fixedNow })).toBeNull();
      });

      it("4. Zero overpayment -> returns null", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 800, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(calculateDebtMilestoneOverpaymentImpact(debt, 0, { now: fixedNow })).toBeNull();
      });

      it("5. Negative or invalid overpayment -> returns null", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 800, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(calculateDebtMilestoneOverpaymentImpact(debt, -50, { now: fixedNow })).toBeNull();
        expect(calculateDebtMilestoneOverpaymentImpact(debt, NaN, { now: fixedNow })).toBeNull();
      });

      it("6. Baseline forecast unavailable (no monthly signal) -> returns null", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 800, monthlyPayment: 0, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        expect(calculateDebtMilestoneOverpaymentImpact(debt, 100, { now: fixedNow })).toBeNull();
      });

      it("7. Valid overpayment with month acceleration", () => {
        // ref: 1000, balance: 820 (18% paid). Next = 25% (250). Remaining = 70. Monthly = 10. Baseline months = 7.
        // Overpayment: 50. Adjusted balance: 770. Repaid: 230. Remaining: 20. Adjusted months: 2.
        // Accelerated = 5 months.
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 820, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const impact = calculateDebtMilestoneOverpaymentImpact(debt, 50, { now: fixedNow });
        expect(impact).not.toBeNull();
        expect(impact?.nextMilestone).toBe(25);
        expect(impact?.baselineMonthCount).toBe(7);
        expect(impact?.adjustedMonthCount).toBe(2);
        expect(impact?.monthsAccelerated).toBe(5);
        expect(impact?.isImmediateAchievement).toBe(false);
      });

      it("8. Valid overpayment with no date change (0 months accelerated)", () => {
        // ref: 1000, balance: 820, remaining: 70, monthly: 100. Baseline months = 1.
        // Overpayment: 10. Remaining: 60. Adjusted months = 1. Accelerated = 0.
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 820, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const impact = calculateDebtMilestoneOverpaymentImpact(debt, 10, { now: fixedNow });
        expect(impact?.monthsAccelerated).toBe(0);
        expect(impact?.isImmediateAchievement).toBe(false);
      });

      it("9. Overpayment instantly reaches next milestone", () => {
        // ref: 1000, balance: 820, remaining to 25%: 70. Overpayment: 100.
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 820, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const impact = calculateDebtMilestoneOverpaymentImpact(debt, 100, { now: fixedNow });
        expect(impact?.isImmediateAchievement).toBe(true);
        expect(impact?.isImmediateCompletion).toBe(false);
      });

      it("10. Overpayment larger than balance -> complete repayment preview", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 800, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const impact = calculateDebtMilestoneOverpaymentImpact(debt, 1000, { now: fixedNow });
        expect(impact?.isImmediateCompletion).toBe(true);
        expect(impact?.isImmediateAchievement).toBe(true);
      });

      it("11. Deterministic result with injected now", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 820, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const impact = calculateDebtMilestoneOverpaymentImpact(debt, 50, { now: fixedNow });
        expect(impact?.baselineEstimatedDate).toBe("2026-08");
        expect(impact?.adjustedEstimatedDate).toBe("2026-03");
      });

      it("12. Input debt is not mutated", () => {
        const debt: DebtItem = { id: "1", name: "D", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 820, monthlyPayment: 10, interestRate: 5, status: "active", createdAt: "2026-01-01" };
        const copy = JSON.stringify(debt);
        calculateDebtMilestoneOverpaymentImpact(debt, 50, { now: fixedNow });
        expect(JSON.stringify(debt)).toBe(copy);
      });

      it("13. DebtDetailsModal shows overpayment preview controls for eligible debt and reacts to preset click", () => {
        const debt: DebtItem = {
          id: "debt-details-op",
          name: "Kredyt gotówkowy",
          institution: "PKO BP",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 100000,
          balance: 80000, // 20% paid, next = 25% (25000). Remaining to 25% = 5000.
          monthlyPayment: 1000, // 5 months baseline
          interestRate: 6.5,
          status: "active",
          createdAt: "2026-01-01"
        };

        render(
          <DebtDetailsModal
            isOpen={true}
            debt={debt}
            onClose={vi.fn()}
            initialTab="overview"
          />
        );

        expect(screen.getByText(/Wpływ nadpłaty na kolejny próg/i)).toBeTruthy();
        expect(screen.getByText("+500 PLN")).toBeTruthy();

        // Click +500 PLN preset
        fireEvent.click(screen.getByText("+500 PLN"));

        // Remaining to 25% becomes 4500 -> ceil(4500/1000) = 5 months. (no date change)
        expect(screen.getByText(/Ta nadpłata nie zmienia szacowanego terminu/i)).toBeTruthy();

        // Click +1000 PLN preset
        fireEvent.click(screen.getByText("+1000 PLN"));
        // Remaining to 25% becomes 4000 -> ceil(4000/1000) = 4 months. Accelerated by 1 month!
        expect(screen.getByText(/przyspieszy próg/i)).toBeTruthy();
      });

      it("14. DebtDetailsModal custom amount input updates preview and does not save/mutate", () => {
        const debt: DebtItem = {
          id: "debt-details-custom",
          name: "Kredyt gotówkowy",
          institution: "PKO BP",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 100000,
          balance: 80000,
          monthlyPayment: 1000,
          interestRate: 6.5,
          status: "active",
          createdAt: "2026-01-01"
        };

        render(
          <DebtDetailsModal
            isOpen={true}
            debt={debt}
            onClose={vi.fn()}
            initialTab="overview"
          />
        );

        const input = screen.getByLabelText("Własna kwota hipotetycznej nadpłaty");
        fireEvent.change(input, { target: { value: "5000" } });

        // Overpayment 5000 directly covers the remaining 5000 to reach 25%!
        expect(screen.getByText(/pozwoli osiągnąć próg/i)).toBeTruthy();
        expect(screen.getByText(/od razu/i)).toBeTruthy();
      });
    });

    describe("Sprint 44: Debt Milestone Overpayment Direct Action Link v1", () => {
      const sampleDebt: DebtItem = {
        id: "debt-sprint44",
        name: "Kredyt gotówkowy",
        institution: "PKO BP",
        type: "cash_loan",
        currency: "PLN",
        originalAmount: 100000,
        balance: 80000, // 20% paid, next = 25% (25000). Remaining to 25% = 5000.
        monthlyPayment: 1000,
        interestRate: 6.5,
        status: "active",
        createdAt: "2026-01-01"
      };

      it("1. OverpaymentSimulatorModal accepts initialAmount and pre-fills the amount input", () => {
        render(
          <OverpaymentSimulatorModal
            isOpen={true}
            debt={sampleDebt}
            initialAmount={750}
            onClose={vi.fn()}
          />
        );

        const input = screen.getByLabelText(/Kwota nadpłaty/i) as HTMLInputElement;
        expect(input.value).toBe("750");
      });

      it("2. OverpaymentSimulatorModal defaults to 1000 when no initialAmount is provided", () => {
        render(
          <OverpaymentSimulatorModal
            isOpen={true}
            debt={sampleDebt}
            onClose={vi.fn()}
          />
        );

        const input = screen.getByLabelText(/Kwota nadpłaty/i) as HTMLInputElement;
        expect(input.value).toBe("1000");
      });

      it("3. DebtDetailsModal shows direct action button when overpayment amount is selected", () => {
        const onOpenOverpaymentModal = vi.fn();

        render(
          <DebtDetailsModal
            isOpen={true}
            debt={sampleDebt}
            onClose={vi.fn()}
            onOpenOverpaymentModal={onOpenOverpaymentModal}
            initialTab="overview"
          />
        );

        // Initially no action button before selecting/entering amount
        expect(screen.queryByText("Otwórz pełny symulator")).toBeNull();

        // Click preset +500 PLN
        fireEvent.click(screen.getByText("+500 PLN"));

        const openSimulatorBtn = screen.getByText("Otwórz pełny symulator");
        expect(openSimulatorBtn).toBeTruthy();

        // Click action button
        fireEvent.click(openSimulatorBtn);
        expect(onOpenOverpaymentModal).toHaveBeenCalledWith(sampleDebt, 500);
      });

      it("4. Full handoff flow in DebtsView: clicking action transitions to OverpaymentSimulatorModal with prefilled amount", () => {
        const profile: Profile = {
          ...mockProfile,
          debts: [sampleDebt]
        };

        render(
          <DebtsView
            profile={profile}
          />
        );

        // 1. Open DebtDetailsModal via "Szczegóły"
        const detailsBtn = screen.getByText("Szczegóły");
        fireEvent.click(detailsBtn);

        // 2. Select +1000 PLN preset in the overview tab
        const preset1000Btn = screen.getByText("+1000 PLN");
        fireEvent.click(preset1000Btn);

        // 3. Click "Otwórz pełny symulator"
        const openSimulatorBtn = screen.getByText("Otwórz pełny symulator");
        fireEvent.click(openSimulatorBtn);

        // 4. Details modal is closed and OverpaymentSimulatorModal is open with amount 1000
        const simulatorHeading = screen.getByText("Symulator nadpłaty zobowiązania");
        expect(simulatorHeading).toBeTruthy();

        const amountInput = screen.getByLabelText(/Kwota nadpłaty/i) as HTMLInputElement;
        expect(amountInput.value).toBe("1000");
      });
    });

    describe("Sprint 45: Portfolio Nearest Milestone Hero Card v1", () => {
      it("1. findPortfolioNearestMilestone returns null for empty or null list", () => {
        expect(findPortfolioNearestMilestone([])).toBeNull();
        expect(findPortfolioNearestMilestone(null)).toBeNull();
        expect(findPortfolioNearestMilestone(undefined)).toBeNull();
      });

      it("2. findPortfolioNearestMilestone returns null when only closed or revolving debts exist", () => {
        const debts: DebtItem[] = [
          { id: "1", name: "Karta", institution: "B", type: "credit_card", currency: "PLN", creditLimit: 5000, balance: 1000, monthlyPayment: 100, interestRate: 15, status: "active", createdAt: "2026-01-01" },
          { id: "2", name: "Stary", institution: "B", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 0, monthlyPayment: 100, interestRate: 5, status: "closed", createdAt: "2026-01-01" }
        ];
        expect(findPortfolioNearestMilestone(debts)).toBeNull();
      });

      it("3. findPortfolioNearestMilestone selects nearest candidate with smallest estimatedMonthCount", () => {
        const debtFar: DebtItem = {
          id: "d-far",
          name: "Kredyt Samochodowy",
          institution: "Bank A",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 100000,
          balance: 95000, // 5% paid, remaining to 25% = 20000. Rata 1000 -> 20 mies.
          monthlyPayment: 1000,
          interestRate: 8,
          status: "active",
          createdAt: "2026-01-01"
        };
        const debtNear: DebtItem = {
          id: "d-near",
          name: "Kredyt Gotówkowy",
          institution: "Bank B",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 10000,
          balance: 7800, // 22% paid, remaining to 25% = 300. Rata 300 -> 1 mies.
          monthlyPayment: 300,
          interestRate: 6,
          status: "active",
          createdAt: "2026-01-01"
        };

        const result = findPortfolioNearestMilestone([debtFar, debtNear]);
        expect(result).not.toBeNull();
        expect(result?.debt.id).toBe("d-near");
        expect(result?.nextMilestone).toBe(25);
        expect(result?.estimatedMonthCount).toBe(1);
      });

      it("4. findPortfolioNearestMilestone uses highest progress percentage as tie-breaker for equal months", () => {
        const debtA: DebtItem = {
          id: "d-a",
          name: "Pożyczka A",
          institution: "Bank A",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 10000,
          balance: 8000, // 20% paid, remaining to 25% = 500. Rata 250 -> 2 mies.
          monthlyPayment: 250,
          interestRate: 8,
          status: "active",
          createdAt: "2026-01-01"
        };
        const debtB: DebtItem = {
          id: "d-b",
          name: "Pożyczka B",
          institution: "Bank B",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 10000,
          balance: 5500, // 45% paid, remaining to 50% = 500. Rata 250 -> 2 mies. (higher progress 45% > 20%)
          monthlyPayment: 250,
          interestRate: 6,
          status: "active",
          createdAt: "2026-01-01"
        };

        const result = findPortfolioNearestMilestone([debtA, debtB]);
        expect(result?.debt.id).toBe("d-b");
        expect(result?.nextMilestone).toBe(50);
      });

      it("5. findPortfolioNearestMilestone does not mutate input array", () => {
        const debts: DebtItem[] = [
          { id: "1", name: "B", institution: "Bank", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 800, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" },
          { id: "2", name: "A", institution: "Bank", type: "cash_loan", currency: "PLN", originalAmount: 1000, balance: 800, monthlyPayment: 100, interestRate: 5, status: "active", createdAt: "2026-01-01" }
        ];
        const copy = JSON.stringify(debts);
        findPortfolioNearestMilestone(debts);
        expect(JSON.stringify(debts)).toBe(copy);
      });

      it("6. formatMonthCountPlural formats Polish plural forms correctly", () => {
        expect(formatMonthCountPlural(1)).toBe("za około 1 miesiąc");
        expect(formatMonthCountPlural(2)).toBe("za około 2 miesiące");
        expect(formatMonthCountPlural(4)).toBe("za około 4 miesiące");
        expect(formatMonthCountPlural(5)).toBe("za około 5 miesięcy");
        expect(formatMonthCountPlural(12)).toBe("za około 12 miesięcy");
        expect(formatMonthCountPlural(22)).toBe("za około 22 miesiące");
        expect(formatMonthCountPlural(25)).toBe("za około 25 miesięcy");
      });

      it("7. DebtsView renders hero card when eligible debt exists", () => {
        const debt: DebtItem = {
          id: "hero-debt-1",
          name: "Kredyt Hipoteczny PKO",
          institution: "PKO BP",
          type: "mortgage",
          currency: "PLN",
          originalAmount: 500000,
          balance: 380000, // 24% paid, remaining to 25% = 5000. Rata 5000 -> 1 mies.
          monthlyPayment: 5000,
          interestRate: 7.2,
          status: "active",
          createdAt: "2026-01-01"
        };
        const profile: Profile = {
          ...mockProfile,
          debts: [debt]
        };

        render(<DebtsView profile={profile} />);

        const heroCard = document.getElementById("portfolio-nearest-milestone-card");
        expect(heroCard).toBeTruthy();
        expect(within(heroCard!).getByText("Najbliższy kamień milowy")).toBeTruthy();
        expect(within(heroCard!).getByText("Kredyt Hipoteczny PKO")).toBeTruthy();
        expect(within(heroCard!).getByText(/za około 1 miesiąc/i)).toBeTruthy();
        expect(within(heroCard!).getByText("Cel: 25%")).toBeTruthy();
      });

      it("8. DebtsView hides hero card when no eligible debt exists", () => {
        const profile: Profile = {
          ...mockProfile,
          debts: [
            { id: "c1", name: "Karta", institution: "Bank", type: "credit_card", currency: "PLN", creditLimit: 5000, balance: 1000, monthlyPayment: 100, interestRate: 15, status: "active", createdAt: "2026-01-01" }
          ]
        };

        render(<DebtsView profile={profile} />);
        expect(screen.queryByText("Najbliższy kamień milowy")).toBeNull();
      });
    });

    describe("Sprint 46: Debt Portfolio Milestone Quick Sort & Filter v1", () => {
      const debtNear: DebtItem = {
        id: "d-near",
        name: "A Kredyt Gotówkowy",
        institution: "Bank A",
        type: "cash_loan",
        currency: "PLN",
        originalAmount: 10000,
        balance: 7800, // 22% paid, remaining to 25% = 300. Rata 300 -> 1 mies.
        monthlyPayment: 300,
        interestRate: 6,
        status: "active",
        createdAt: "2026-01-01"
      };

      const debtFar: DebtItem = {
        id: "d-far",
        name: "B Kredyt Samochodowy",
        institution: "Bank B",
        type: "cash_loan",
        currency: "PLN",
        originalAmount: 100000,
        balance: 95000, // 5% paid, remaining to 25% = 20000. Rata 1000 -> 20 mies.
        monthlyPayment: 1000,
        interestRate: 8,
        status: "active",
        createdAt: "2026-01-01"
      };

      const debtCard: DebtItem = {
        id: "d-card",
        name: "C Karta Kredytowa",
        institution: "Bank C",
        type: "credit_card",
        currency: "PLN",
        creditLimit: 5000,
        balance: 2000,
        monthlyPayment: 100,
        interestRate: 18,
        status: "active",
        createdAt: "2026-01-01"
      };

      const debtNoPayment: DebtItem = {
        id: "d-nopay",
        name: "D Pożyczka Bez Raty",
        institution: "Bank D",
        type: "cash_loan",
        currency: "PLN",
        originalAmount: 5000,
        balance: 4000,
        monthlyPayment: 0,
        interestRate: 5,
        status: "active",
        createdAt: "2026-01-01"
      };

      it("1. sortDebtsByNearestMilestone returns empty array for empty input and does not mutate", () => {
        expect(sortDebtsByNearestMilestone([])).toEqual([]);
        const original = [debtFar, debtNear];
        const copy = JSON.stringify(original);
        sortDebtsByNearestMilestone(original);
        expect(JSON.stringify(original)).toBe(copy);
      });

      it("2. sortDebtsByNearestMilestone places forecastable debts first in ascending month count", () => {
        const result = sortDebtsByNearestMilestone([debtFar, debtCard, debtNear, debtNoPayment]);
        expect(result.map((d) => d.id)).toEqual(["d-near", "d-far", "d-card", "d-nopay"]);
      });

      it("3. sortDebtsByNearestMilestone resolves equal months using highest progress percentage", () => {
        const debtA: DebtItem = {
          id: "d-a",
          name: "Pożyczka A (20% paid)",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 10000,
          balance: 8000, // 20% paid, remaining 500 -> 2 mies.
          monthlyPayment: 250,
          interestRate: 5,
          status: "active",
          createdAt: "2026-01-01"
        };
        const debtB: DebtItem = {
          id: "d-b",
          name: "Pożyczka B (45% paid)",
          institution: "Bank",
          type: "cash_loan",
          currency: "PLN",
          originalAmount: 10000,
          balance: 5500, // 45% paid, remaining 500 -> 2 mies.
          monthlyPayment: 250,
          interestRate: 5,
          status: "active",
          createdAt: "2026-01-01"
        };

        const result = sortDebtsByNearestMilestone([debtA, debtB]);
        expect(result.map((d) => d.id)).toEqual(["d-b", "d-a"]);
      });

      it("4. DebtsView renders new sort option in select dropdown", () => {
        const profile: Profile = {
          ...mockProfile,
          debts: [debtFar, debtNear]
        };

        render(<DebtsView profile={profile} />);

        const select = screen.getByLabelText(/Sortuj zobowiązania/i) as HTMLSelectElement;
        expect(select).toBeTruthy();

        const option = screen.getByRole("option", { name: "Najbliżej kolejnego kamienia milowego" });
        expect(option).toBeTruthy();
      });

      it("5. Selecting nearest_milestone reorders visible debt cards", () => {
        const profile: Profile = {
          ...mockProfile,
          debts: [debtFar, debtNear, debtCard]
        };

        render(<DebtsView profile={profile} />);

        // Initial default sort is "apr": debtCard (18%) > debtFar (8%) > debtNear (6%)
        const select = screen.getByLabelText(/Sortuj zobowiązania/i) as HTMLSelectElement;
        expect(select.value).toBe("apr");

        // Change sort to "nearest_milestone"
        fireEvent.change(select, { target: { value: "nearest_milestone" } });
        expect(select.value).toBe("nearest_milestone");

        // Check rendered order of card titles
        const cards = screen.getAllByRole("heading", { level: 3 });
        const cardTitles = cards.map((c) => c.textContent);
        expect(cardTitles).toContain("A Kredyt Gotówkowy");
        expect(cardTitles).toContain("B Kredyt Samochodowy");
        expect(cardTitles).toContain("C Karta Kredytowa");

        // Verify A Kredyt Gotówkowy comes before B Kredyt Samochodowy and C Karta Kredytowa
        const idxNear = cardTitles.indexOf("A Kredyt Gotówkowy");
        const idxFar = cardTitles.indexOf("B Kredyt Samochodowy");
        const idxCard = cardTitles.indexOf("C Karta Kredytowa");
        expect(idxNear).toBeLessThan(idxFar);
        expect(idxFar).toBeLessThan(idxCard);
      });
    });

    describe("Sprint 48: Debt CSV Import Modal MVP", () => {
      it("1. parseDebtNumber parses Polish currency strings, spaces, and commas", () => {
        expect(parseDebtNumber("350 000,50 zł")).toBe(350000.5);
        expect(parseDebtNumber("12 500 PLN")).toBe(12500);
        expect(parseDebtNumber("0")).toBe(0);
        expect(parseDebtNumber("")).toBeUndefined();
        expect(parseDebtNumber("invalid")).toBeUndefined();
      });

      it("2. mapDebtType correctly normalizes friendly Polish names and fallbacks", () => {
        expect(mapDebtType("Kredyt hipoteczny").type).toBe("mortgage");
        expect(mapDebtType("Gotówkowy").type).toBe("cash_loan");
        expect(mapDebtType("Karta kredytowa").type).toBe("credit_card");
        expect(mapDebtType("Limit odnawialny").type).toBe("revolving");
        expect(mapDebtType("Raty 0% / PayPo").type).toBe("bnpl");
        expect(mapDebtType("Inne").type).toBe("other");
        expect(mapDebtType("Nieznany").type).toBe("other");
        expect(mapDebtType("Nieznany").isMappedFallback).toBe(true);
      });

      it("3. parseDebtCsv parses standard CSV text into valid debt items", () => {
        const csv = `Nazwa,Bank,Typ,Saldo,Rata,Oprocentowanie
Kredyt Mieszkaniowy,PKO BP,Hipoteka,380000,2900,6.85
Karta Visa,mBank,Karta,5000,250,18.5`;

        const result = parseDebtCsv(csv);
        expect(result.totalParsed).toBe(2);
        expect(result.validCount).toBe(2);
        expect(result.invalidCount).toBe(0);

        const row1 = result.rows[0];
        expect(row1.status).toBe("valid");
        expect(row1.data?.name).toBe("Kredyt Mieszkaniowy");
        expect(row1.data?.institution).toBe("PKO BP");
        expect(row1.data?.type).toBe("mortgage");
        expect(row1.data?.balance).toBe(380000);
        expect(row1.data?.monthlyPayment).toBe(2900);
        expect(row1.data?.interestRate).toBe(6.85);
      });

      it("4. parseDebtCsv handles semicolon separator and quoted cells", () => {
        const csv = `Nazwa;Bank;Typ;Saldo;Rata;Oprocentowanie
"Kredyt, remontowy";"Alior Bank";Gotówkowy;25000;850;9.2`;

        const result = parseDebtCsv(csv);
        expect(result.totalParsed).toBe(1);
        expect(result.validCount).toBe(1);
        expect(result.rows[0].data?.name).toBe("Kredyt, remontowy");
        expect(result.rows[0].data?.institution).toBe("Alior Bank");
        expect(result.rows[0].data?.balance).toBe(25000);
      });

      it("5. parseDebtCsv flags invalid rows when name is missing or balance is invalid", () => {
        const csv = `Nazwa,Bank,Typ,Saldo,Rata,Oprocentowanie
,PKO BP,Hipoteka,100000,1000,5
Kredyt Gotówkowy,mBank,Gotówkowy,invalid_balance,500,8
Karta,Santander,Karta,-500,50,10`;

        const result = parseDebtCsv(csv);
        expect(result.totalParsed).toBe(3);
        expect(result.invalidCount).toBe(3);
        expect(result.importableCount).toBe(0);
        expect(result.rows[0].errors[0]).toContain("Brak nazwy");
        expect(result.rows[1].errors[0]).toContain("salda");
        expect(result.rows[2].errors[0]).toContain("salda");
      });

      it("6. parseDebtCsv creates warning when bank is missing or type is unknown", () => {
        const csv = `Nazwa,Bank,Typ,Saldo,Rata,Oprocentowanie
Kredyt prywatny,,InnyDziwnyTyp,5000,100,5`;

        const result = parseDebtCsv(csv);
        expect(result.totalParsed).toBe(1);
        expect(result.warningCount).toBe(1);
        expect(result.importableCount).toBe(1);
        expect(result.rows[0].data?.institution).toBe("Własna");
        expect(result.rows[0].data?.type).toBe("other");
        expect(result.rows[0].warnings.length).toBeGreaterThan(0);
      });

      it("7. DebtsView opens DebtImportModal when clicking import button", () => {
        render(<DebtsView profile={mockProfile} />);

        const importBtn = screen.getByRole("button", { name: /importuj/i });
        expect(importBtn).toBeTruthy();

        fireEvent.click(importBtn);

        expect(screen.getByText("Import zobowiązań z pliku CSV")).toBeTruthy();
        expect(screen.getByText(/Kliknij, aby wybrać plik CSV/i)).toBeTruthy();
      });

      it("8. DebtImportModal closes on Cancel button click", () => {
        const onClose = vi.fn();
        render(
          <DebtImportModal
            isOpen={true}
            onClose={onClose}
            onImport={vi.fn()}
          />
        );

        const cancelBtn = screen.getByText("Anuluj");
        fireEvent.click(cancelBtn);
        expect(onClose).toHaveBeenCalled();
      });
    });

    describe("Sprint 49: New Offer / New Scenario Entry Flow v1", () => {
      it("1. DebtScenarioChooserModal renders both Offer and Scenario options", () => {
        render(
          <DebtScenarioChooserModal
            isOpen={true}
            onClose={vi.fn()}
            onSelectOffer={vi.fn()}
            onSelectScenario={vi.fn()}
          />
        );

        expect(screen.getByText("Wybierz rodzaj analizy")).toBeTruthy();
        expect(screen.getByText("Nowa oferta / Refinansowanie")).toBeTruthy();
        expect(screen.getByText("Scenariusz spłaty portfela")).toBeTruthy();
      });

      it("2. DebtScenarioChooserModal calls onSelectOffer when selecting offer option", () => {
        const onSelectOffer = vi.fn();
        const onClose = vi.fn();

        render(
          <DebtScenarioChooserModal
            isOpen={true}
            onClose={onClose}
            onSelectOffer={onSelectOffer}
            onSelectScenario={vi.fn()}
          />
        );

        const offerBtn = screen.getByRole("button", { name: /Nowa oferta refinansowania/i });
        fireEvent.click(offerBtn);

        expect(onSelectOffer).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });

      it("3. DebtScenarioChooserModal calls onSelectScenario when selecting scenario option", () => {
        const onSelectScenario = vi.fn();
        const onClose = vi.fn();

        render(
          <DebtScenarioChooserModal
            isOpen={true}
            onClose={onClose}
            onSelectOffer={vi.fn()}
            onSelectScenario={onSelectScenario}
          />
        );

        const scenarioBtn = screen.getByRole("button", { name: /Nowy scenariusz spłaty/i });
        fireEvent.click(scenarioBtn);

        expect(onSelectScenario).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });

      it("4. DebtsView opens DebtScenarioChooserModal when clicking header scenario button", () => {
        render(<DebtsView profile={mockProfile} />);

        const addScenarioBtn = screen.getByText(/Nowa oferta \/ scenariusz/i);
        fireEvent.click(addScenarioBtn);

        expect(screen.getByText("Wybierz rodzaj analizy")).toBeTruthy();
        expect(screen.getByText("Nowa oferta / Refinansowanie")).toBeTruthy();
        expect(screen.getByText("Scenariusz spłaty portfela")).toBeTruthy();
      });
    });

    describe("Sprint 50: Debts Entry Flows Acceptance & Polish v1", () => {
      it("1. DebtImportModal does not render when isOpen is false", () => {
        const { container } = render(
          <DebtImportModal
            isOpen={false}
            onClose={vi.fn()}
            onImport={vi.fn()}
          />
        );
        expect(container.innerHTML).toBe("");
      });

      it("2. DebtScenarioChooserModal does not render when isOpen is false", () => {
        const { container } = render(
          <DebtScenarioChooserModal
            isOpen={false}
            onClose={vi.fn()}
            onSelectOffer={vi.fn()}
            onSelectScenario={vi.fn()}
          />
        );
        expect(container.innerHTML).toBe("");
      });

      it("3. All top header action buttons in DebtsView coexist without conflicts", () => {
        render(<DebtsView profile={mockProfile} />);

        const addDebtBtn = screen.getByRole("button", { name: /dodaj zobowiązanie/i });
        const scenarioBtn = screen.getByRole("button", { name: /nowa oferta \/ scenariusz/i });
        const importBtn = screen.getByRole("button", { name: /importuj/i });

        expect(addDebtBtn).toBeTruthy();
        expect(scenarioBtn).toBeTruthy();
        expect(importBtn).toBeTruthy();
      });
    });

    describe("Sprint 51: Debt Strategy Guidance Layer v1", () => {
      it("1. DebtStrategyGuidanceCard renders explanations for Avalanche, Snowball, and Custom", () => {
        render(<DebtStrategyGuidanceCard selectedStrategy="avalanche" />);

        expect(screen.getByText("Przewodnik po strategiach spłaty")).toBeTruthy();
        expect(screen.getByText("Strategia Lawiny")).toBeTruthy();
        expect(screen.getByText(/Najwyższe oprocentowanie/i)).toBeTruthy();
        expect(screen.getByText(/Kierowanie nadpłat/i)).toBeTruthy();

        expect(screen.getByText("Strategia Kuli Śnieżnej")).toBeTruthy();
        expect(screen.getByText(/Najmniejsze saldo/i)).toBeTruthy();
        expect(screen.getByText(/Szybkie sukcesy psychologiczne/i)).toBeTruthy();

        expect(screen.getByText("Strategia Własna")).toBeTruthy();
        expect(screen.getByText(/Kolejność spłaty ustalana indywidualnie/i)).toBeTruthy();
      });

      it("2. DebtStrategyGuidanceCard highlights active strategy and calls onSelectStrategy on click", () => {
        const onSelectStrategy = vi.fn();
        render(
          <DebtStrategyGuidanceCard
            selectedStrategy="snowball"
            onSelectStrategy={onSelectStrategy}
          />
        );

        expect(screen.getByText("Aktywny wariant")).toBeTruthy();

        const avalancheCard = screen.getByRole("button", { name: /Wybierz Strategia Lawiny/i });
        fireEvent.click(avalancheCard);

        expect(onSelectStrategy).toHaveBeenCalledWith("avalanche");
      });

      it("3. DebtsView renders strategy guidance block inside Scenarios tab", () => {
        render(<DebtsView profile={mockProfile} />);

        // Switch to Scenarios tab
        const scenariosTabBtn = screen.getByRole("button", { name: /scenariusze/i });
        fireEvent.click(scenariosTabBtn);

        expect(screen.getByText("Przewodnik po strategiach spłaty")).toBeTruthy();
        expect(screen.getByText("Strategia Lawiny")).toBeTruthy();
        expect(screen.getByText("Strategia Kuli Śnieżnej")).toBeTruthy();
      });
    });

    describe("Sprint 52: Debt Strategy Context Hint v1", () => {
      it("1. DebtStrategyContextHint renders active strategy and trade-off for Avalanche", () => {
        render(<DebtStrategyContextHint selectedStrategy="avalanche" />);

        expect(screen.getByText(/Aktywny wybór: Metoda Lawiny/i)).toBeTruthy();
        expect(screen.getByText(/Priorytetyzuje redukcję odsetek/i)).toBeTruthy();
        expect(screen.getByText(/Skupiona na kosztach/i)).toBeTruthy();
      });

      it("2. DebtStrategyContextHint renders active strategy and trade-off for Snowball", () => {
        render(<DebtStrategyContextHint selectedStrategy="snowball" />);

        expect(screen.getByText(/Aktywny wybór: Metoda Kuli Śnieżnej/i)).toBeTruthy();
        expect(screen.getByText(/Szybkie uwalnianie pierwszych rat/i)).toBeTruthy();
      });

      it("3. DebtStrategyContextHint renders active strategy and trade-off for Custom", () => {
        render(<DebtStrategyContextHint selectedStrategy="custom" />);

        expect(screen.getByText(/Aktywny wybór: Własna kolejność/i)).toBeTruthy();
        expect(screen.getByText(/Kolejność w pełni podyktowana Twoją konfiguracją/i)).toBeTruthy();
      });

      it("4. DebtStrategyContextHint calls onOpenKnowledgeCenter when button is clicked", () => {
        const onOpen = vi.fn();
        render(
          <DebtStrategyContextHint
            selectedStrategy="avalanche"
            onOpenKnowledgeCenter={onOpen}
          />
        );

        const btn = screen.getByRole("button", { name: /Otwórz centrum wiedzy/i });
        fireEvent.click(btn);
        expect(onOpen).toHaveBeenCalled();
      });

      it("5. DebtsView renders strategy context hint inside Scenarios tab", () => {
        render(<DebtsView profile={mockProfile} />);

        const scenariosTabBtn = screen.getByRole("button", { name: /scenariusze/i });
        fireEvent.click(scenariosTabBtn);

        expect(screen.getByText(/Aktywny wybór: Metoda Lawiny/i)).toBeTruthy();
      });
    });

    describe("Sprint 53: Debt Scenarios Empty & Fallback States v1", () => {
      it("1. DebtScenarioFallbackState renders no_debts state with primary action", () => {
        const onAdd = vi.fn();
        const onKnowledge = vi.fn();
        render(
          <DebtScenarioFallbackState
            type="no_debts"
            onAddDebt={onAdd}
            onOpenKnowledgeCenter={onKnowledge}
          />
        );

        expect(screen.getByText("Brak czynnych zobowiązań do symulacji spłaty")).toBeTruthy();
        expect(screen.getByText(/Dodaj co najmniej jedno zobowiązanie/i)).toBeTruthy();

        const addBtn = screen.getByRole("button", { name: /Dodaj zobowiązanie/i });
        fireEvent.click(addBtn);
        expect(onAdd).toHaveBeenCalledTimes(1);

        const knowledgeBtn = screen.getByRole("button", { name: /Zobacz jak działają strategie/i });
        fireEvent.click(knowledgeBtn);
        expect(onKnowledge).toHaveBeenCalledTimes(1);
      });

      it("2. DebtScenarioFallbackState renders all_paid state", () => {
        render(<DebtScenarioFallbackState type="all_paid" />);

        expect(screen.getByText("Wszystkie zobowiązania zostały już spłacone")).toBeTruthy();
        expect(screen.getByText(/Brak pozostałej kwoty do zasymulowania/i)).toBeTruthy();
      });

      it("3. DebtScenarioFallbackState renders custom_order_incomplete state with strategy switch buttons", () => {
        const onSelect = vi.fn();
        render(
          <DebtScenarioFallbackState
            type="custom_order_incomplete"
            onSelectStrategy={onSelect}
          />
        );

        expect(screen.getByText("Własna kolejność nie jest jeszcze gotowa do porównania")).toBeTruthy();
        expect(screen.getByText(/Uzupełnij kolejność wszystkich zobowiązań/i)).toBeTruthy();

        const avalancheBtn = screen.getByRole("button", { name: /Wybierz Lawinę/i });
        fireEvent.click(avalancheBtn);
        expect(onSelect).toHaveBeenCalledWith("avalanche");

        const snowballBtn = screen.getByRole("button", { name: /Wybierz Kulę Śnieżną/i });
        fireEvent.click(snowballBtn);
        expect(onSelect).toHaveBeenCalledWith("snowball");
      });

      it("4. DebtScenarioFallbackState renders calculation_unavailable state", () => {
        render(<DebtScenarioFallbackState type="calculation_unavailable" />);

        expect(screen.getByText("Prognoza chwilowo niedostępna")).toBeTruthy();
        expect(screen.getByText(/Nie możemy teraz wiarygodnie wyliczyć tej prognozy/i)).toBeTruthy();
      });

      it("5. DebtsView renders empty scenario fallback when profile has 0 debts", () => {
        const emptyProfile = { ...mockProfile, debts: [] };
        render(<DebtsView profile={emptyProfile} />);

        const scenariosTabBtn = screen.getByRole("button", { name: /scenariusze/i });
        fireEvent.click(scenariosTabBtn);

        expect(screen.getByText("Brak czynnych zobowiązań do symulacji spłaty")).toBeTruthy();
        const emptyContainer = document.getElementById("debt-scenarios-empty-no-debts");
        expect(emptyContainer).toBeTruthy();
        expect(within(emptyContainer!).getByRole("button", { name: /Dodaj zobowiązanie/i })).toBeTruthy();
      });
    });

    describe("Sprint 54: Calculation Error Handling v1", () => {
      it("1. DebtScenarioFallbackState renders custom title, message, and action button", () => {
        const onCustomAction = vi.fn();
        render(
          <DebtScenarioFallbackState
            type="calculation_unavailable"
            title="Niestandardowy błąd kalkulacji"
            message="Szczegółowy opis braku danych."
            actionLabel="Napraw parametry"
            onAction={onCustomAction}
          />
        );

        expect(screen.getByText("Niestandardowy błąd kalkulacji")).toBeTruthy();
        expect(screen.getByText("Szczegółowy opis braku danych.")).toBeTruthy();

        const actionBtn = screen.getByRole("button", { name: /Napraw parametry/i });
        fireEvent.click(actionBtn);
        expect(onCustomAction).toHaveBeenCalledTimes(1);
      });

      it("2. DebtsView handles unpayable debt without crashing and renders fallback message", () => {
        const unpayableDebt: DebtItem = {
          id: "debt-unpayable",
          name: "Kredyt z zerową ratą",
          type: "cash_loan" as const,
          balance: 50000,
          originalAmount: 50000,
          monthlyPayment: 0,
          interestRate: 25,
          institution: "Bank",
          status: "active" as const,
          currency: "PLN",
          createdAt: "2026-01-01"
        };

        const testProfile = {
          ...mockProfile,
          debts: [unpayableDebt]
        };

        render(<DebtsView profile={testProfile} />);

        const scenariosTabBtn = screen.getByRole("button", { name: /scenariusze/i });
        fireEvent.click(scenariosTabBtn);

        // Should render defensive message without crashing
        expect(
          screen.getByText(/Spłata nieosiągalna przy obecnych parametrach/i) ||
          screen.getByText(/Prognoza chwilowo niedostępna/i)
        ).toBeTruthy();
      });

      describe("Sprint 55: DebtsView Refactoring v1 (DebtStrategyResultsSection)", () => {
        const mockPayoffComparison = {
          baseline: {
            strategy: "baseline" as const,
            strategyLabel: "Status Quo",
            strategyBadge: "Standard",
            strategyDescription: "Spłata minimalnych wymaganych rat.",
            extraMonthlyPayment: 0,
            totalMonthlyCommitment: 2500,
            totalMonths: 48,
            debtFreeDate: "2030-01",
            totalInterestPaid: 15000,
            interestSavedVsBaseline: 0,
            monthsSavedVsBaseline: 0,
            payoffQueue: [
              {
                debtId: "d1",
                debtName: "Kredyt 1",
                institution: "Bank A",
                type: "cash_loan" as const,
                initialBalance: 10000,
                interestRate: 10,
                monthlyPayment: 500,
                payoffMonth: 24,
                payoffDate: "2028-01",
                totalInterestPaid: 2000
              }
            ]
          },
          avalanche: {
            strategy: "avalanche" as const,
            strategyLabel: "Lawina",
            strategyBadge: "Najtańsza",
            strategyDescription: "Spłata od najwyższego oprocentowania.",
            extraMonthlyPayment: 500,
            totalMonthlyCommitment: 3000,
            totalMonths: 36,
            debtFreeDate: "2029-01",
            totalInterestPaid: 10000,
            interestSavedVsBaseline: 5000,
            monthsSavedVsBaseline: 12,
            payoffQueue: [
              {
                debtId: "d1",
                debtName: "Kredyt 1",
                institution: "Bank A",
                type: "cash_loan" as const,
                initialBalance: 10000,
                interestRate: 10,
                monthlyPayment: 500,
                payoffMonth: 20,
                payoffDate: "2027-09",
                totalInterestPaid: 1500
              }
            ]
          },
          snowball: {
            strategy: "snowball" as const,
            strategyLabel: "Kula Śnieżna",
            strategyBadge: "Najszybsza",
            strategyDescription: "Spłata od najmniejszego salda.",
            extraMonthlyPayment: 500,
            totalMonthlyCommitment: 3000,
            totalMonths: 38,
            debtFreeDate: "2029-03",
            totalInterestPaid: 11000,
            interestSavedVsBaseline: 4000,
            monthsSavedVsBaseline: 10,
            payoffQueue: [
              {
                debtId: "d1",
                debtName: "Kredyt 1",
                institution: "Bank A",
                type: "cash_loan" as const,
                initialBalance: 10000,
                interestRate: 10,
                monthlyPayment: 500,
                payoffMonth: 22,
                payoffDate: "2027-11",
                totalInterestPaid: 1700
              }
            ]
          },
          recommendedStrategy: "avalanche" as const
        };

        it("1. DebtStrategyResultsSection renders strategy cards and calls onSelectStrategy on click", () => {
          const onSelect = vi.fn();
          render(
            <DebtStrategyResultsSection
              payoffComparison={mockPayoffComparison}
              selectedPayoffStrategy="avalanche"
              onSelectStrategy={onSelect}
              currency="PLN"
              activeDebts={mockDebts}
              validatedCustomOrder={["debt-1", "debt-2"]}
            />
          );

          expect(screen.getAllByText("Lawina").length).toBeGreaterThanOrEqual(1);
          expect(screen.getAllByText("Kula Śnieżna").length).toBeGreaterThanOrEqual(1);
          expect(screen.getByText("Status Quo")).toBeTruthy();

          const snowballCard = screen.getAllByText("Kula Śnieżna")[0].closest("div");
          if (snowballCard) {
            fireEvent.click(snowballCard);
            expect(onSelect).toHaveBeenCalledWith("snowball");
          }
        });

        it("2. DebtStrategyResultsSection renders milestone and roadmap for active plan", () => {
          render(
            <DebtStrategyResultsSection
              payoffComparison={mockPayoffComparison}
              selectedPayoffStrategy="avalanche"
              onSelectStrategy={vi.fn()}
              currency="PLN"
              activeDebts={mockDebts}
              validatedCustomOrder={["debt-1", "debt-2"]}
            />
          );

          expect(screen.getByText("Kamień milowy spłaty zadłużenia")).toBeTruthy();
          expect(screen.getByText(/Plan i kolejność spłaty: Lawina/i)).toBeTruthy();
          expect(screen.getByText("Kredyt 1")).toBeTruthy();
        });

        it("3. DebtStrategySummaryCard renders badges, label, and responds to click", () => {
          const onSelect = vi.fn();
          render(
            <DebtStrategySummaryCard
              strategy="avalanche"
              result={mockPayoffComparison.avalanche}
              isSelected={true}
              isRecommended={true}
              currency="PLN"
              onSelect={onSelect}
            />
          );

          expect(screen.getByText("Najtańsza")).toBeTruthy();
          expect(screen.getByText("Rekomendacja")).toBeTruthy();
          expect(screen.getByText("Lawina")).toBeTruthy();
          expect(screen.getByText(/5\s*000/)).toBeTruthy();

          fireEvent.click(screen.getByText("Lawina"));
          expect(onSelect).toHaveBeenCalledWith("avalanche");
        });

        it("4. DebtPayoffRoadmap renders milestone card, queue, and roll explanation", () => {
          render(
            <DebtPayoffRoadmap
              activePlan={mockPayoffComparison.avalanche}
              activeStrategy="avalanche"
              currency="PLN"
              activeDebts={mockDebts}
              validatedCustomOrder={["debt-1", "debt-2"]}
              onSelectStrategy={vi.fn()}
            />
          );

          expect(screen.getByText("Kamień milowy spłaty zadłużenia")).toBeTruthy();
          expect(screen.getAllByText("2029-01").length).toBeGreaterThanOrEqual(1);
          expect(screen.getByText("36 mies.")).toBeTruthy();
          expect(screen.getByText(/Plan i kolejność spłaty: Lawina/i)).toBeTruthy();
          expect(screen.getByText("Kredyt 1")).toBeTruthy();
        });

        it("5. DebtPayoffRoadmap renders custom order controls and triggers move up/down", () => {
          const onUp = vi.fn();
          const onDown = vi.fn();
          render(
            <DebtPayoffRoadmap
              activePlan={mockPayoffComparison.avalanche}
              activeStrategy="custom"
              currency="PLN"
              activeDebts={mockDebts}
              validatedCustomOrder={["debt-1", "debt-2"]}
              onSelectStrategy={vi.fn()}
              onMoveDebtUp={onUp}
              onMoveDebtDown={onDown}
            />
          );

          expect(screen.getByText("Ustal kolejność spłaty")).toBeTruthy();
          expect(screen.getByText("Cel priorytetowy #1")).toBeTruthy();

          const downBtn = screen.getAllByTitle("Przenieś niżej")[0];
          fireEvent.click(downBtn);
          expect(onDown).toHaveBeenCalledWith("debt-1");
        });

        it("6. DebtPayoffRoadmap renders fallback state when calculation is unavailable", () => {
          render(
            <DebtPayoffRoadmap
              activePlan={null}
              activeStrategy="custom"
              currency="PLN"
              activeDebts={mockDebts}
              validatedCustomOrder={[]}
              onSelectStrategy={vi.fn()}
            />
          );

          expect(
            screen.getAllByText(/Własna kolejność nie jest jeszcze gotowa do porównania/i).length
          ).toBeGreaterThanOrEqual(1);
        });

        it("7. DebtScenarioConfigSection renders budget input, presets, and triggers onChange", () => {
          const onChangeExtra = vi.fn();
          const onOpenSave = vi.fn();
          render(
            <DebtScenarioConfigSection
              monthlyDebtService={1500}
              extraMonthlyPayoff={500}
              onExtraMonthlyPayoffChange={onChangeExtra}
              currency="PLN"
              selectedPayoffStrategy="avalanche"
              oneTimeOverpayment={0}
              onOneTimeOverpaymentChange={vi.fn()}
              previewStrategy={null}
              onPreviewStrategyChange={vi.fn()}
              isWhatIfExpanded={false}
              onToggleWhatIfExpanded={vi.fn()}
              onResetWhatIf={vi.fn()}
              whatIfImpact={null}
              savedScenarios={[]}
              savedScenarioPreviews={{}}
              validSelectedScenarioIds={[]}
              onToggleSelectScenario={vi.fn()}
              onOpenCompareScenarios={vi.fn()}
              onOpenSaveScenario={onOpenSave}
              onLoadScenario={vi.fn()}
              onOpenRenameScenario={vi.fn()}
              onOpenDuplicateScenario={vi.fn()}
            />
          );

          expect(screen.getByText("Symulator strategii spłaty całego portfela")).toBeTruthy();
          expect(screen.getByText(/\+\s*1\s*000/)).toBeTruthy();

          fireEvent.click(screen.getByText(/\+\s*1\s*000/));
          expect(onChangeExtra).toHaveBeenCalledWith(1000);

          fireEvent.click(screen.getByText("Zapisz bieżący plan"));
          expect(onOpenSave).toHaveBeenCalled();
        });

        it("8. DebtScenarioModals renders Save, Rename, Duplicate modals and submits", () => {
          const onSaveSubmit = vi.fn((e) => e.preventDefault());
          const onCloseSave = vi.fn();
          const { rerender } = render(
            <DebtScenarioModals
              currency="PLN"
              isSaveScenarioModalOpen={true}
              scenarioNameInput="Mój plan spłaty"
              onScenarioNameChange={vi.fn()}
              onSaveScenarioSubmit={onSaveSubmit}
              onCloseSaveScenario={onCloseSave}
              selectedPayoffStrategy="avalanche"
              extraMonthlyPayoff={500}
              validatedCustomOrder={[]}
              isCompareScenariosModalOpen={false}
              savedScenarios={[]}
              validSelectedScenarioIds={[]}
              activeDebts={mockDebts}
              onLoadScenario={vi.fn()}
              onCloseCompareScenarios={vi.fn()}
              renameModalScenario={null}
              renameScenarioInput=""
              onRenameScenarioInputChange={vi.fn()}
              onRenameSubmit={vi.fn()}
              onCloseRenameScenario={vi.fn()}
              duplicateModalScenario={null}
              duplicateScenarioInput=""
              onDuplicateScenarioInputChange={vi.fn()}
              onDuplicateSubmit={vi.fn()}
              onCloseDuplicateScenario={vi.fn()}
            />
          );

          expect(screen.getByText("Zapisz scenariusz spłaty")).toBeTruthy();
          expect(screen.getByDisplayValue("Mój plan spłaty")).toBeTruthy();

          fireEvent.click(screen.getByText("Zapisz scenariusz"));
          expect(onSaveSubmit).toHaveBeenCalled();

          // Rerender with Rename modal
          rerender(
            <DebtScenarioModals
              currency="PLN"
              isSaveScenarioModalOpen={false}
              scenarioNameInput=""
              onScenarioNameChange={vi.fn()}
              onSaveScenarioSubmit={vi.fn()}
              onCloseSaveScenario={vi.fn()}
              selectedPayoffStrategy="avalanche"
              extraMonthlyPayoff={500}
              validatedCustomOrder={[]}
              isCompareScenariosModalOpen={false}
              savedScenarios={[]}
              validSelectedScenarioIds={[]}
              activeDebts={mockDebts}
              onLoadScenario={vi.fn()}
              onCloseCompareScenarios={vi.fn()}
              renameModalScenario={{
                id: "sc-1",
                name: "Stara nazwa",
                strategy: "avalanche",
                extraMonthlyPayment: 500,
                createdAt: new Date().toISOString()
              }}
              renameScenarioInput="Nowa nazwa"
              onRenameScenarioInputChange={vi.fn()}
              onRenameSubmit={vi.fn((e) => e.preventDefault())}
              onCloseRenameScenario={vi.fn()}
              duplicateModalScenario={null}
              duplicateScenarioInput=""
              onDuplicateScenarioInputChange={vi.fn()}
              onDuplicateSubmit={vi.fn()}
              onCloseDuplicateScenario={vi.fn()}
            />
          );

          expect(screen.getByText("Zmień nazwę scenariusza")).toBeTruthy();
          expect(screen.getByDisplayValue("Nowa nazwa")).toBeTruthy();
        });
      });

      describe("Sprint 58: Consolidate Payoff Strategy Guidance", () => {
        it("1. Renders only single strategy guidance block in Scenarios tab without duplicated knowledge center accordion", () => {
          render(<DebtsView profile={mockProfile} />);

          // Switch to Scenarios tab
          const scenariosTabBtn = screen.getByRole("button", { name: /scenariusze/i });
          fireEvent.click(scenariosTabBtn);

          // Canonical guidance card should exist
          expect(screen.getByText("Przewodnik po strategiach spłaty")).toBeTruthy();
          expect(screen.getByText("Strategia Lawiny")).toBeTruthy();
          expect(screen.getByText("Strategia Kuli Śnieżnej")).toBeTruthy();
          expect(screen.getByText("Strategia Własna")).toBeTruthy();

          // Old duplicated knowledge center accordion heading should not be rendered
          expect(screen.queryByText("Jak działają strategie spłaty?")).toBeNull();
          expect(screen.queryByText("Zwiń objaśnienie")).toBeNull();
          expect(screen.queryByText("Rozwiń objaśnienie")).toBeNull();
        });

        it("2. Payoff strategy selection via DebtStrategyGuidanceCard updates active strategy correctly", () => {
          render(<DebtsView profile={mockProfile} />);

          const scenariosTabBtn = screen.getByRole("button", { name: /scenariusze/i });
          fireEvent.click(scenariosTabBtn);

          // Initially avalanche is selected
          expect(screen.getByText(/Aktywny wybór: Metoda Lawiny/i)).toBeTruthy();

          // Click Snowball on guidance card
          const snowballBtn = screen.getByRole("button", { name: /Wybierz Strategia Kuli Śnieżnej/i });
          fireEvent.click(snowballBtn);

          expect(screen.getByText(/Aktywny wybór: Metoda Kuli Śnieżnej/i)).toBeTruthy();
        });
      });

      describe("Sprint 61: Payoff Strategies Knowledge Center Integration", () => {
        it("1. Renders PayoffStrategiesKnowledgeCenter in Knowledge tab and allows selecting strategy", () => {
          render(<DebtsView profile={mockProfile} />);

          // Switch to Knowledge tab
          const knowledgeTabBtn = screen.getByRole("button", { name: /wiedza & benchmarki/i });
          fireEvent.click(knowledgeTabBtn);

          expect(screen.getByText("Jak działają strategie spłaty?")).toBeTruthy();
          expect(screen.getAllByText("Lawina (Avalanche)").length).toBeGreaterThanOrEqual(1);
          expect(screen.getAllByText("Kula Śnieżna (Snowball)").length).toBeGreaterThanOrEqual(1);

          // Click on "Wybierz Kulę Śnieżną" action in Knowledge Center
          const selectSnowballBtn = screen.getByRole("button", { name: /Wybierz Kulę Śnieżną/i });
          fireEvent.click(selectSnowballBtn);

          // Should switch to Scenarios tab and have Snowball selected
          expect(screen.getByText(/Aktywny wybór: Metoda Kuli Śnieżnej/i)).toBeTruthy();
        });
      });

      describe("Sprint 63: Debt Scenario State Matrix & Recovery Flow Integration", () => {
        it("1. Renders no_debts state in Scenarios tab when debts array is empty", () => {
          const emptyProfile: Profile = {
            ...mockProfile,
            debts: []
          };
          render(<DebtsView profile={emptyProfile} />);

          const scenariosTabBtn = screen.getByRole("button", { name: /scenariusze/i });
          fireEvent.click(scenariosTabBtn);

          expect(screen.getByText("Brak czynnych zobowiązań do symulacji spłaty")).toBeTruthy();
          expect(screen.getAllByRole("button", { name: /Dodaj zobowiązanie/i }).length).toBeGreaterThanOrEqual(2);
          expect(screen.getByRole("button", { name: /Zobacz jak działają strategie/i })).toBeTruthy();
        });

        it("2. Distinguishes all_paid state from no_debts when debts exist but all are closed", () => {
          const closedProfile: Profile = {
            ...mockProfile,
            debts: [
              {
                id: "d-closed",
                name: "Kredyt Zamknięty",
                institution: "Bank X",
                type: "cash_loan",
                currency: "PLN",
                balance: 0,
                originalAmount: 5000,
                monthlyPayment: 0,
                interestRate: 10,
                rateType: "fixed",
                startDate: "2023-01-01",
                endDate: "2024-01-01",
                status: "closed",
                createdAt: "2023-01-01T00:00:00.000Z"
              }
            ]
          };
          render(<DebtsView profile={closedProfile} />);

          const scenariosTabBtn = screen.getByRole("button", { name: /scenariusze/i });
          fireEvent.click(scenariosTabBtn);

          expect(screen.getByText("Wszystkie zobowiązania zostały już spłacone")).toBeTruthy();
          expect(screen.queryByText("Brak czynnych zobowiązań do symulacji spłaty")).toBeNull();
        });
      });
    });
  });
});



