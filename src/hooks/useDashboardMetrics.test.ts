import { describe, it, expect } from "vitest";
import { calculateDashboardMetrics } from "./useDashboardMetrics";
import { Profile, RecurringRule } from "../types";

describe("calculateDashboardMetrics", () => {
  it("calculates total income, expense and balance correctly for the current month", () => {
    const profile: Profile = {
      id: "p1",
      name: "Test",
      kind: "personal",
      avatar: "",
      accounts: [],
      transactions: [
        { id: "1", name: "Salary", amount: 5000, type: "income", category: "Wynagrodzenie", account: "A1", isoDate: "2026-07-10" },
        { id: "2", name: "Groceries", amount: 200, type: "expense", category: "Żywność", account: "A1", isoDate: "2026-07-11" },
        { id: "3", name: "Old Groceries", amount: 300, type: "expense", category: "Żywność", account: "A1", isoDate: "2026-06-11" }, // outside current month
      ],
      investments: [],
      goals: [],
      currency: "PLN", budgets: { "Żywność": 1000 },
      payments: [],
    };
    
    // Test date is July 2026
    const selectedDate = new Date("2026-07-15T12:00:00Z");
    const recurringRules: RecurringRule[] = [];

    const result = calculateDashboardMetrics(profile, selectedDate, recurringRules);

    expect(result.totalIncome).toBe(5000);
    expect(result.totalExpense).toBe(200);
    expect(result.balance).toBe(4800);
    expect(result.totalPlannedBudget).toBe(1000); // 1000 planned for Żywność
    expect(result.totalActualSpentInBudget).toBe(200);
  });

  it("calculates budget warnings for safe, warning, exceeded and empty budgets", () => {
    const profile: Profile = {
      id: "p2",
      name: "Test Budgets",
      kind: "personal",
      avatar: "",
      accounts: [],
      transactions: [
        { id: "1", name: "Safe", amount: 100, type: "expense", category: "Rozrywka", account: "A1", isoDate: "2026-07-10" },
        { id: "2", name: "Warning", amount: 800, type: "expense", category: "Dom", account: "A1", isoDate: "2026-07-11" },
        { id: "3", name: "Exceeded", amount: 1500, type: "expense", category: "Samochód", account: "A1", isoDate: "2026-07-12" },
      ],
      investments: [],
      goals: [],
      currency: "PLN", budgets: {
        "Rozrywka": 1000, // 10% (safe)
        "Dom": 1000,      // 80% (warning)
        "Samochód": 1000  // 150% (exceeded)
      },
      payments: [],
    };
    
    const selectedDate = new Date("2026-07-15T12:00:00Z");
    const result = calculateDashboardMetrics(profile, selectedDate, []);

    expect(result.budgetWarnings.length).toBe(3);
    
    // posortowane malejąco po ratio
    expect(result.budgetWarnings[0].category).toBe("Samochód");
    expect(result.budgetWarnings[0].status).toBe("exceeded");
    
    expect(result.budgetWarnings[1].category).toBe("Dom");
    expect(result.budgetWarnings[1].status).toBe("warning");

    expect(result.budgetWarnings[2].category).toBe("Rozrywka");
    expect(result.budgetWarnings[2].status).toBe("normal");

    // test brak budżetów
    const noBudgetsProfile = { ...profile, budgets: {}, transactions: [] };
    const emptyResult = calculateDashboardMetrics(noBudgetsProfile, selectedDate, []);
    expect(emptyResult.budgetWarnings.length).toBe(0);
  });
});
