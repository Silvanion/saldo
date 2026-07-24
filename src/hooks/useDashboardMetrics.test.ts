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
      budgets: { "Żywność": 1000 },
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
});
