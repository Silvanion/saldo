/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DebtScenarioFallbackState } from "./DebtScenarioFallbackState";

describe("DebtScenarioFallbackState", () => {
  afterEach(() => {
    cleanup();
  });

  it("1. renders no_debts state with primary add debt action and knowledge center link", () => {
    const onAddDebt = vi.fn();
    const onOpenKnowledge = vi.fn();

    render(
      <DebtScenarioFallbackState
        type="no_debts"
        onAddDebt={onAddDebt}
        onOpenKnowledgeCenter={onOpenKnowledge}
      />
    );

    expect(screen.getByText("Brak czynnych zobowiązań do symulacji spłaty")).toBeTruthy();
    expect(screen.getByText(/Dodaj co najmniej jedno zobowiązanie/i)).toBeTruthy();

    const addBtn = screen.getByRole("button", { name: /Dodaj zobowiązanie/i });
    fireEvent.click(addBtn);
    expect(onAddDebt).toHaveBeenCalledTimes(1);

    const knowledgeBtn = screen.getByRole("button", { name: /Zobacz jak działają strategie/i });
    fireEvent.click(knowledgeBtn);
    expect(onOpenKnowledge).toHaveBeenCalledTimes(1);
  });

  it("2. renders all_paid / no_active_debts state", () => {
    render(<DebtScenarioFallbackState type="all_paid" />);

    expect(screen.getByText("Wszystkie zobowiązania zostały już spłacone")).toBeTruthy();
    expect(screen.getByText(/Brak pozostałej kwoty do zasymulowania/i)).toBeTruthy();
  });

  it("3. renders custom_order_incomplete with strategy switch options", () => {
    const onSelectStrategy = vi.fn();

    render(
      <DebtScenarioFallbackState
        type="custom_order_incomplete"
        onSelectStrategy={onSelectStrategy}
      />
    );

    expect(screen.getByText("Własna kolejność nie jest jeszcze gotowa do porównania")).toBeTruthy();

    const avalancheBtn = screen.getByRole("button", { name: /Wybierz Lawinę/i });
    fireEvent.click(avalancheBtn);
    expect(onSelectStrategy).toHaveBeenCalledWith("avalanche");

    const snowballBtn = screen.getByRole("button", { name: /Wybierz Kulę Śnieżną/i });
    fireEvent.click(snowballBtn);
    expect(onSelectStrategy).toHaveBeenCalledWith("snowball");
  });

  it("4. renders no_saved_scenarios with action button", () => {
    const onAction = vi.fn();

    render(
      <DebtScenarioFallbackState
        type="no_saved_scenarios"
        actionLabel="Zapisz scenariusz"
        onAction={onAction}
      />
    );

    expect(screen.getByText("Brak zapisanych scenariuszy spłaty")).toBeTruthy();
    const actionBtn = screen.getByRole("button", { name: /Zapisz scenariusz/i });
    fireEvent.click(actionBtn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("5. renders no_results / missing_data with custom message", () => {
    render(
      <DebtScenarioFallbackState
        type="no_results"
        title="Brak wyników kalkulacji"
        message="Uzupełnij raty miesięczne."
      />
    );

    expect(screen.getByText("Brak wyników kalkulacji")).toBeTruthy();
    expect(screen.getByText("Uzupełnij raty miesięczne.")).toBeTruthy();
  });

  it("6. renders calculation_unavailable with action without crashing when callbacks are omitted", () => {
    render(<DebtScenarioFallbackState type="calculation_unavailable" />);

    expect(screen.getByText("Prognoza chwilowo niedostępna")).toBeTruthy();
    expect(
      screen.getByText(/Nie możemy teraz wiarygodnie wyliczyć tej prognozy/i)
    ).toBeTruthy();
    // Verify no raw technical error artifacts
    expect(screen.queryByText(/undefined|NaN|NullPointerException/i)).toBeNull();
  });
});
