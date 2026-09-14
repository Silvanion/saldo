/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FinancialSkillsModal } from "./FinancialSkillsModal";
import { Profile } from "../../types";

describe("FinancialSkillsModal", () => {
  afterEach(() => cleanup());

  const mockProfile: Profile = {
    id: "p1",
    name: "Jan Kowalski",
    kind: "personal",
    currency: "PLN",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    debts: [
      {
        id: "d1",
        name: "Karta kredytowa",
        institution: "Bank",
        type: "credit_card",
        currency: "PLN",
        balance: 3000,
        monthlyPayment: 200,
        interestRate: 15,
        status: "active",
        createdAt: "2025-01-01",
      },
    ],
    financialPlans: [
      {
        id: "plan-1",
        skillId: "debt-avalanche-accelerator",
        title: "Istniejący plan spłaty",
        description: "Opis testowy",
        status: "in_progress",
        createdAt: "2026-03-01T10:00:00Z",
        items: [
          { id: "step-1", title: "Krok 1", category: "debt", completed: false },
          { id: "step-2", title: "Krok 2", category: "debt", completed: true },
        ],
      },
    ],
  };

  it("nie renderuje się gdy isOpen jest false", () => {
    render(
      <FinancialSkillsModal
        isOpen={false}
        onClose={vi.fn()}
        profile={mockProfile}
        onSavePlan={vi.fn()}
        onTogglePlanItem={vi.fn()}
        onDeletePlan={vi.fn()}
      />
    );
    expect(screen.queryByText("Centrum Umiejętności Finansowych")).toBeNull();
  });

  it("renderuje katalog umiejętności gdy isOpen jest true", () => {
    render(
      <FinancialSkillsModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        onSavePlan={vi.fn()}
        onTogglePlanItem={vi.fn()}
        onDeletePlan={vi.fn()}
      />
    );
    expect(screen.getByText("Centrum Umiejętności Finansowych")).toBeTruthy();
    expect(screen.getByText("Akcelerator Spłaty Długów")).toBeTruthy();
    expect(screen.getByText("Architekt Poduszki Finansowej")).toBeTruthy();
  });

  it("uruchomienie umiejętności wywołuje onSavePlan i przełącza na plany", () => {
    const handleSave = vi.fn();
    render(
      <FinancialSkillsModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        onSavePlan={handleSave}
        onTogglePlanItem={vi.fn()}
        onDeletePlan={vi.fn()}
      />
    );

    const runButtons = screen.getAllByRole("button", {
      name: /Uruchom umiejętność i stwórz plan/i,
    });
    fireEvent.click(runButtons[0]);
    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Moje Plany Działań (1)")).toBeTruthy();
  });

  it("pozwala przełączyć na zakładkę planów i odznaczyć zadanie", () => {
    const handleToggle = vi.fn();
    render(
      <FinancialSkillsModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        onSavePlan={vi.fn()}
        onTogglePlanItem={handleToggle}
        onDeletePlan={vi.fn()}
      />
    );

    const plansTabBtn = screen.getByRole("button", { name: /Moje Plany Działań/i });
    fireEvent.click(plansTabBtn);

    expect(screen.getByText("Istniejący plan spłaty")).toBeTruthy();
    const step1 = screen.getByText("Krok 1");
    fireEvent.click(step1);
    expect(handleToggle).toHaveBeenCalledWith("plan-1", "step-1");
  });

  it("pozwala usunąć plan działania", () => {
    const handleDelete = vi.fn();
    render(
      <FinancialSkillsModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        onSavePlan={vi.fn()}
        onTogglePlanItem={vi.fn()}
        onDeletePlan={handleDelete}
      />
    );

    const plansTabBtn = screen.getByRole("button", { name: /Moje Plany Działań/i });
    fireEvent.click(plansTabBtn);

    const deleteBtn = screen.getByRole("button", { name: /Usuń plan/i });
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith("plan-1");
  });
});
