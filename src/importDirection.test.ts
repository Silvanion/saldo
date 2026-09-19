import { describe, expect, it } from "vitest";
import { detectCsvSeparator, parseAndMapCsv } from "./services/parseCsv";
import { generateCsvContent } from "./utils/csv";
import { Transaction } from "./types";

const baseTransaction: Omit<Transaction, "id" | "name" | "amount" | "type"> = {
  category: "Inne",
  account: "Konto główne",
  isoDate: "2026-09-01",
  currency: "PLN"
};

describe("Kierunek transakcji przy imporcie — wpływy vs wydatki", () => {
  it("1. round-trip: plik CSV z Saldo odtwarza typy 1:1 (regresja: dawał same przychody)", () => {
    const exported: Transaction[] = [
      { ...baseTransaction, id: "tx-1", name: "Zakupy Biedronka", amount: 150.5, type: "expense" },
      { ...baseTransaction, id: "tx-2", name: "Wynagrodzenie", amount: 5000, type: "income" },
      { ...baseTransaction, id: "tx-3", name: "Przelew do Jana", amount: 80, type: "expense" }
    ];

    const result = parseAndMapCsv({ rawCsvText: generateCsvContent(exported) });

    expect(result.structureError).toBeUndefined();
    expect(result.transactions.map((t) => [t.name, t.amount, t.type])).toEqual([
      ["Zakupy Biedronka", 150.5, "expense"],
      ["Wynagrodzenie", 5000, "income"],
      ["Przelew do Jana", 80, "expense"]
    ]);
    // Kierunek pochodzi z kolumny "Typ" wyeksportowanej przez Saldo.
    expect(result.directions.every((d) => d.source === "direction-column")).toBe(true);
  });

  it("2. wyciąg z samymi kwotami dodatnimi i osobną kolumną kierunku", () => {
    const csv = [
      "Data;Opis;Kwota;Kierunek",
      "2026-09-01;Zakupy Biedronka;150,50;Obciążenie",
      "2026-09-02;Wynagrodzenie;5000,00;Uznanie",
      "2026-09-03;Zwrot za zakupy;200,00;Uznanie"
    ].join("\n");

    const result = parseAndMapCsv({ rawCsvText: csv });

    expect(result.transactions.map((t) => t.type)).toEqual(["expense", "income", "income"]);
    expect(result.directions.every((d) => d.confident)).toBe(true);
  });

  it("3. wyciąg z rozdzielonymi kolumnami Obciążenia/Uznania odtwarza obie strony", () => {
    const csv = [
      "Data;Opis;Obciążenia;Uznania",
      "2026-09-01;Zakupy Biedronka;150,50;",
      "2026-09-02;Wynagrodzenie;;5000,00"
    ].join("\n");

    const result = parseAndMapCsv({ rawCsvText: csv });

    expect(result.structureError).toBeUndefined();
    expect(result.rejectedRows).toHaveLength(0);
    expect(result.transactions.map((t) => [t.amount, t.type])).toEqual([
      [150.5, "expense"],
      [5000, "income"]
    ]);
    expect(result.directions.every((d) => d.source === "debit-credit-columns")).toBe(true);
  });

  it("4. wiersz bez żadnego sygnału kierunku jest oznaczony jako niepewny", () => {
    const csv = ["Data;Opis;Kwota", "2026-09-01;XYZ 123;150,50"].join("\n");

    const result = parseAndMapCsv({ rawCsvText: csv });

    expect(result.transactions[0].type).toBe("income");
    expect(result.directions[0]).toMatchObject({ source: "amount-sign", confident: false });
  });

  it("5. heurystyka opisowa rozstrzyga plik bez znaków kwot", () => {
    const csv = [
      "Data;Opis;Kwota",
      "2026-09-01;Wynagrodzenie za wrzesień;5000,00",
      "2026-09-02;Prowizja za prowadzenie konta;12,00"
    ].join("\n");

    const result = parseAndMapCsv({ rawCsvText: csv });

    expect(result.transactions.map((t) => t.type)).toEqual(["income", "expense"]);
    expect(result.directions.every((d) => d.source === "description")).toBe(true);
  });

  it("6. wymuszony kierunek z UI nadpisuje wykrywanie", () => {
    const csv = ["Data;Opis;Kwota", "2026-09-01;Kawa;-35,00"].join("\n");

    const result = parseAndMapCsv({ rawCsvText: csv, typeStrategy: "income" });

    expect(result.transactions[0].type).toBe("income");
    expect(result.directions[0]).toMatchObject({ source: "manual", confident: true });
  });
});

describe("Odporność wykrywania struktury pliku", () => {
  it("7. brak kolumny kwoty daje jeden komunikat zamiast lawiny odrzuceń", () => {
    const csv = [
      "Data;Opis;Kierunek",
      "2026-09-01;Zakupy Biedronka;Obciążenie",
      "2026-09-02;Wynagrodzenie;Uznanie"
    ].join("\n");

    const result = parseAndMapCsv({ rawCsvText: csv });

    expect(result.transactions).toHaveLength(0);
    expect(result.rejectedRows).toHaveLength(0);
    expect(result.structureError).toContain("kwoty");
  });

  it("8. brak kolumny daty zgłasza strukturę zamiast odrzucać każdy wiersz", () => {
    const csv = ["Opis;Kwota", "Zakupy;150,50"].join("\n");

    const result = parseAndMapCsv({ rawCsvText: csv });

    expect(result.rejectedRows).toHaveLength(0);
    expect(result.structureError).toContain("daty");
  });

  it("9. przecinek w polu w cudzysłowie nie przestawia separatora", () => {
    const csv = [
      "Data;Kwota;Tytuł",
      '2026-09-01;150,50;"Opłata, prowizja, marża, koszt, rata"',
      '2026-09-02;20,00;"Przelew, zwykły"'
    ].join("\n");

    expect(detectCsvSeparator(csv)).toBe(";");

    const result = parseAndMapCsv({ rawCsvText: csv });
    expect(result.detectedSeparator).toBe(";");
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].name).toBe("Opłata, prowizja, marża, koszt, rata");
  });

  it("10. obsługuje pliki rozdzielane tabulatorem (TSV)", () => {
    const csv = ["Data\tKwota\tTytuł", "2026-09-01\t-35,00\tKawa"].join("\n");

    expect(detectCsvSeparator(csv)).toBe("\t");

    const result = parseAndMapCsv({ rawCsvText: csv });
    expect(result.detectedSeparator).toBe("\t");
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({ name: "Kawa", amount: 35, type: "expense" });
  });
});

describe("Formaty dat i kwot spotykane w wyciągach", () => {
  it("11. obsługuje daty z dwucyfrowym rokiem", () => {
    const csv = ["Data;Kwota;Tytuł", "01.02.26;-35,00;Kawa"].join("\n");

    const result = parseAndMapCsv({ rawCsvText: csv });

    expect(result.transactions[0].isoDate).toBe("2026-02-01");
    expect(result.rejectedRows).toHaveLength(0);
  });

  it("12. nie odrzuca legalnej kwoty 0,00", () => {
    const csv = ["Data;Kwota;Tytuł", "2026-09-01;0,00;Korekta salda"].join("\n");

    const result = parseAndMapCsv({ rawCsvText: csv });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].amount).toBe(0);
    expect(result.rejectedRows).toHaveLength(0);
  });
});
