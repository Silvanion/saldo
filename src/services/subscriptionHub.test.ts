import { describe, it, expect } from "vitest";
import {
  classifyFixedCostType,
  detectFixedCostItems,
  summarizeFixedCosts,
  getFixedCostHubData
} from "./subscriptionHub";
import { Profile, RecurringRule } from "../types";

describe("subscriptionHub Service", () => {
  const createMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
    id: "p1",
    name: "Profil Testowy",
    kind: "personal",
    currency: "PLN",
    budgets: {},
    transactions: [],
    payments: [
      { id: "pay1", name: "Netflix Premium", amount: 60, dueDate: "2026-08-25", status: "Do opłacenia", category: "Rozrywka", currency: "PLN" },
      { id: "pay2", name: "Czynsz za mieszkanie", amount: 2400, dueDate: "2026-09-01", status: "Do opłacenia", category: "Mieszkanie", currency: "PLN" },
      { id: "pay3", name: "Zakup butów na wesele", amount: 450, dueDate: "2026-08-28", status: "Do opłacenia", category: "Odzież", currency: "PLN" }, // non-recurring
      { id: "pay4", name: "Opłata za prąd (PGE)", amount: 180, dueDate: "2026-08-20", status: "Opłacono", category: "Rachunki", currency: "PLN" },
    ],
    goals: [],
    investments: [],
    ...overrides,
  });

  describe("classifyFixedCostType", () => {
    it("correctly identifies subscriptions by keyword", () => {
      expect(classifyFixedCostType("Spotify Family")).toBe("subscription");
      expect(classifyFixedCostType("iCloud 200GB")).toBe("subscription");
      expect(classifyFixedCostType("Abonament siłownia")).toBe("subscription");
      expect(classifyFixedCostType("ChatGPT Plus")).toBe("subscription");
    });

    it("correctly identifies fixed bills by keyword or category", () => {
      expect(classifyFixedCostType("Czynsz")).toBe("fixed_bill");
      expect(classifyFixedCostType("Rachunek za prąd Tauron")).toBe("fixed_bill");
      expect(classifyFixedCostType("Światłowód Orange")).toBe("fixed_bill");
      expect(classifyFixedCostType("Rata kredytu hipotecznego")).toBe("fixed_bill");
    });

    it("falls back to recurring_cost for generic recurring items", () => {
      expect(classifyFixedCostType("Kieszonkowe")).toBe("recurring_cost");
      expect(classifyFixedCostType("Darowizna")).toBe("recurring_cost");
    });
  });

  describe("detectFixedCostItems", () => {
    it("handles null profile safely", () => {
      const items = detectFixedCostItems(null);
      expect(items).toEqual([]);
    });

    it("detects fixed cost candidates while filtering out one-off non-recurring payments", () => {
      const profile = createMockProfile();
      const items = detectFixedCostItems(profile, [], "2026-08-15");

      // Should detect Netflix, Czynsz, and PGE, but ignore "Zakup butów na wesele"
      expect(items).toHaveLength(3);
      const names = items.map(i => i.name);
      expect(names).toContain("Netflix Premium");
      expect(names).toContain("Czynsz za mieszkanie");
      expect(names).toContain("Opłata za prąd (PGE)");
      expect(names).not.toContain("Zakup butów na wesele");
    });

    it("normalizes monthly and yearly amounts for different frequencies", () => {
      const weeklyRule: RecurringRule = {
        id: "r_weekly",
        name: "Trening personalny",
        amount: 100,
        type: "expense",
        category: "Zdrowie",
        account: "Konto",
        frequency: "weekly",
        nextDueDate: "2026-08-20",
        isActive: true,
        currency: "PLN",
      };

      const yearlyRule: RecurringRule = {
        id: "r_yearly",
        name: "Ubezpieczenie OC/AC",
        amount: 1200,
        type: "expense",
        category: "Samochód",
        account: "Konto",
        frequency: "yearly",
        nextDueDate: "2026-11-15",
        isActive: true,
        currency: "PLN",
      };

      const profile = createMockProfile({ payments: [] });
      const items = detectFixedCostItems(profile, [weeklyRule, yearlyRule], "2026-08-15");

      expect(items).toHaveLength(2);

      const weeklyItem = items.find(i => i.id === "rule_r_weekly");
      expect(weeklyItem?.yearlyAmount).toBe(5200);
      expect(weeklyItem?.monthlyAmount).toBe(433.33);

      const yearlyItem = items.find(i => i.id === "rule_r_yearly");
      expect(yearlyItem?.yearlyAmount).toBe(1200);
      expect(yearlyItem?.monthlyAmount).toBe(100);
    });

    it("deduplicates linked payments when corresponding recurring rule is present", () => {
      const recurringRule: RecurringRule = {
        id: "rule_spotify",
        name: "Spotify",
        amount: 30,
        type: "expense",
        category: "Rozrywka",
        account: "Konto",
        frequency: "monthly",
        nextDueDate: "2026-09-01",
        isActive: true,
        currency: "PLN",
      };

      const profile = createMockProfile({
        payments: [
          {
            id: "pay_spotify_aug",
            name: "Spotify",
            amount: 30,
            dueDate: "2026-08-01",
            status: "Opłacono",
            recurringRuleId: "rule_spotify",
            currency: "PLN",
          },
        ],
      });

      const items = detectFixedCostItems(profile, [recurringRule], "2026-08-15");
      // Only 1 item should be present (the rule)
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("rule_rule_spotify");
    });
  });

  describe("summarizeFixedCosts & getFixedCostHubData", () => {
    it("computes monthly and yearly totals, item breakdown and nearest upcoming payment", () => {
      const profile = createMockProfile();
      const summary = getFixedCostHubData(profile, [], "2026-08-15");

      // Netflix (60/mc) + Czynsz (2400/mc) + PGE (180/mc) = 2640/mc
      expect(summary.monthlyTotal).toBe(2640);
      expect(summary.yearlyTotal).toBe(2640 * 12);
      expect(summary.activeCount).toBe(3);
      expect(summary.subscriptionsCount).toBe(1); // Netflix
      expect(summary.billsCount).toBe(2); // Czynsz, PGE

      // Nearest unpaid item from 2026-08-15 is Netflix on 2026-08-25 (since PGE is already paid)
      expect(summary.nextUpcomingItem?.name).toBe("Netflix Premium");
      expect(summary.nextUpcomingItem?.nextDueDate).toBe("2026-08-25");
    });

    it("handles empty state cleanly", () => {
      const emptySummary = getFixedCostHubData(null);
      expect(emptySummary.monthlyTotal).toBe(0);
      expect(emptySummary.yearlyTotal).toBe(0);
      expect(emptySummary.activeCount).toBe(0);
      expect(emptySummary.nextUpcomingItem).toBeNull();
      expect(emptySummary.items).toEqual([]);
    });
  });
});
