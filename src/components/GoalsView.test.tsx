/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GoalsView } from "./GoalsView";
import { Profile, Goal, Investment } from "../types";

describe("GoalsView (Savings Goals, Card Actions & Empty State)", () => {
  afterEach(() => {
    cleanup();
  });

  const mockProfile: Profile = {
    id: "prof-1",
    name: "Osobisty",
    currency: "PLN",
    kind: "personal",
    budgets: {},
    accounts: [{ id: "acc-1", name: "Konto Główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }],
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    recurringRules: [],
  };

  it("renders empty state with CTA when no goals exist", () => {
    const onOpenGoalModal = vi.fn();
    render(
      <GoalsView
        profile={mockProfile}
        onOpenGoalModal={onOpenGoalModal}
        onOpenGoalDepositModal={vi.fn()}
        onAddInvestment={vi.fn()}
        onDeleteGoal={vi.fn()}
      />
    );

    expect(screen.getByText("Nie zdefiniowałeś jeszcze celów oszczędnościowych")).toBeTruthy();

    const emptyCta = screen.getByRole("button", { name: "Stwórz swój pierwszy cel" });
    expect(emptyCta).toBeTruthy();
    fireEvent.click(emptyCta);
    expect(onOpenGoalModal).toHaveBeenCalled();
  });

  it("renders goal cards with badges, progress and accessible action buttons", () => {
    const onOpenGoalDepositModal = vi.fn();
    const onDeleteGoal = vi.fn();

    const goal1: Goal = {
      id: "goal-1",
      name: "Wakacje Grecja",
      saved: 2500,
      target: 5000,
      currency: "PLN",
    };

    const goalCompleted: Goal = {
      id: "goal-2",
      name: "Nowy Laptop",
      saved: 6000,
      target: 6000,
      currency: "PLN",
    };

    const profileWithGoals: Profile = {
      ...mockProfile,
      goals: [goal1, goalCompleted],
    };

    render(
      <GoalsView
        profile={profileWithGoals}
        onOpenGoalModal={vi.fn()}
        onOpenGoalDepositModal={onOpenGoalDepositModal}
        onAddInvestment={vi.fn()}
        onDeleteGoal={onDeleteGoal}
      />
    );

    expect(screen.getByText("Wakacje Grecja")).toBeTruthy();
    expect(screen.getByText("W trakcie")).toBeTruthy();
    expect(screen.getByText("50% celu")).toBeTruthy();

    expect(screen.getByText("Nowy Laptop")).toBeTruthy();
    expect(screen.getByText(/Osiągnięty/)).toBeTruthy();
    expect(screen.getByText("100% celu")).toBeTruthy();

    // Test deposit / transfer button
    const depositBtn = screen.getByRole("button", { name: "Transfer na cel Wakacje Grecja" });
    expect(depositBtn).toBeTruthy();
    fireEvent.click(depositBtn);
    expect(onOpenGoalDepositModal).toHaveBeenCalledWith(goal1);

    // Test delete button
    const deleteBtn = screen.getByRole("button", { name: "Usuń cel Wakacje Grecja" });
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn);
    expect(onDeleteGoal).toHaveBeenCalledWith("goal-1");
  });

  it("renders investment summary blocks, history, and submits contribution form", () => {
    const onAddInvestment = vi.fn();
    const inv1: Investment = {
      id: "inv-1",
      name: "Obligacje Skarbowe COI",
      amount: 5000,
      type: "Lokaty / Obligacje",
      isoDate: "2026-08-01",
      currency: "PLN",
    };

    const profileWithInvestments: Profile = {
      ...mockProfile,
      investments: [inv1],
    };

    render(
      <GoalsView
        profile={profileWithInvestments}
        onOpenGoalModal={vi.fn()}
        onOpenGoalDepositModal={vi.fn()}
        onAddInvestment={onAddInvestment}
        onDeleteGoal={vi.fn()}
      />
    );

    // Summary block and history entry
    expect(screen.getByText("Wniesiony kapitał (podsumowanie)")).toBeTruthy();
    expect(screen.getByText("Obligacje Skarbowe COI")).toBeTruthy();

    // Fill and submit contribution form
    const nameInput = screen.getByPlaceholderText("np. Obligacje Skarbowe, IKE mBank");
    const amountInput = screen.getByPlaceholderText("0,00");
    const submitBtn = screen.getByRole("button", { name: "Dodaj wpłatę" });

    fireEvent.change(nameInput, { target: { value: "IKE ETF" } });
    fireEvent.change(amountInput, { target: { value: "1200" } });
    fireEvent.click(submitBtn);

    expect(onAddInvestment).toHaveBeenCalledWith("IKE ETF", 1200, "Poduszka finansowa");
  });
});
