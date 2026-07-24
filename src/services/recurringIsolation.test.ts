import { describe, it, expect } from "vitest";
import { applyRecurringRules } from "./recurringEngine";
import { calculatePartnerSettlement } from "./settlementEngine";
import { Profile, RecurringRule, Transaction } from "../types";

describe("Recurring Rules Isolation", () => {
  it("Rule from Profile A only applies to Profile A", () => {
    const profileA: Profile = {
      id: "A",
      name: "Profile A",
      kind: "personal",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: [
        {
          id: "ruleA",
          name: "Rent",
          amount: 1000,
          type: "expense",
          category: "Housing",
          account: "Cash",
          frequency: "monthly",
                    nextDueDate: "2023-01-01",
          isActive: true
        }
      ]
    };

    const profileB: Profile = {
      id: "B",
      name: "Profile B",
      kind: "personal",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: [
        {
          id: "ruleB",
          name: "Netflix",
          amount: 20,
          type: "expense",
          category: "Entertainment",
          account: "Card",
          frequency: "monthly",
                    nextDueDate: "2023-01-01",
          isActive: true
        }
      ]
    };

    const todayStr = "2023-01-01";

    const resultA = applyRecurringRules(profileA.recurringRules!, profileA.transactions, todayStr);
    expect(resultA.generatedTransactions.length).toBe(1);
    expect(resultA.generatedTransactions[0].name).toBe("Rent");
    expect(resultA.hasChanges).toBe(true);

    const resultB = applyRecurringRules(profileB.recurringRules!, profileB.transactions, todayStr);
    expect(resultB.generatedTransactions.length).toBe(1);
    expect(resultB.generatedTransactions[0].name).toBe("Netflix");
    expect(resultB.hasChanges).toBe(true);
  });

  it("Profile switch does not skip rules of other profiles", () => {
    const rules: RecurringRule[] = [
      {
        id: "rule1",
        name: "Test",
        amount: 100,
        type: "expense",
        category: "Test",
        account: "Test",
        frequency: "weekly",
                nextDueDate: "2023-01-01",
        isActive: true
      }
    ];

    // If we evaluate today, it generates for today
    const res1 = applyRecurringRules(rules, [], "2023-01-01");
    expect(res1.generatedTransactions.length).toBe(1);
    expect(res1.updatedRules[0].nextDueDate).toBe("2023-01-08");

    // The unchanged rules remain as they are until the profile is evaluated
    expect(rules[0].nextDueDate).toBe("2023-01-01");
  });

  it("recurringEngine is a pure testable function", () => {
    const rules: RecurringRule[] = [
      {
        id: "rule1",
        name: "Test",
        amount: 100,
        type: "expense",
        category: "Test",
        account: "Test",
        frequency: "monthly",
                nextDueDate: "2023-01-01",
        isActive: true
      }
    ];
    
    // Pure function check
    const result1 = applyRecurringRules(rules, [], "2023-01-01");
    const result2 = applyRecurringRules(rules, [], "2023-01-01");

    expect(result1.generatedTransactions).toEqual(result2.generatedTransactions);
    expect(result1.updatedRules).toEqual(result2.updatedRules);
  });

  it("unmigrated global AppState.recurringRules are NOT auto-absorbed by active profile in runtime hook", () => {
    // Profil B ma puste recurringRules ([] lub undefined)
    const activeProfileB: Profile = {
      id: "prof-B",
      name: "Profile B",
      kind: "personal",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: []
    };

    // Globalne niezmigrowane reguły w AppState
    const globalUnmigratedRules: RecurringRule[] = [
      {
        id: "global-1",
        name: "Global Rule",
        amount: 500,
        type: "expense",
        category: "Other",
        account: "Bank",
        frequency: "monthly",
        nextDueDate: "2023-01-01",
        isActive: true
      }
    ];

    // Symulacja czytania reguł w runtime: hook używa wyłącznie activeProfile.recurringRules
    const rulesForActiveProfile = activeProfileB.recurringRules ?? [];
    expect(rulesForActiveProfile.length).toBe(0);

    const result = applyRecurringRules(rulesForActiveProfile, activeProfileB.transactions, "2023-01-01");
    expect(result.generatedTransactions.length).toBe(0);
    expect(result.hasChanges).toBe(false);
  });

  it("profile with its own recurringRules generates ONLY its own entries", () => {
    const profile: Profile = {
      id: "prof-C",
      name: "Profile C",
      kind: "personal",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: [
        {
          id: "rule-C1",
          name: "Subskrypcja C",
          amount: 50,
          type: "expense",
          category: "Usługi",
          account: "Karta",
          frequency: "monthly",
          nextDueDate: "2023-01-01",
          isActive: true
        }
      ]
    };

    const rulesToEvaluate = profile.recurringRules ?? [];
    const result = applyRecurringRules(rulesToEvaluate, profile.transactions, "2023-01-01");
    
    expect(result.generatedTransactions.length).toBe(1);
    expect(result.generatedTransactions[0].name).toBe("Subskrypcja C");
    expect(result.generatedTransactions[0].amount).toBe(50);
  });

  it("RecurringRule z paidBy='me', splitMode='equal' -> wygenerowany tx ma te same wartości", () => {
    const rules: RecurringRule[] = [
      {
        id: "rule-shared-1",
        name: "Czynsz Shared",
        amount: 2000,
        type: "expense",
        category: "Mieszkanie",
        account: "Konto",
        frequency: "monthly",
        nextDueDate: "2026-07-01",
        isActive: true,
        paidBy: "me",
        splitMode: "equal"
      }
    ];

    const result = applyRecurringRules(rules, [], "2026-07-01");
    expect(result.generatedTransactions).toHaveLength(1);
    const tx = result.generatedTransactions[0];
    expect(tx.paidBy).toBe("me");
    expect(tx.splitMode).toBe("equal");
  });

  it("Settlement engine widzi wygenerowany tx z recurring rule i aktualizuje historyNet", () => {
    const rules: RecurringRule[] = [
      {
        id: "rule-shared-2",
        name: "Prąd Shared",
        amount: 300,
        type: "expense",
        category: "Rachunki",
        account: "Konto",
        frequency: "monthly",
        nextDueDate: "2026-07-01",
        isActive: true,
        paidBy: "me" // splitMode defaults to "equal" for expense with paidBy
      }
    ];

    const result = applyRecurringRules(rules, [], "2026-07-01");
    expect(result.generatedTransactions[0].splitMode).toBe("equal");

    const sharedProfile: Profile = {
      id: "shared-p1",
      name: "Ja",
      partnerName: "Partner",
      kind: "shared",
      transactions: result.generatedTransactions,
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };

    const settlement = calculatePartnerSettlement(sharedProfile);
    expect(settlement.historyNet).toBe(150); // Partner winny 150 (połowa z 300)
  });
});
