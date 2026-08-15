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
        { id: "1", name: "Salary", amount: 5000, type: "income", category: "Wynagrodzenie", account: "A1", isoDate: "2026-07-10",
            currency: "PLN"
        },
        { id: "2", name: "Groceries", amount: 200, type: "expense", category: "Żywność", account: "A1", isoDate: "2026-07-11",
            currency: "PLN"
        },
        { id: "3", name: "Old Groceries", amount: 300, type: "expense", category: "Żywność", account: "A1", isoDate: "2026-06-11",
            currency: "PLN"
        }, // outside current month
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
        { id: "1", name: "Safe", amount: 100, type: "expense", category: "Rozrywka", account: "A1", isoDate: "2026-07-10",
            currency: "PLN"
        },
        { id: "2", name: "Warning", amount: 800, type: "expense", category: "Dom", account: "A1", isoDate: "2026-07-11",
            currency: "PLN"
        },
        { id: "3", name: "Exceeded", amount: 1500, type: "expense", category: "Samochód", account: "A1", isoDate: "2026-07-12",
            currency: "PLN"
        },
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

  it("calculates runway and momTrends correctly in dashboard metrics", () => {
    const profile: Profile = {
      id: "p3",
      name: "Test Runway",
      kind: "personal",
      currency: "PLN",
      budgets: {},
      payments: [],
      goals: [{ id: "g1", name: "Poduszka", target: 5000, saved: 2000, currency: "PLN" }],
      investments: [{ id: "i1", name: "Obligacje", amount: 3000, type: "Poduszka finansowa", isoDate: "2026-01-01", currency: "PLN" }],
      transactions: [
        // Previous month (June 2026)
        { id: "1", name: "Pensja Czerwiec", amount: 6000, type: "income", category: "Wynagrodzenie", account: "A1", isoDate: "2026-06-01", currency: "PLN" },
        { id: "2", name: "Wydatki Czerwiec", amount: 1000, type: "expense", category: "Żywność", account: "A1", isoDate: "2026-06-15", currency: "PLN" },
        // Current month (July 2026)
        { id: "3", name: "Pensja Lipiec", amount: 6500, type: "income", category: "Wynagrodzenie", account: "A1", isoDate: "2026-07-01", currency: "PLN" },
        { id: "4", name: "Wydatki Lipiec", amount: 1200, type: "expense", category: "Żywność", account: "A1", isoDate: "2026-07-15", currency: "PLN" }
      ]
    };

    const selectedDate = new Date("2026-07-15T12:00:00Z");
    const result = calculateDashboardMetrics(profile, selectedDate, []);

    // MoM Trends
    expect(result.momTrends.currentMonthExpenses).toBe(1200);
    expect(result.momTrends.previousMonthExpenses).toBe(1000);
    expect(result.momTrends.expensesDiffPercent).toBe(20); // +20%
    expect(result.momTrends.incomeDiffPercent).toBe(8.33); // +8.33%

    // Runway
    // Balance = (6000 - 1000) + (6500 - 1200) = 10300
    // Liquid assets = 10300 + 2000 (goal) + 3000 (cushion) = 15300
    // Avg monthly expenses = (1000 + 1200) / 2 = 1100
    // Runway = 15300 / 1100 = 13.91 months -> healthy
    expect(result.runway.liquidAssets).toBe(15300);
    expect(result.runway.avgMonthlyExpenses).toBe(1100);
    expect(result.runway.runwayMonths).toBe(13.91);
    expect(result.runway.status).toBe("healthy");
  });
});
