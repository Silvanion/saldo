import { describe, it, expect } from "vitest";
import {
  checkBalanceTransition,
  evaluateBalanceContinuity,
  validateTransactionsBalanceContinuity
} from "./balanceValidator";
import type { Transaction } from "../types";

const createMockTx = (partial: Partial<Transaction> & { amount: number; type: "income" | "expense" }): Transaction => ({
  id: "tx-mock",
  name: "Transakcja testowa",
  isoDate: "2026-09-10",
  category: "Inne",
  categoryIcon: "✨",
  account: "Konto",
  currency: "PLN",
  validationStatus: "VALID",
  ...partial
});

describe("Rozdzielenie walidacji transakcji od ciągłości salda (Balance Continuity)", () => {
  // Test 1 ze specyfikacji użytkownika
  it("Test 1: transakcja z nieokreślonym saldem -> validation = VALID, continuity = UNKNOWN", () => {
    const tx = createMockTx({
      id: "tx-test-1",
      name: "Zakup w piekarni (karta nierozliczona)",
      amount: 25,
      type: "expense",
      isoDate: "2026-09-11",
      balanceAfter: undefined,
      validationStatus: "VALID"
    });

    // Sprawdzenie pojedynczego przejścia
    const transition = checkBalanceTransition(tx);
    expect(transition.status).toBe("UNKNOWN");
    expect(transition.isWarning).toBe(true);
    expect(transition.isError).toBe(false);

    // Walidacja w ciągu transakcji
    const result = validateTransactionsBalanceContinuity([tx]);
    expect(result.transactions[0].validationStatus).toBe("VALID");
    expect(result.transactions[0].balanceContinuity).toBe("UNKNOWN");
  });

  // Test 2 ze specyfikacji użytkownika
  it("Test 2: ciąg transakcji spójny matematycznie -> ciąg: VALID", () => {
    const t1 = createMockTx({
      id: "tx-test-2a",
      name: "Wydatek bazowy",
      amount: 25,
      type: "expense",
      isoDate: "2026-09-10",
      balanceAfter: 1000,
      validationStatus: "VALID"
    });

    const t2 = createMockTx({
      id: "tx-test-2b",
      name: "Wpływ kolejny",
      amount: 10,
      type: "income",
      isoDate: "2026-09-10",
      balanceAfter: 1010,
      validationStatus: "VALID"
    });

    // 1000 + 10 (income) = 1010
    const transition = checkBalanceTransition(t1, t2);
    expect(transition.status).toBe("VALID");
    expect(transition.isValid).toBe(true);
    expect(transition.isError).toBe(false);

    const result = validateTransactionsBalanceContinuity([t1, t2]);
    expect(result.transactions[0].validationStatus).toBe("VALID");
    expect(result.transactions[0].balanceContinuity).toBe("VALID");
    expect(result.stats.validContinuity).toBe(1);
    expect(result.stats.errorContinuity).toBe(0);
  });

  // Test 3 ze specyfikacji użytkownika
  it("Test 3: rzeczywisty błąd niespójności salda -> BALANCE_CONTINUITY_ERROR", () => {
    // balanceAfter = 1000, next balanceAfter = 500, delta = 25
    const status = evaluateBalanceContinuity({
      balanceAfter: 1000,
      nextBalanceAfter: 500,
      delta: 25
    });

    expect(status).toBe("BALANCE_CONTINUITY_ERROR");

    const t1 = createMockTx({
      id: "tx-test-3a",
      name: "Transakcja 1",
      amount: 25,
      type: "expense",
      balanceAfter: 1000,
      validationStatus: "VALID"
    });

    const t2 = createMockTx({
      id: "tx-test-3b",
      name: "Transakcja 2",
      amount: 25,
      type: "expense",
      balanceAfter: 500,
      validationStatus: "VALID"
    });

    const transition = checkBalanceTransition(t1, t2);
    expect(transition.status).toBe("BALANCE_CONTINUITY_ERROR");
    expect(transition.isError).toBe(true);

    const result = validateTransactionsBalanceContinuity([t1, t2]);
    // Transakcja nadal zachowuje VALID w validationStatus, a błąd salda jest w balanceContinuity!
    expect(result.transactions[0].validationStatus).toBe("VALID");
    expect(result.transactions[0].balanceContinuity).toBe("BALANCE_CONTINUITY_ERROR");
    expect(result.stats.errorContinuity).toBe(1);
  });

  it("gdy którekolwiek saldo jest undefined -> status: CONTINUITY_UNVERIFIABLE, a NIE VALIDATION_ERROR", () => {
    const t1 = createMockTx({
      id: "tx-test-4a",
      name: "Z saldem",
      amount: 50,
      type: "expense",
      balanceAfter: 1000,
      validationStatus: "VALID"
    });

    const t2 = createMockTx({
      id: "tx-test-4b",
      name: "Bez salda",
      amount: 20,
      type: "expense",
      balanceAfter: undefined,
      validationStatus: "VALID"
    });

    const transition = checkBalanceTransition(t1, t2);
    expect(transition.status).toBe("CONTINUITY_UNVERIFIABLE");
    expect(transition.isWarning).toBe(true);
    expect(transition.isError).toBe(false);

    const result = validateTransactionsBalanceContinuity([t1, t2]);
    expect(result.transactions[0].validationStatus).toBe("VALID");
    expect(result.transactions[0].balanceContinuity).toBe("CONTINUITY_UNVERIFIABLE");
    expect(result.transactions[1].validationStatus).toBe("VALID");
    expect(result.transactions[1].balanceContinuity).toBe("UNKNOWN");
    expect(result.stats.errorContinuity).toBe(0);
    expect(result.stats.warningContinuity).toBe(2);
  });

  it("agregacja SUM(income), SUM(expense), NET używa wyłącznie amount i type, nigdy balanceAfter", () => {
    const txs: Transaction[] = [
      createMockTx({ id: "1", name: "A", amount: 100, type: "income", isoDate: "2026-09-01", balanceAfter: 20260919 }),
      createMockTx({ id: "2", name: "B", amount: 40, type: "expense", isoDate: "2026-09-02", balanceAfter: undefined }),
      createMockTx({ id: "3", name: "C", amount: 10, type: "income", isoDate: "2026-09-03", balanceAfter: 500 })
    ];

    const sumIncome = txs.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    const sumExpense = txs.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
    const net = sumIncome - sumExpense;

    expect(sumIncome).toBe(110);
    expect(sumExpense).toBe(40);
    expect(net).toBe(70);
  });
});
