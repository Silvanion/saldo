import { describe, it, expect } from "vitest";
import { generateMonthlyDigest } from "./services/monthlyDigest";
import { Transaction } from "./types";

describe("KROK 8F - Miesięczny przegląd finansowy bez AI", () => {
  it("miesiąc bez transakcji", () => {
    const res = generateMonthlyDigest([], 2026, 6); // lipiec
    expect(res.totalIncome).toBe(0);
    expect(res.totalExpenses).toBe(0);
    expect(res.balance).toBe(0);
    expect(res.savingsRate).toBeNull();
    expect(res.topExpenseCategory).toBeNull();
    expect(res.transactionCount).toBe(0);
    expect(res.summaryText).toContain("Brak danych finansowych w tym miesiącu");
  });

  it("wyłącznie przychody", () => {
    const txs = [
      { id: "1", name: "Wypłata", amount: 5000, category: "Wpływy", account: "Główne", type: "income", isoDate: "2026-07-10",
          currency: "PLN"
    } as Transaction
    ];
    const res = generateMonthlyDigest(txs, 2026, 6);
    expect(res.totalIncome).toBe(5000);
    expect(res.totalExpenses).toBe(0);
    expect(res.balance).toBe(5000);
    expect(res.savingsRate).toBe(100);
    expect(res.topExpenseCategory).toBeNull();
    expect(res.summaryText).toContain("Bilans miesiąca był dodatni");
  });

  it("wyłącznie wydatki", () => {
    const txs = [
      { id: "1", name: "Zakupy", amount: 1000, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-10",
          currency: "PLN"
    } as Transaction
    ];
    const res = generateMonthlyDigest(txs, 2026, 6);
    expect(res.totalIncome).toBe(0);
    expect(res.totalExpenses).toBe(1000);
    expect(res.balance).toBe(-1000);
    expect(res.savingsRate).toBeNull();
    expect(res.topExpenseCategory).toBe("Żywność");
    expect(res.summaryText).toContain("Najwięcej środków przeznaczyłeś na kategorię: Żywność.");
    expect(res.summaryText).toContain("Bilans miesiąca był ujemny");
  });

  it("dodatni bilans i polskie formatowanie miesiąca", () => {
    const txs = [
      { id: "1", name: "Wypłata", amount: 5000, category: "Wpływy", account: "Główne", type: "income", isoDate: "2026-07-10",
          currency: "PLN"
    } as Transaction,
      { id: "2", name: "Zakupy", amount: 1000, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-11",
          currency: "PLN"
    } as Transaction,
      { id: "3", name: "Biedronka", amount: 500, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-06-11",
          currency: "PLN"
    } as Transaction // czerwiec
    ];
    const res = generateMonthlyDigest(txs, 2026, 6);
    expect(res.totalIncome).toBe(5000);
    expect(res.totalExpenses).toBe(1000);
    expect(res.balance).toBe(4000);
    expect(res.savingsRate).toBe(80);
    expect(res.summaryText).toContain("W lipcu wydałeś więcej niż w czerwcu.");
    expect(res.summaryText).toContain("Najwięcej środków przeznaczyłeś na kategorię: Żywność.");
    expect(res.summaryText).toContain("Bilans miesiąca był dodatni.");
  });

  it("ujemny bilans i porównanie do poprzedniego miesiąca (mniej)", () => {
    const txs = [
      { id: "1", name: "Wypłata", amount: 1000, category: "Wpływy", account: "Główne", type: "income", isoDate: "2026-07-10",
          currency: "PLN"
    } as Transaction,
      { id: "2", name: "Naprawa auta", amount: 2000, category: "Transport", account: "Główne", type: "expense", isoDate: "2026-07-11",
          currency: "PLN"
    } as Transaction,
      { id: "3", name: "Wczasy", amount: 5000, category: "Rozrywka", account: "Główne", type: "expense", isoDate: "2026-06-11",
          currency: "PLN"
    } as Transaction // czerwiec
    ];
    const res = generateMonthlyDigest(txs, 2026, 6);
    expect(res.balance).toBe(-1000);
    expect(res.momExpenseChangePercent).toBe(-60); // 2000 vs 5000 -> -60%
    expect(res.summaryText).toContain("W lipcu wydałeś mniej niż w czerwcu.");
    expect(res.summaryText).toContain("Bilans miesiąca był ujemny.");
  });

  it("przychody równe zero", () => {
    const txs = [
      { id: "2", name: "Naprawa auta", amount: 2000, category: "Transport", account: "Główne", type: "expense", isoDate: "2026-07-11",
          currency: "PLN"
    } as Transaction
    ];
    const res = generateMonthlyDigest(txs, 2026, 6);
    expect(res.savingsRate).toBeNull();
    expect(res.balance).toBe(-2000);
  });
});
