import { describe, it, expect } from "vitest";
import { checkDuplicate } from "./services/duplicateDetector";
import { Transaction } from "./types";

describe("KROK 8E - Wykrywanie duplikatów transakcji", () => {
  const existing: Transaction[] = [
    {
      id: "t1",
      name: "Zakupy Biedronka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20",
        currency: "PLN"
    },
    {
      id: "t2",
      name: "Wynagrodzenie",
      amount: 5000,
      category: "Wpływy",
      account: "Główne",
      type: "income",
      isoDate: "2026-07-10",
        currency: "PLN"
    }
  ];

  it("identyczna data, kwota i nazwa -> high confidence", () => {
    const res = checkDuplicate({
      name: "Zakupy Biedronka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20",
        currency: "PLN"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(true);
    expect(res.confidence).toBe("high");
    expect(res.matchedTransactionId).toBe("t1");
  });

  it("data różni się o 1 dzień -> high confidence", () => {
    const res = checkDuplicate({
      name: "Zakupy Biedronka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-21",
        currency: "PLN"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(true);
    expect(res.confidence).toBe("high");
    expect(res.matchedTransactionId).toBe("t1");
  });

  it("data różni się o 2 dni -> brak duplikatu", () => {
    const res = checkDuplicate({
      name: "Zakupy Biedronka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-22",
        currency: "PLN"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(false);
  });

  it("ta sama kwota, inna nazwa -> brak duplikatu", () => {
    const res = checkDuplicate({
      name: "Paliwo Orlen",
      amount: 150.50,
      category: "Transport",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20",
        currency: "PLN"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(false);
  });

  it("ta sama nazwa, inna kwota -> brak duplikatu", () => {
    const res = checkDuplicate({
      name: "Zakupy Biedronka",
      amount: 45.00,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20",
        currency: "PLN"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(false);
  });

  it("polskie znaki i różnice wielkości liter -> medium/high", () => {
    const res = checkDuplicate({
      name: "zakupy bIeDrOnka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20",
        currency: "PLN"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(true);
    expect(res.confidence).toBe("high");
  });

  it("podobna nazwa (np. krótsza) -> medium confidence", () => {
    const res = checkDuplicate({
      name: "Biedronka WWA",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20",
        currency: "PLN"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(true);
    expect(res.confidence).toBe("medium");
  });
  
  it("różny typ operacji (przychód/wydatek) -> brak duplikatu", () => {
    const res = checkDuplicate({
      name: "Zakupy Biedronka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "income",
      isoDate: "2026-07-20",
        currency: "PLN"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(false);
  });
});

  it("import z trzema duplikatami i dwoma poprawnymi wpisami", () => {
    const importData: Omit<Transaction, "id">[] = [
      { name: "Zakupy Biedronka", amount: 150.50, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-20",
          currency: "PLN"
    }, // dup
      { name: "Kino", amount: 40, category: "Rozrywka", account: "Główne", type: "expense", isoDate: "2026-07-21",
          currency: "PLN"
    }, // new
      { name: "Wynagrodzenie", amount: 5000, category: "Wpływy", account: "Główne", type: "income", isoDate: "2026-07-10",
          currency: "PLN"
    }, // dup
      { name: "Biedronka zakupy", amount: 150.50, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-19",
          currency: "PLN"
    }, // dup (1 dzień)
      { name: "Restauracja", amount: 120, category: "Jedzenie", account: "Główne", type: "expense", isoDate: "2026-07-20",
          currency: "PLN"
    } // new
    ];

    const results = importData.map(tx => checkDuplicate(tx, [{ id: "t1", name: "Zakupy Biedronka", amount: 150.50, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-20",
        currency: "PLN"
    }, { id: "t2", name: "Wynagrodzenie", amount: 5000, category: "Wpływy", account: "Główne", type: "income", isoDate: "2026-07-10",
        currency: "PLN"
    }]));
    const duplicates = results.filter(r => r.isLikelyDuplicate);
    const valid = results.filter(r => !r.isLikelyDuplicate);

    expect(duplicates.length).toBe(3);
    expect(valid.length).toBe(2);
  });
