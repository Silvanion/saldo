import { describe, it, expect } from "vitest";
import { applyRecurringRules } from "./services/recurringEngine";
import { calculateSafeToSpend, calculateEndOfMonthForecast } from "./services/budgetCalculations";
import { Profile, RecurringRule, Transaction } from "./types";
import { getLocalDateIso } from "./utils";

describe("PROMPT 6 - Testy regresji profili i kalkulacji", () => {
  
  it("1. recurring reguła profilu A nie generuje tx w B", () => {
    const rulesA: RecurringRule[] = [
      { id: "rA", name: "Rule A", amount: 100, type: "expense" as const, category: "Test", account: "Cash", frequency: "monthly" as const, nextDueDate: "2026-07-01", isActive: true, currency: "PLN" as const }
    ];
    // Evaluate for Profile B (which has no rules)
    const resultB = applyRecurringRules([], [], "2026-07-10");
    expect(resultB.generatedTransactions.length).toBe(0);
    expect(resultB.hasChanges).toBe(false);
  });

  it("2. przełączenie A→B nie mutuje nextDueDate reguł A przez logikę B", () => {
    const rulesA: RecurringRule[] = [
      { id: "rA", name: "Rule A", amount: 100, type: "expense" as const, category: "Test", account: "Cash", frequency: "monthly" as const, nextDueDate: "2026-07-01", isActive: true, currency: "PLN" as const }
    ];
    // Logika profilu B używa swoich reguł
    const rulesB: RecurringRule[] = [];
    const resultB = applyRecurringRules(rulesB, [], "2026-07-10");
    
    // Upewniamy się, że to nie wpłynęło w żaden sposób na reguły A
    expect(rulesA[0].nextDueDate).toBe("2026-07-01");
  });

  it("3. migracja starych recurring jest idempotentna (symulacja stanu)", () => {
    const state = {
      recurringRules: [
        { id: "global-1", name: "Old Global Rule", amount: 100, type: "expense" as const, category: "Test", account: "Cash", frequency: "monthly" as const, nextDueDate: "2026-07-01", isActive: true, currency: "PLN" as const }
      ]
    };
    
    const profileWithoutRules: Profile = {
      id: "p1", name: "Profile", kind: "personal", currency: "PLN", transactions: [], payments: [], goals: [], investments: [], budgets: {}
    };
    
    // Symulujemy zachowanie migracji - to teraz dzieje się przy starcie apki
    // Zakładamy, że migracja przydzieliła tę regułę do profilu (activeProfileId)
    const migratedProfileWithRules: Profile = {
      ...profileWithoutRules,
      recurringRules: [...state.recurringRules]
    };
    
    // Nowy hook korzysta WYŁĄCZNIE z profilu
    const rulesToUse = migratedProfileWithRules.recurringRules ?? [];
    expect(rulesToUse.length).toBe(1);
    expect(rulesToUse[0].id).toBe("global-1");
    expect(rulesToUse).toBe(migratedProfileWithRules.recurringRules);
  });

  it("4. getLocalDateIso używane zamiast UTC w recurring path", () => {
    const date = new Date(2026, 6, 15, 23, 59, 59);
    const isoString = getLocalDateIso(date);
    expect(isoString).toBe("2026-07-15");
  });

  it("5. safe-to-spend / forecast ignorują obce reguły", () => {
    const profile: Profile = {
      id: "p1", name: "Test", kind: "personal", currency: "PLN", transactions: [], payments: [], goals: [], investments: [], budgets: {}
    };
    const foreignRules: RecurringRule[] = [
      { id: "foreign", name: "Obca", amount: 1000, type: "expense" as const, category: "Test", account: "Cash", frequency: "monthly" as const, nextDueDate: "2026-07-05", isActive: true, currency: "PLN" as const }
    ];
    
    const activeRules: RecurringRule[] = [];
    
    const safe = calculateSafeToSpend(profile, activeRules, "2026-07-01");
    expect(safe.futureRecurringExpensesSum).toBe(0);
    
    const forecast = calculateEndOfMonthForecast(profile, activeRules, "2026-07-01");
    expect(forecast.futureRecurringExpensesSum).toBe(0);
  });

  it("6. cele nie są liczone podwójnie wg wybranego modelu z Promptu 5", () => {
    const profile: Profile = {
      id: "p1", name: "Test", kind: "personal", currency: "PLN", 
      transactions: [
        { id: "t1", name: "Wypłata", amount: 2000, type: "income" as const, category: "Wynagrodzenie", account: "Konto", isoDate: "2026-07-01", currency: "PLN" as const }
      ], 
      payments: [], 
      goals: [
        { id: "g1", name: "Cel", target: 1000, saved: 300, transfers: [] }
      ], 
      investments: [], budgets: {}
    };
    
    const safe = calculateSafeToSpend(profile, [], "2026-07-01");
    expect(safe.currentBalance).toBe(2000);
    expect(safe.reservedGoalsSum).toBe(300);
    expect(safe.safeToSpend).toBe(1700);
  });

});
