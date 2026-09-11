import { describe, expect, it } from "vitest";
import { findPdfDuplicates, normalizeAiPdfTransactions, parsePdfTransactions } from "./parsePdf";

describe("parsePdfTransactions", () => {
  const options = {
    currency: "PLN" as const,
    account: "Konto główne",
    rules: []
  };

  it("extracts dated bank rows and marks debits as expenses", () => {
    const result = parsePdfTransactions(
      "Data Opis Kwota\n11.09.2026 BIEDRONKA -24,50 PLN\n12.09.2026 Wynagrodzenie 5000,00 PLN",
      options
    );

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({
      name: "BIEDRONKA",
      amount: 24.5,
      type: "expense"
    });
    expect(result.transactions[1].amount).toBe(5000);
  });

  it("keeps malformed dated rows out of the import preview", () => {
    const result = parsePdfTransactions(
      "11.09.2026 Nieznana operacja brak kwoty\nNagłówek wyciągu",
      options
    );

    expect(result.transactions).toHaveLength(0);
    expect(result.rejectedRows).toHaveLength(1);
  });

  it("rejects impossible calendar dates", () => {
    const result = parsePdfTransactions("2026-09-00 Nieprawidłowa data -10,00 PLN", options);

    expect(result.transactions).toHaveLength(0);
    expect(result.rejectedRows).toHaveLength(1);
  });

  it("ignores statement summaries before the operations table", () => {
    const result = parsePdfTransactions(
      "Okres od 2025-09-11 do 2026-09-11 Wpływy 80 057,70 PLN\nOperacje\nData Opis Kwota\n2026-09-11 Piekarnia -14,97 PLN",
      options
    );

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({ amount: 14.97, type: "expense" });
  });

  it("does not split on dates embedded in an operation description", () => {
    const result = parsePdfTransactions(
      "2026-08-24 ZUS świadczenie za okres 01-31.08.2026 3 934,20 PLN",
      options
    );

    expect(result.transactions).toHaveLength(1);
    expect(result.rejectedRows).toHaveLength(0);
    expect(result.transactions[0]).toMatchObject({ amount: 3934.2, type: "income" });
  });

  it("parses European thousands separators and trailing debit signs", () => {
    const result = parsePdfTransactions(
      [
        "11.09.2026 Sklep spożywczy 1.234,56-",
        "12.09.2026 Wynagrodzenie 5 000,00 PLN"
      ].join("\n"),
      options
    );

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({ amount: 1234.56, type: "expense" });
    expect(result.transactions[1]).toMatchObject({ amount: 5000, type: "income" });
  });

  it("keeps multiline descriptions together when PDF text is split across lines", () => {
    const result = parsePdfTransactions(
      [
        "Wyciąg bankowy; Data operacji; Tytuł; Kwota",
        "11/09/2026",
        "Płatność kartą",
        "SKLEP SPOŻYWCZY",
        "-42,99 PLN",
        "12/09/2026 Przelew wynagrodzenia 6 500,00 PLN"
      ].join("\n"),
      options
    );

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({
      name: "Płatność kartą SKLEP SPOŻYWCZY",
      amount: 42.99,
      type: "expense"
    });
    expect(result.transactions[1]).toMatchObject({
      name: "Przelew wynagrodzenia",
      amount: 6500,
      type: "income"
    });
  });

  it("parses an anonymized mBank-style operation excerpt and detects re-import duplicates", () => {
    const result = parsePdfTransactions(
      [
        "Lista operacji\nData Opis operacji Rachunek Kategoria Kwota Saldo po operacji",
        "2026-09-11 PIEKARNIA PRZYKŁADOWA eKonto Żywność -14,97 PLN -",
        "ZAKUP PRZY UŻYCIU KARTY W KRAJU",
        "2026-09-10 PRZELEW NA CELE eKonto Oszczędzanie -6,20 PLN 395,80 PLN",
        "2026-09-08 OSOBA TESTOWA eKonto Wpływy 30,00 PLN 889,55 PLN"
      ].join("\n"),
      options
    );

    expect(result.transactions).toHaveLength(3);
    expect(result.rejectedRows).toHaveLength(0);
    expect(result.transactions.map(({ amount, type }) => ({ amount, type }))).toEqual([
      { amount: 14.97, type: "expense" },
      { amount: 6.2, type: "expense" },
      { amount: 30, type: "income" }
    ]);

    const duplicateIds = findPdfDuplicates(result.transactions, result.transactions);
    expect(duplicateIds.size).toBe(3);
  });

  it("matches totals from an anonymized annual mBank statement summary", () => {
    const result = parsePdfTransactions(
      [
        "Lista operacji za okres od 2025-01-01 do 2025-12-31",
        "Wpływy 84 000,14 PLN Wydatki -88 068,13 PLN",
        "Operacje",
        "2025-12-31 Wpłata przykładowa 84 000,14 PLN",
        "2025-12-30 Zakupy przykładowe -88 000,00 PLN",
        "2025-01-02 Opłata bankowa -68,13 PLN"
      ].join("\n"),
      options
    );

    const totals = result.transactions.reduce(
      (summary, transaction) => {
        summary[transaction.type] += transaction.amount;
        return summary;
      },
      { income: 0, expense: 0 }
    );

    expect(result.transactions).toHaveLength(3);
    expect(result.rejectedRows).toHaveLength(0);
    expect(totals).toEqual({ income: 84000.14, expense: 88068.13 });
  });

  it("rejects incomplete OCR rows instead of importing guessed values", () => {
    const result = normalizeAiPdfTransactions([
      { name: "Sklep", amount: 12.5, type: "expense", isoDate: "2026-09-11" },
      { name: "Brak kwoty", amount: 0, type: "expense", isoDate: "2026-09-11" },
      { name: "Brak daty", amount: 5, type: "expense" }
    ], options);

    expect(result.transactions).toHaveLength(1);
    expect(result.rejectedRows).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({ amount: 12.5, type: "expense" });
  });

  it("removes identical OCR rows repeated across PDF pages", () => {
    const result = normalizeAiPdfTransactions([
      { name: "Biedronka", amount: 25.5, type: "expense", isoDate: "2026-09-11", category: "Żywność" },
      { name: "Biedronka", amount: 25.5, type: "expense", isoDate: "2026-09-11", category: "Żywność" }
    ], options);

    expect(result.transactions).toHaveLength(1);
    expect(result.rejectedRows).toEqual([
      expect.objectContaining({ reason: "Powielony rekord OCR — pominięto go przed importem." })
    ]);
  });
});
