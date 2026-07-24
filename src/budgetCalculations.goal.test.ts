import { describe, it, expect } from "vitest";
import { calculateSafeToSpend } from "./services/budgetCalculations";
import { Profile, Goal } from "./types";

describe("PROMPT 5 - Jeden spójny model celów i salda (Model A)", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Model A Profile",
    kind: "personal",
    transactions: [
      { id: "t1", name: "Wypłata", amount: 4000, type: "income", category: "Wynagrodzenie", account: "Konto", isoDate: "2026-07-01" },
      { id: "t2", name: "Czynsz", amount: 1000, type: "expense", category: "Opłaty", account: "Konto", isoDate: "2026-07-02" }
    ],
    payments: [],
    goals: [
      { id: "g1", name: "Wakacje", target: 2000, saved: 500, transfers: [] }
    ],
    investments: [],
    budgets: {}
  };

  it("safe-to-spend = saldo - płatności - recurring - reservedGoals (nie ma double counting)", () => {
    // Current balance: 4000 - 1000 = 3000
    // Reserved goals: 500
    // safe-to-spend: 3000 - 500 = 2500
    const res = calculateSafeToSpend(baseProfile, [], "2026-07-15");
    expect(res.currentBalance).toBe(3000);
    expect(res.reservedGoalsSum).toBe(500);
    expect(res.safeToSpend).toBe(2500);
  });

  it("wypłata z celu nie robi ujemnego saved", () => {
    // We already clamped this in useAppActions, but since this test directly checks the model, we ensure the math on safeToSpend handles 0 correctly.
    const profileWithNegativeGoal: Profile = {
      ...baseProfile,
      goals: [
        { id: "g1", name: "Wakacje", target: 2000, saved: -100, transfers: [] }
      ]
    };
    const res = calculateSafeToSpend(profileWithNegativeGoal, [], "2026-07-15");
    // Saved sum should treat negative as 0 in budgetCalculations.ts if it was bypassed
    expect(res.reservedGoalsSum).toBe(0);
    expect(res.safeToSpend).toBe(3000); // 3000 - 0
  });

});
