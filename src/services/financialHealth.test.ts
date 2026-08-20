import { describe, it, expect } from "vitest";
import { getFinancialHealthSummary } from "./financialHealth";
import { Profile, Payment, RecurringRule, Transaction } from "../types";

describe("financialHealth service", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Jan Kowalski",
    kind: "personal",
    avatar: "👤",
    currency: "PLN",
    accounts: [{ id: "acc1", name: "Konto Główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }],
    settlements: [],
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: { Jedzenie: 1500, Rachunki: 800 },
  };

  const todayIsoStr = "2026-07-25";

  it("returns high score (>=85) and positive alerts for a healthy financial profile", () => {
    const transactions: Transaction[] = [
      { id: "tx1", name: "Wypłata", amount: 6000, type: "income", category: "Wynagrodzenie", isoDate: "2026-07-01", account: "Konto", currency: "PLN" },
      { id: "tx2", name: "Zakupy", amount: 400, type: "expense", category: "Jedzenie", isoDate: "2026-07-10", account: "Konto", currency: "PLN" },
    ];

    const payments: Payment[] = [
      { id: "pay1", name: "Netflix", amount: 50, status: "Opłacono", category: "Rozrywka", isRecurring: true, dueDate: "2026-07-20", currency: "PLN" },
    ];

    const result = getFinancialHealthSummary(
      { ...baseProfile, transactions, payments },
      [],
      { todayIsoStr }
    );

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.grade).toBe("excellent");
    expect(result.gradeLabel).toBe("Wzorowa kondycja");
    expect(result.pillars.budget.score).toBe(25);
    expect(result.pillars.payments.score).toBe(25);
    expect(result.pillars.liquidity.score).toBe(25);
    expect(result.positiveDrivers.length).toBeGreaterThan(0);
    expect(result.negativeDrivers.length).toBe(0);
    expect(result.alerts.some(a => a.severity === "positive")).toBe(true);
  });

  it("reduces payments pillar score and generates critical alert when overdue payment exists", () => {
    const payments: Payment[] = [
      { id: "pay_overdue", name: "Czynsz", amount: 2000, status: "Do opłacenia", category: "Dom", isRecurring: true, dueDate: "2026-07-15", currency: "PLN" },
    ];

    const result = getFinancialHealthSummary(
      { ...baseProfile, payments },
      [],
      { todayIsoStr }
    );

    expect(result.pillars.payments.score).toBeLessThan(25);
    expect(result.negativeDrivers).toContain("1 zaległa opłata");
    
    const overdueAlert = result.alerts.find(a => a.id.startsWith("payment_overdue_"));
    expect(overdueAlert).toBeDefined();
    expect(overdueAlert?.severity).toBe("critical");
    expect(overdueAlert?.title).toContain("Zaległy rachunek: Czynsz");
  });

  it("reduces budget pillar score and generates critical alert when budget limit is exceeded", () => {
    const transactions: Transaction[] = [
      { id: "tx1", name: "Duże zakupy", amount: 1800, type: "expense", category: "Jedzenie", isoDate: "2026-07-15", account: "Konto", currency: "PLN" },
    ];

    const result = getFinancialHealthSummary(
      { ...baseProfile, budgets: { Jedzenie: 1500 }, transactions },
      [],
      { todayIsoStr }
    );

    expect(result.pillars.budget.score).toBeLessThan(20);
    expect(result.negativeDrivers).toContain("Przekroczono limit w 1 kategorii");
    
    const budgetAlert = result.alerts.find(a => a.id.startsWith("budget_exceeded_"));
    expect(budgetAlert).toBeDefined();
    expect(budgetAlert?.severity).toBe("critical");
    expect(budgetAlert?.title).toContain("Przekroczony budżet: Jedzenie");
  });

  it("reduces liquidity pillar score when forecast detects negative dip or deficit", () => {
    const emptyAccountProfile: Profile = {
      ...baseProfile,
      transactions: [{ id: "tx_init", name: "Stan początkowy", amount: 100, type: "income", category: "Inne", isoDate: "2026-07-01", account: "Konto", currency: "PLN" }],
      payments: [
        { id: "p1", name: "Duża rata", amount: 1500, status: "Do opłacenia", category: "Kredyt", isRecurring: true, dueDate: "2026-08-01", currency: "PLN" }
      ]
    };

    const result = getFinancialHealthSummary(emptyAccountProfile, [], { todayIsoStr });

    expect(result.pillars.liquidity.score).toBe(0);
    expect(result.pillars.liquidity.status).toBe("poor");
    
    const liquidityAlert = result.alerts.find(a => a.severity === "critical" && a.pillar === "liquidity");
    expect(liquidityAlert).toBeDefined();
    expect(liquidityAlert?.title).toContain("Zagrożenie deficytem płynności");
  });

  it("penalizes fixed costs when subscriptions & bills exceed 70% of monthly income", () => {
    const recurringRules: RecurringRule[] = [
      { id: "rec1", name: "Pensja", type: "income", amount: 3000, category: "Praca", account: "Konto", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true, currency: "PLN" },
      { id: "rec2", name: "Czynsz", type: "expense", amount: 2400, category: "Czynsz i leasing", account: "Konto", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true, currency: "PLN" },
    ];

    const result = getFinancialHealthSummary(
      baseProfile,
      recurringRules,
      { todayIsoStr }
    );

    // 2400 / 3000 = 80% fixed cost burden
    expect(result.pillars.fixedCosts.score).toBeLessThan(25);
    const fixedAlert = result.alerts.find(a => a.pillar === "fixed_costs");
    expect(fixedAlert).toBeDefined();
    expect(fixedAlert?.severity).toBe("critical");
    expect(fixedAlert?.title).toContain("Wysokie koszty stałe");
  });

  it("handles null or low-data profile safely without errors", () => {
    const resultNull = getFinancialHealthSummary(null);
    expect(resultNull.isLowData).toBe(true);
    expect(resultNull.score).toBe(80);

    const emptyProfile: Profile = {
      ...baseProfile,
      accounts: [],
      payments: [],
      transactions: [],
      budgets: {},
    };

    const resultEmpty = getFinancialHealthSummary(emptyProfile, [], { todayIsoStr });
    expect(resultEmpty.isLowData).toBe(true);
    expect(resultEmpty.score).toBeGreaterThan(0);
  });

  it("sorts alerts strictly by severity: critical -> warning -> positive", () => {
    const profileWithMixedAlerts: Profile = {
      ...baseProfile,
      budgets: { Jedzenie: 500 },
      transactions: [
        { id: "tx1", name: "Supermarket", amount: 800, type: "expense", category: "Jedzenie", isoDate: "2026-07-10", account: "Konto", currency: "PLN" },
        { id: "tx2", name: "Pensja", amount: 4000, type: "income", category: "Praca", isoDate: "2026-07-01", account: "Konto", currency: "PLN" },
      ],
      payments: [
        { id: "pay_soon", name: "Internet", amount: 80, status: "Do opłacenia", category: "Media", isRecurring: true, dueDate: "2026-07-26", currency: "PLN" },
      ]
    };

    const result = getFinancialHealthSummary(profileWithMixedAlerts, [], { todayIsoStr });

    expect(result.alerts.length).toBeGreaterThanOrEqual(2);

    // Critical must come before warning/positive
    const severities = result.alerts.map(a => a.severity);
    const criticalIdx = severities.indexOf("critical");
    const warningIdx = severities.indexOf("warning");
    const positiveIdx = severities.indexOf("positive");

    if (criticalIdx !== -1 && warningIdx !== -1) {
      expect(criticalIdx).toBeLessThan(warningIdx);
    }
    if (warningIdx !== -1 && positiveIdx !== -1) {
      expect(warningIdx).toBeLessThan(positiveIdx);
    }
  });
});
