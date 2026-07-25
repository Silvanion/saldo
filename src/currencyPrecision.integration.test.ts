import { describe, it, expect } from "vitest";
import { calculatePartnerSettlement } from "./services/settlementEngine";
import { calculateBudgetWarnings } from "./services/budgetCalculations";
import { Profile } from "./types";
import { getLocalDateIso } from "./utils";

describe("Integracja: precyzja roundCurrency w całym pipeline", () => {
  it("zwracane kwoty (settlement historyNet i budget spent) nie zawierają błędów float", () => {
    const today = getLocalDateIso();
    
    const profile: Profile = {
      id: "p1",
      name: "User1",
      partnerName: "Partner",
      kind: "shared",
      transactions: [
        { id: "t1", name: "Z1", amount: 10.10, type: "expense", category: "Żywność", account: "X", isoDate: today, splitMode: "equal", paidBy: "me" },
        { id: "t2", name: "Z2", amount: 20.20, type: "expense", category: "Żywność", account: "X", isoDate: today, splitMode: "equal", paidBy: "me" },
        { id: "t3", name: "Z3", amount: 5.05, type: "expense", category: "Żywność", account: "X", isoDate: today, splitMode: "equal", paidBy: "me" }
      ],
      payments: [],
      goals: [],
      investments: [],
      budgets: { "Żywność": 50 }
    };

    // Helper: checks if a number is already rounded to 2 decimal places
    const isRoundedToTwoDecimals = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100 === val;

    // 1. Sprawdzenie settlementEngine (historyNet)
    const settlement = calculatePartnerSettlement(profile);
    expect(isRoundedToTwoDecimals(settlement.historyNet)).toBe(true);

    // 2. Sprawdzenie budgetCalculations (spent)
    const warnings = calculateBudgetWarnings(profile, today);
    const foodWarning = warnings.find(w => w.category === "Żywność");
    
    expect(foodWarning).toBeDefined();
    expect(isRoundedToTwoDecimals(foodWarning!.spent)).toBe(true);
  });
});

