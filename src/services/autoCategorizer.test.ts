import { describe, it, expect } from "vitest";
import { autoCategorizeDetailed, matchCategoryFromHistory, POLISH_MERCHANT_DICTIONARY } from "./autoCategorizer";
import { Transaction, TransactionRule } from "../types";

describe("autoCategorizer — Deterministic Smart Categorization", () => {
  it("rozpoznaje kategorie ze słownika polskich kontrahentów", () => {
    expect(autoCategorizeDetailed("ZAKUPY BIEDRONKA WARSZAWA").category).toBe("Żywność");
    expect(autoCategorizeDetailed("STACJA PALIW ORLEN 1234").category).toBe("Transport");
    expect(autoCategorizeDetailed("PGE OBRÓT S.A. ENERGIA").category).toBe("Dom i rachunki");
    expect(autoCategorizeDetailed("APTEKA DOZ WROCŁAW").category).toBe("Zdrowie");
    expect(autoCategorizeDetailed("NETFLIX.COM SUBSKRYPCJA").category).toBe("Rozrywka");
    expect(autoCategorizeDetailed("WYNAGRODZENIE ZA PRACĘ").category).toBe("Wynagrodzenie");
  });

  it("priorytetyzuje regułę zdefiniowaną przez użytkownika nad słownikiem", () => {
    const customRules: TransactionRule[] = [
      { id: "r1", pattern: "orlen", category: "Inne", categoryIcon: "⛽" }
    ];

    const result = autoCategorizeDetailed("ORLEN PALIWO", { rules: customRules });
    expect(result.source).toBe("rule");
    expect(result.category).toBe("Inne");
    expect(result.categoryIcon).toBe("⛽");
  });

  it("uczy się i sugeruje kategorię na podstawie historii transakcji użytkownika", () => {
    const history: Transaction[] = [
      {
        id: "tx-1",
        name: "Lokalny Sklep Spożywczy U Ani",
        amount: 35.5,
        type: "expense",
        category: "Żywność",
        account: "Konto",
        isoDate: "2026-01-10",
        currency: "PLN"
      }
    ];

    const result = autoCategorizeDetailed("Lokalny Sklep Spożywczy U Ani", { history });
    expect(result.source).toBe("history");
    expect(result.category).toBe("Żywność");
  });

  it("działa poprawnie dla nieznanych kontrahentów (zwraca fallback)", () => {
    const result = autoCategorizeDetailed("XYZ_NIEZNANY_KONTRAHENT_12345");
    expect(result.source).toBe("fallback");
    expect(result.category).toBe("Inne");
  });
});
