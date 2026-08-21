import { describe, it, expect } from "vitest";
import {
  evaluateRuleCondition,
  findMatchingRule,
  previewSmartRules,
  applySmartRulesToTransactions,
  convertLegacyRulesToSmartRules,
  normalizeSmartRuleText,
} from "./smartRules";
import { Transaction, SmartRule, TransactionRule } from "../types";

describe("smartRules service", () => {
  const createMockTx = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: "tx-1",
    name: "Zakupy Biedronka #124",
    amount: 145.2,
    type: "expense",
    category: "Inne",
    account: "Konto Główne",
    isoDate: "2026-08-10",
    currency: "PLN",
    ...overrides,
  });

  const createMockRule = (overrides: Partial<SmartRule> = {}): SmartRule => ({
    id: "rule-1",
    name: "Biedronka -> Żywność",
    enabled: true,
    priority: 1,
    condition: {
      field: "name",
      operator: "contains",
      value: "biedronka",
    },
    action: {
      type: "setCategory",
      categoryId: "Żywność",
    },
    createdAt: "2026-08-01T12:00:00Z",
    ...overrides,
  });

  describe("normalizeSmartRuleText", () => {
    it("lowercases, removes polish diacritics and trims", () => {
      expect(normalizeSmartRuleText("  Żółta GĘŚ  ")).toBe("zolta ges");
      expect(normalizeSmartRuleText("Biedronka")).toBe("biedronka");
      expect(normalizeSmartRuleText("")).toBe("");
    });
  });

  describe("evaluateRuleCondition", () => {
    it("evaluates name contains with case and diacritics insensitivity", () => {
      const tx = createMockTx({ name: "Żabka Warszawa 24" });
      const cond = { field: "name" as const, operator: "contains" as const, value: "żabka" };
      const condUppercase = { field: "name" as const, operator: "contains" as const, value: "ZABKA" };

      expect(evaluateRuleCondition(tx, cond)).toBe(true);
      expect(evaluateRuleCondition(tx, condUppercase)).toBe(true);
    });

    it("evaluates name equals and startsWith", () => {
      const tx = createMockTx({ name: "Netflix Premium" });

      expect(
        evaluateRuleCondition(tx, {
          field: "name",
          operator: "startsWith",
          value: "netflix",
        })
      ).toBe(true);

      expect(
        evaluateRuleCondition(tx, {
          field: "name",
          operator: "equals",
          value: "netflix premium",
        })
      ).toBe(true);

      expect(
        evaluateRuleCondition(tx, {
          field: "name",
          operator: "equals",
          value: "netflix",
        })
      ).toBe(false);
    });

    it("evaluates account condition", () => {
      const tx = createMockTx({ account: "Konto Oszczędnościowe mBank" });

      expect(
        evaluateRuleCondition(tx, {
          field: "account",
          operator: "contains",
          value: "mbank",
        })
      ).toBe(true);
    });

    it("evaluates amount conditions (greaterThan, lessThan, equals)", () => {
      const tx = createMockTx({ amount: 500 });

      expect(
        evaluateRuleCondition(tx, {
          field: "amount",
          operator: "greaterThan",
          value: "300",
        })
      ).toBe(true);

      expect(
        evaluateRuleCondition(tx, {
          field: "amount",
          operator: "lessThan",
          value: "300",
        })
      ).toBe(false);

      expect(
        evaluateRuleCondition(tx, {
          field: "amount",
          operator: "equals",
          value: "500.00",
        })
      ).toBe(true);
    });

    it("safely handles malformed conditions or transactions", () => {
      expect(evaluateRuleCondition(null as any, { field: "name", operator: "contains", value: "test" })).toBe(false);
      expect(evaluateRuleCondition(createMockTx(), null as any)).toBe(false);
    });
  });

  describe("findMatchingRule", () => {
    it("returns rule matching condition", () => {
      const tx = createMockTx({ name: "Biedronka Sp. z o.o." });
      const rule = createMockRule();

      const matched = findMatchingRule(tx, [rule]);
      expect(matched).not.toBeNull();
      expect(matched?.id).toBe("rule-1");
    });

    it("ignores disabled rules", () => {
      const tx = createMockTx({ name: "Biedronka Sp. z o.o." });
      const rule = createMockRule({ enabled: false });

      const matched = findMatchingRule(tx, [rule]);
      expect(matched).toBeNull();
    });

    it("resolves priority conflicts by picking lowest priority number (highest priority)", () => {
      const tx = createMockTx({ name: "Biedronka Zakupy Biurowe" });

      const lowPriorityRule = createMockRule({
        id: "rule-low",
        priority: 10,
        condition: { field: "name", operator: "contains", value: "biedronka" },
        action: { type: "setCategory", categoryId: "Żywność" },
      });

      const highPriorityRule = createMockRule({
        id: "rule-high",
        priority: 1,
        condition: { field: "name", operator: "contains", value: "biurowe" },
        action: { type: "setCategory", categoryId: "Firma" },
      });

      const matched = findMatchingRule(tx, [lowPriorityRule, highPriorityRule]);
      expect(matched?.id).toBe("rule-high");
      expect(matched?.action.categoryId).toBe("Firma");
    });
  });

  describe("previewSmartRules", () => {
    it("generates preview list for matching transactions with category changes", () => {
      const tx1 = createMockTx({ id: "tx-1", name: "Biedronka Zakupy", category: "Inne" });
      const tx2 = createMockTx({ id: "tx-2", name: "Biedronka Zakupy", category: "Żywność" }); // Already has target category
      const tx3 = createMockTx({ id: "tx-3", name: "Stacja Orlen", category: "Inne" });

      const rule = createMockRule({
        condition: { field: "name", operator: "contains", value: "biedronka" },
        action: { type: "setCategory", categoryId: "Żywność" },
      });

      const preview = previewSmartRules([tx1, tx2, tx3], [rule]);

      expect(preview.matchesCount).toBe(1);
      expect(preview.proposedChanges).toHaveLength(1);
      expect(preview.proposedChanges[0].transactionId).toBe("tx-1");
      expect(preview.proposedChanges[0].currentCategory).toBe("Inne");
      expect(preview.proposedChanges[0].proposedCategory).toBe("Żywność");
    });
  });

  describe("applySmartRulesToTransactions", () => {
    it("applies category changes to all matching transactions when no selectedTxIds specified", () => {
      const tx1 = createMockTx({ id: "tx-1", name: "Biedronka Zakupy", category: "Inne" });
      const tx2 = createMockTx({ id: "tx-2", name: "Orlen Paliwo", category: "Inne" });

      const rule = createMockRule({
        condition: { field: "name", operator: "contains", value: "biedronka" },
        action: { type: "setCategory", categoryId: "Żywność" },
      });

      const result = applySmartRulesToTransactions([tx1, tx2], [rule]);

      expect(result.appliedCount).toBe(1);
      expect(result.updatedTransactions[0].category).toBe("Żywność");
      expect(result.updatedTransactions[1].category).toBe("Inne");
    });

    it("selectively applies category changes only to checked transaction IDs", () => {
      const tx1 = createMockTx({ id: "tx-1", name: "Biedronka 1", category: "Inne" });
      const tx2 = createMockTx({ id: "tx-2", name: "Biedronka 2", category: "Inne" });

      const rule = createMockRule({
        condition: { field: "name", operator: "contains", value: "biedronka" },
        action: { type: "setCategory", categoryId: "Żywność" },
      });

      // Only tx-1 is selected in preview modal
      const result = applySmartRulesToTransactions([tx1, tx2], [rule], ["tx-1"]);

      expect(result.appliedCount).toBe(1);
      expect(result.updatedTransactions[0].category).toBe("Żywność");
      expect(result.updatedTransactions[1].category).toBe("Inne");
    });
  });

  describe("convertLegacyRulesToSmartRules", () => {
    it("maps legacy TransactionRule array to valid SmartRule array", () => {
      const legacy: TransactionRule[] = [
        { id: "leg-1", pattern: "Uber", category: "Transport" },
      ];

      const converted = convertLegacyRulesToSmartRules(legacy);

      expect(converted).toHaveLength(1);
      expect(converted[0].id).toBe("leg-1");
      expect(converted[0].enabled).toBe(true);
      expect(converted[0].condition.field).toBe("name");
      expect(converted[0].condition.operator).toBe("contains");
      expect(converted[0].condition.value).toBe("Uber");
      expect(converted[0].action.categoryId).toBe("Transport");
    });
  });
});
