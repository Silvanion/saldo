/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DebtScenarioFallbackState } from "./DebtScenarioFallbackState";

describe("DebtScenarioFallbackState — State Matrix & Recovery Flow", () => {
  afterEach(() => {
    cleanup();
  });

  describe("State Matrix & Variant Verification", () => {
    it("1. no_debts variant renders clear explanation, primary add debt CTA and secondary knowledge link", () => {
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

    it("2. all_paid / no_active_debts variant communicates zero debt balance and supports knowledge link", () => {
      const onOpenKnowledge = vi.fn();

      render(
        <DebtScenarioFallbackState
          type="all_paid"
          onOpenKnowledgeCenter={onOpenKnowledge}
        />
      );

      expect(screen.getByText("Wszystkie zobowiązania zostały już spłacone")).toBeTruthy();
      expect(screen.getByText(/Brak pozostałej kwoty do zasymulowania/i)).toBeTruthy();

      const knowledgeBtn = screen.getByRole("button", { name: /Zobacz jak działają strategie/i });
      fireEvent.click(knowledgeBtn);
      expect(onOpenKnowledge).toHaveBeenCalledTimes(1);
    });

    it("3. custom_order_incomplete variant allows quick recovery by switching to Avalanche or Snowball", () => {
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

    it("4. no_saved_scenarios variant renders empty state with recovery action", () => {
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

    it("5. no_results / missing_data variants display customized user-friendly explanation and recovery button", () => {
      const onAction = vi.fn();

      render(
        <DebtScenarioFallbackState
          type="missing_data"
          title="Brak danych wejściowych"
          message="Uzupełnij raty miesięczne, aby obliczyć harmonogram."
          actionLabel="Uzupełnij dane"
          onAction={onAction}
        />
      );

      expect(screen.getByText("Brak danych wejściowych")).toBeTruthy();
      expect(screen.getByText("Uzupełnij raty miesięczne, aby obliczyć harmonogram.")).toBeTruthy();

      const actionBtn = screen.getByRole("button", { name: /Uzupełnij dane/i });
      fireEvent.click(actionBtn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("6. calculation_unavailable / error variant handles unsolvable payoff plans without crashing or displaying raw errors", () => {
      const onAction = vi.fn();

      render(
        <DebtScenarioFallbackState
          type="calculation_unavailable"
          title="Spłata nieosiągalna przy obecnych parametrach"
          message="Miesięczna kwota spłaty nie wystarcza na pokrycie odsetek."
          actionLabel="Zwiększ wpłatę"
          onAction={onAction}
        />
      );

      expect(screen.getByText("Spłata nieosiągalna przy obecnych parametrach")).toBeTruthy();
      expect(screen.getByText("Miesięczna kwota spłaty nie wystarcza na pokrycie odsetek.")).toBeTruthy();

      const actionBtn = screen.getByRole("button", { name: /Zwiększ wpłatę/i });
      fireEvent.click(actionBtn);
      expect(onAction).toHaveBeenCalledTimes(1);

      // Verify no raw technical error leaks
      expect(screen.queryByText(/undefined|NaN|NullPointerException/i)).toBeNull();
    });
  });

  describe("Robustness & Backward Compatibility", () => {
    it("7. handles kebab-case aliases seamlessly without crashing", () => {
      const { rerender } = render(<DebtScenarioFallbackState type="no-debts" />);
      expect(screen.getByText("Brak czynnych zobowiązań do symulacji spłaty")).toBeTruthy();

      rerender(<DebtScenarioFallbackState type="no-active-debts" />);
      expect(screen.getByText("Wszystkie zobowiązania zostały już spłacone")).toBeTruthy();

      rerender(<DebtScenarioFallbackState type="invalid-custom-order" />);
      expect(screen.getByText("Własna kolejność nie jest jeszcze gotowa do porównania")).toBeTruthy();

      rerender(<DebtScenarioFallbackState type="no-saved-scenarios" />);
      expect(screen.getByText("Brak zapisanych scenariuszy spłaty")).toBeTruthy();
    });

    it("8. renders cleanly when all optional callbacks are omitted", () => {
      render(<DebtScenarioFallbackState type="calculation_unavailable" />);
      expect(screen.getByText("Prognoza chwilowo niedostępna")).toBeTruthy();
      expect(screen.queryByRole("button")).toBeNull();
    });
  });
});
