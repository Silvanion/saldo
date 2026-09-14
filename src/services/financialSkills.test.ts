import { describe, it, expect } from "vitest";
import { Profile } from "../types";
import {
  getAvailableFinancialSkills,
  generateDebtPayoffPlan,
  generateEmergencyFundPlan,
  generateSubscriptionAuditPlan,
  generateBudget503020Plan,
} from "./financialSkills";

describe("financialSkills", () => {
  const createTestProfile = (overrides: Partial<Profile> = {}): Profile => ({
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
    recurringRules: [],
    financialPlans: [],
    ...overrides,
  });

  describe("getAvailableFinancialSkills", () => {
    it("zwraca 4 wbudowane umiejętności z kompletnymi metadanymi", () => {
      const skills = getAvailableFinancialSkills();
      expect(skills).toHaveLength(4);
      const skillIds = skills.map((s) => s.id);
      expect(skillIds).toContain("debt-avalanche-accelerator");
      expect(skillIds).toContain("emergency-fund-builder");
      expect(skillIds).toContain("subscription-audit");
      expect(skillIds).toContain("budget-50-30-20-rebalancer");
    });
  });

  describe("generateDebtPayoffPlan", () => {
    it("generuje plan lawinowy dla profilu z długami", () => {
      const profile = createTestProfile({
        debts: [
          {
            id: "d1",
            name: "Karta kredytowa",
            institution: "mBank",
            type: "credit_card",
            currency: "PLN",
            balance: 5000,
            monthlyPayment: 250,
            interestRate: 18.5, // Najwyższe oprocentowanie
            status: "active",
            createdAt: "2025-01-01",
          },
          {
            id: "d2",
            name: "Kredyt gotówkowy",
            institution: "Santander",
            type: "cash_loan",
            currency: "PLN",
            balance: 15000,
            monthlyPayment: 500,
            interestRate: 9.5,
            status: "active",
            createdAt: "2024-01-01",
          },
        ],
      });

      const plan = generateDebtPayoffPlan(profile, 200);
      expect(plan.skillId).toBe("debt-avalanche-accelerator");
      expect(plan.status).toBe("in_progress");
      expect(plan.items.length).toBeGreaterThanOrEqual(3);

      // Pierwszy krok powinien dotyczyć najdroższego długu (Karta kredytowa 18.5%)
      expect(plan.items[0].title).toContain("Karta kredytowa");
      expect(plan.items[0].category).toBe("debt");
      expect(plan.items[0].completed).toBe(false);
    });

    it("generuje bezpieczny plan prewencyjny dla profilu bez długów", () => {
      const profile = createTestProfile({ debts: [] });
      const plan = generateDebtPayoffPlan(profile);
      expect(plan.skillId).toBe("debt-avalanche-accelerator");
      expect(plan.items.length).toBeGreaterThan(0);
      expect(plan.description).toContain("brak aktywnego zadłużenia");
    });
  });

  describe("generateEmergencyFundPlan", () => {
    it("generuje etapy poduszki finansowej na podstawie średnich wydatków", () => {
      const profile = createTestProfile({
        transactions: [
          {
            id: "t1",
            name: "Czynsz i jedzenie",
            category: "Dom",
            account: "Konto",
            amount: 4000,
            type: "expense",
            isoDate: "2026-02-01",
            currency: "PLN",
          },
          {
            id: "t2",
            name: "Czynsz i jedzenie marzec",
            category: "Dom",
            account: "Konto",
            amount: 4000,
            type: "expense",
            isoDate: "2026-03-01",
            currency: "PLN",
          },
        ],
        goals: [{ id: "g1", name: "Poduszka", target: 20000, saved: 3000 }],
      });

      const plan = generateEmergencyFundPlan(profile);
      expect(plan.skillId).toBe("emergency-fund-builder");
      expect(plan.items.length).toBeGreaterThanOrEqual(3);

      // Sprawdzamy obecność 3 etapów
      const titles = plan.items.map((i) => i.title);
      expect(titles.some((t) => t.includes("Etap 1"))).toBe(true);
      expect(titles.some((t) => t.includes("Etap 2"))).toBe(true);
      expect(titles.some((t) => t.includes("Etap 3"))).toBe(true);
    });
  });

  describe("generateSubscriptionAuditPlan", () => {
    it("generuje listę zadań weryfikacji subskrypcji", () => {
      const profile = createTestProfile({
        recurringRules: [
          {
            id: "r1",
            name: "Netflix Premium",
            amount: 65,
            type: "expense",
            category: "Rozrywka",
            account: "Karta",
            frequency: "monthly",
            nextDueDate: "2026-04-01",
            isActive: true,
            currency: "PLN",
          },
          {
            id: "r2",
            name: "Siłownia",
            amount: 150,
            type: "expense",
            category: "Zdrowie",
            account: "Karta",
            frequency: "monthly",
            nextDueDate: "2026-04-05",
            isActive: true,
            currency: "PLN",
          },
        ],
      });

      const plan = generateSubscriptionAuditPlan(profile);
      expect(plan.skillId).toBe("subscription-audit");
      expect(plan.items.length).toBeGreaterThanOrEqual(2);
      expect(plan.estimatedSavings).toBeGreaterThan(0);
      expect(plan.items.some((i) => i.title.includes("Netflix Premium"))).toBe(true);
    });
  });

  describe("generateBudget503020Plan", () => {
    it("generuje plan rebalansowania budżetu", () => {
      const profile = createTestProfile({
        transactions: [
          {
            id: "t1",
            name: "Wynagrodzenie",
            category: "Wynagrodzenie",
            account: "Konto",
            amount: 10000,
            type: "income",
            isoDate: "2026-03-01",
            currency: "PLN",
          },
          {
            id: "t2",
            name: "Zakupy ubrań",
            category: "Zakupy",
            account: "Konto",
            amount: 5000, // Za dużo na zachcianki (50% zamiast max 30%)
            type: "expense",
            isoDate: "2026-03-05",
            currency: "PLN",
          },
        ],
      });

      const plan = generateBudget503020Plan(profile);
      expect(plan.skillId).toBe("budget-50-30-20-rebalancer");
      expect(plan.items.length).toBeGreaterThan(0);
    });
  });
});
