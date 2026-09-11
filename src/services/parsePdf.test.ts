import { describe, expect, it } from "vitest";
import { normalizeAiPdfTransactions, parsePdfTransactions } from "./parsePdf";

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
});
