import { describe, it, expect } from "vitest";
import { validateAndMigrateState } from "./stateMigration";
import { AppState, DebtItem, Transaction } from "../types";

describe("stateMigration (Sprint 19: Transaction debtId support)", () => {
  const mockDebt: DebtItem = {
    id: "debt-hipoteka-1",
    name: "Kredyt hipoteczny",
    institution: "PKO BP",
    type: "mortgage",
    currency: "PLN",
    balance: 300000,
    monthlyPayment: 2500,
    interestRate: 6.5,
    status: "active",
    createdAt: "2026-01-01"
  };

  it("safely migrates legacy transaction without debtId", () => {
    const rawState = {
      profiles: [
        {
          id: "p1",
          name: "Główny",
          transactions: [
            {
              id: "tx-legacy-1",
              name: "Zakupy spożywcze",
              category: "Jedzenie",
              account: "Konto",
              amount: 150.5,
              type: "expense",
              isoDate: "2026-02-01",
              currency: "PLN"
            }
          ],
          debts: [mockDebt]
        }
      ]
    };

    const migrated = validateAndMigrateState(rawState);
    const tx = migrated.profiles[0].transactions[0];

    expect(tx.id).toBe("tx-legacy-1");
    expect(tx.name).toBe("Zakupy spożywcze");
    expect(tx.amount).toBe(150.5);
    expect(tx.debtId).toBeUndefined();
  });

  it("preserves valid debtId on transactions", () => {
    const rawState = {
      profiles: [
        {
          id: "p1",
          name: "Główny",
          transactions: [
            {
              id: "tx-debt-1",
              name: "Rata kredytu hipotecznego",
              category: "Rachunki",
              account: "Konto",
              amount: 2500,
              type: "expense",
              isoDate: "2026-02-15",
              currency: "PLN",
              debtId: "debt-hipoteka-1"
            }
          ],
          debts: [mockDebt]
        }
      ]
    };

    const migrated = validateAndMigrateState(rawState);
    const tx = migrated.profiles[0].transactions[0];

    expect(tx.id).toBe("tx-debt-1");
    expect(tx.debtId).toBe("debt-hipoteka-1");
  });

  it("normalizes empty or whitespace debtId to undefined", () => {
    const rawState = {
      profiles: [
        {
          id: "p1",
          name: "Główny",
          transactions: [
            {
              id: "tx-empty-debt",
              name: "Wydatek",
              category: "Inne",
              account: "Konto",
              amount: 50,
              type: "expense",
              isoDate: "2026-02-10",
              debtId: ""
            },
            {
              id: "tx-spaces-debt",
              name: "Wydatek 2",
              category: "Inne",
              account: "Konto",
              amount: 75,
              type: "expense",
              isoDate: "2026-02-11",
              debtId: "   "
            }
          ]
        }
      ]
    };

    const migrated = validateAndMigrateState(rawState);
    const tx1 = migrated.profiles[0].transactions[0];
    const tx2 = migrated.profiles[0].transactions[1];

    expect(tx1.debtId).toBeUndefined();
    expect(tx2.debtId).toBeUndefined();
  });

  it("handles null, undefined, numeric, or object debtId without throwing errors", () => {
    const rawState = {
      profiles: [
        {
          id: "p1",
          name: "Główny",
          transactions: [
            {
              id: "tx-null-debt",
              name: "Transakcja null",
              category: "Inne",
              account: "Konto",
              amount: 100,
              type: "expense",
              isoDate: "2026-02-10",
              debtId: null
            },
            {
              id: "tx-num-debt",
              name: "Transakcja number",
              category: "Inne",
              account: "Konto",
              amount: 200,
              type: "expense",
              isoDate: "2026-02-11",
              debtId: 12345
            },
            {
              id: "tx-obj-debt",
              name: "Transakcja object",
              category: "Inne",
              account: "Konto",
              amount: 300,
              type: "expense",
              isoDate: "2026-02-12",
              debtId: { id: "invalid" }
            }
          ]
        }
      ]
    };

    expect(() => validateAndMigrateState(rawState)).not.toThrow();

    const migrated = validateAndMigrateState(rawState);
    migrated.profiles[0].transactions.forEach((tx) => {
      expect(tx.debtId).toBeUndefined();
    });
  });

  it("preserves all other transaction fields and profile debts unchanged", () => {
    const rawTransaction = {
      id: "tx-full-1",
      name: "Częściowa spłata pożyczki",
      category: "Kredyty",
      categoryIcon: "landmark",
      account: "mBank",
      amount: 1200,
      type: "expense" as const,
      isoDate: "2026-02-20",
      tags: ["kredyt", "luty"],
      isRecurring: true,
      recurringRuleId: "rec-rule-99",
      sourcePaymentId: "pay-src-44",
      debtId: "debt-hipoteka-1",
      paidBy: "me" as const,
      splitMode: "equal" as const,
      currency: "PLN" as const
    };

    const rawState = {
      profiles: [
        {
          id: "p1",
          name: "Główny",
          transactions: [rawTransaction],
          debts: [mockDebt]
        }
      ]
    };

    const migrated = validateAndMigrateState(rawState);
    const tx = migrated.profiles[0].transactions[0];

    expect(tx.id).toBe(rawTransaction.id);
    expect(tx.name).toBe(rawTransaction.name);
    expect(tx.category).toBe(rawTransaction.category);
    expect(tx.categoryIcon).toBe(rawTransaction.categoryIcon);
    expect(tx.account).toBe(rawTransaction.account);
    expect(tx.amount).toBe(rawTransaction.amount);
    expect(tx.type).toBe(rawTransaction.type);
    expect(tx.isoDate).toBe(rawTransaction.isoDate);
    expect(tx.tags).toEqual(rawTransaction.tags);
    expect(tx.isRecurring).toBe(rawTransaction.isRecurring);
    expect(tx.recurringRuleId).toBe(rawTransaction.recurringRuleId);
    expect(tx.sourcePaymentId).toBe(rawTransaction.sourcePaymentId);
    expect(tx.debtId).toBe(rawTransaction.debtId);
    expect(tx.paidBy).toBe(rawTransaction.paidBy);
    expect(tx.splitMode).toBe(rawTransaction.splitMode);
    expect(tx.currency).toBe(rawTransaction.currency);

    // Verify debts are preserved
    expect(migrated.profiles[0].debts).toHaveLength(1);
    expect(migrated.profiles[0].debts?.[0]).toEqual(mockDebt);
  });
});
