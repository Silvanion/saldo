/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DashboardView } from "./DashboardView";
import { Profile } from "../types";

describe("DashboardView - Deep Integration (Doktor Saldo & Action Plans)", () => {
  afterEach(() => cleanup());

  const baseProfile: Profile = {
    id: "p1",
    name: "Jan Kowalski",
    kind: "personal",
    currency: "PLN",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    debts: [],
    financialPlans: [],
  };

  it("nie wyświetla baneru Doktora Saldo gdy baza nie ma anomalii", () => {
    render(
      <DashboardView
        showToast={vi.fn()}
        profile={baseProfile}
        selectedDate={new Date(2026, 8, 1)}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        onTogglePaymentStatus={vi.fn()}
        onOpenTxModal={vi.fn()}
        onOpenBudgetModal={vi.fn()}
        onOpenPaymentModal={vi.fn()}
        onChangeView={vi.fn()}
        onOpenDataAuditor={vi.fn()}
      />
    );

    expect(screen.queryByText(/Doktor Saldo • Wykryto niespójności/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Napraw w Doktor Saldo/i })).toBeNull();
  });

  it("wyświetla baner Doktora Saldo gdy w profilu wykryto anomalie (np. duplikaty transakcji)", () => {
    const onOpenAuditor = vi.fn();
    const profileWithDuplicates: Profile = {
      ...baseProfile,
      transactions: [
        {
          id: "tx-1",
          isoDate: "2026-09-01",
          amount: 50,
          category: "Jedzenie",
          name: "Biedronka",
          account: "Konto",
          type: "expense",
          currency: "PLN",
        },
        {
          id: "tx-2",
          isoDate: "2026-09-01",
          amount: 50,
          category: "Jedzenie",
          name: "Biedronka",
          account: "Konto",
          type: "expense",
          currency: "PLN",
        },
      ],
    };

    render(
      <DashboardView
        showToast={vi.fn()}
        profile={profileWithDuplicates}
        selectedDate={new Date(2026, 8, 1)}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        onTogglePaymentStatus={vi.fn()}
        onOpenTxModal={vi.fn()}
        onOpenBudgetModal={vi.fn()}
        onOpenPaymentModal={vi.fn()}
        onChangeView={vi.fn()}
        onOpenDataAuditor={onOpenAuditor}
      />
    );

    expect(screen.getByText(/Doktor Saldo • Wykryto niespójności/i)).toBeTruthy();
    const fixButton = screen.getByRole("button", { name: /Napraw w Doktor Saldo/i });
    expect(fixButton).toBeTruthy();
    fireEvent.click(fixButton);
    expect(onOpenAuditor).toHaveBeenCalledTimes(1);
  });

  it("wyświetla pasek aktywnego planu działania i pozwala odznaczyć najbliższy krok", () => {
    const onToggleItem = vi.fn();
    const onOpenSkills = vi.fn();
    const onToast = vi.fn();

    const profileWithPlan: Profile = {
      ...baseProfile,
      financialPlans: [
        {
          id: "plan-1",
          skillId: "subscription-audit",
          title: "Audyt Subskrypcji",
          description: "Zredukuj koszty",
          status: "in_progress",
          createdAt: "2026-09-01T10:00:00Z",
          items: [
            { id: "step-1", title: "Anuluj zbędne serwisy VOD", description: "Anuluj zbędne serwisy VOD", category: "subscription", completed: false },
            { id: "step-2", title: "Przejdź na plan roczny", description: "Przejdź na plan roczny", category: "subscription", completed: true },
          ],
        },
      ],
    };

    render(
      <DashboardView
        showToast={onToast}
        profile={profileWithPlan}
        selectedDate={new Date(2026, 8, 1)}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        onTogglePaymentStatus={vi.fn()}
        onOpenTxModal={vi.fn()}
        onOpenBudgetModal={vi.fn()}
        onOpenPaymentModal={vi.fn()}
        onChangeView={vi.fn()}
        onTogglePlanItem={onToggleItem}
        onOpenFinancialSkills={onOpenSkills}
      />
    );

    expect(screen.getByText(/Plan: Audyt Subskrypcji/i)).toBeTruthy();
    expect(screen.getByText(/Anuluj zbędne serwisy VOD/i)).toBeTruthy();

    const doneBtn = screen.getByRole("button", { name: /Zrobione/i });
    fireEvent.click(doneBtn);
    expect(onToggleItem).toHaveBeenCalledWith("plan-1", "step-1");
    expect(onToast).toHaveBeenCalledWith("Odznaczono krok planu działania!", "success");

    const detailsBtn = screen.getByRole("button", { name: /Szczegóły planu/i });
    fireEvent.click(detailsBtn);
    expect(onOpenSkills).toHaveBeenCalledTimes(1);
  });
});
