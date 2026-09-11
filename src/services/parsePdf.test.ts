import { describe, expect, it } from "vitest";
import { parsePdfTransactions } from "./parsePdf";

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
});
