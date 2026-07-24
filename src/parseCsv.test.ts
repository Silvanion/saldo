import { describe, it, expect } from "vitest";
import {
  parseAndMapCsv,
  cleanCsvBomAndEncoding,
  detectCsvSeparator,
  parseCsvDate,
  parseCsvAmount,
  BANK_PRESETS
} from "./services/parseCsv";
import { TransactionRule } from "./types";

describe("PROMPT D1 — Bank CSV Import, Presets & Duplicate Detection", () => {
  // Sample fixture 1: mBank CSV format with semicolon delimiter and headers starting with #
  const MBANK_FIXTURE = `
#Data operacji;#Data księgowania;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Waluta
2026-07-20;2026-07-20;PRZELEW ZEWNĘTRZNY WYCHODZĄCY;Zakupy Biedronka;Biedronka Sp. z o.o.;12345678901234567890123456;-150,50;PLN
2026-07-21;2026-07-21;KARTA;Paliwo Orlen;STACJA ORLEN WARSZAWA;98765432109876543210987654;-210,00;PLN
2026-07-22;2026-07-22;PRZELEW PRZYCHODZĄCY;Wynagrodzenie lipiec;Firma ABC Sp z o o;11112222333344445555666677;+4500,00;PLN
`.trim();

  // Sample fixture 2: PKO BP CSV format with comma delimiter
  const PKO_FIXTURE = `
Data operacji,Data waluty,Typ transakcji,Kwota,Waluta,Saldo po transakcji,Nazwa nadawcy/odbiorcy,Tytuł
2026-07-18,2026-07-18,Płatność kartą,-45.50,PLN,1200.00,Sklep Żabka,Zakupy spożywcze
2026-07-19,2026-07-19,Przelew,-120.00,PLN,1080.00,PGE Obrót,Rachunek za prąd
`.trim();

  // Sample fixture 3: Generic CSV with UTF-8 BOM, semicolon, and DD.MM.YYYY dates
  const GENERIC_BOM_FIXTURE = `\uFEFFData;Kwota;Tytuł
20.07.2026;-35,00;Kawa i Ciacho
21.07.2026;invalid_amount;Błędny wpis kwoty
;100,00;Błędna data
22.07.2026;150,00 PLN;Premia kwartalna
`.trim();

  it("1. verifies presence of at least 3 bank presets (mBank, PKO, Generic)", () => {
    expect(BANK_PRESETS.length).toBeGreaterThanOrEqual(3);
    const ids = BANK_PRESETS.map((p) => p.id);
    expect(ids).toContain("generic");
    expect(ids).toContain("mbank");
    expect(ids).toContain("pko");
  });

  it("2. correctly cleans UTF-8 BOM and detects delimiters", () => {
    const rawWithBom = "\uFEFFData;Kwota;Tytuł";
    const cleaned = cleanCsvBomAndEncoding(rawWithBom);
    expect(cleaned.startsWith("\uFEFF")).toBe(false);
    expect(cleaned).toBe("Data;Kwota;Tytuł");

    expect(detectCsvSeparator(MBANK_FIXTURE)).toBe(";");
    expect(detectCsvSeparator(PKO_FIXTURE)).toBe(",");
  });

  it("3. parses mBank fixture correctly", () => {
    const result = parseAndMapCsv({
      rawCsvText: MBANK_FIXTURE,
      presetId: "mbank"
    });

    expect(result.detectedSeparator).toBe(";");
    expect(result.transactions.length).toBe(3);

    const [t1, t2, t3] = result.transactions;

    expect(t1.name).toBe("Zakupy Biedronka");
    expect(t1.amount).toBe(150.5);
    expect(t1.type).toBe("expense");
    expect(t1.isoDate).toBe("2026-07-20");

    expect(t2.name).toBe("Paliwo Orlen");
    expect(t2.amount).toBe(210);
    expect(t2.type).toBe("expense");

    expect(t3.name).toBe("Wynagrodzenie lipiec");
    expect(t3.amount).toBe(4500);
    expect(t3.type).toBe("income");
  });

  it("4. parses PKO BP fixture correctly", () => {
    const result = parseAndMapCsv({
      rawCsvText: PKO_FIXTURE,
      presetId: "pko"
    });

    expect(result.detectedSeparator).toBe(",");
    expect(result.transactions.length).toBe(2);

    expect(result.transactions[0].amount).toBe(45.5);
    expect(result.transactions[0].isoDate).toBe("2026-07-18");
    expect(result.transactions[1].amount).toBe(120.0);
  });

  it("5. tracks parse errors (invalid amount, invalid date, skipped rows)", () => {
    const result = parseAndMapCsv({
      rawCsvText: GENERIC_BOM_FIXTURE,
      presetId: "generic"
    });

    expect(result.stats.invalidAmountCount).toBe(1); // "invalid_amount"
    expect(result.stats.invalidDateCount).toBe(1); // empty date ";"
    expect(result.stats.validCount).toBe(2); // "Kawa i Ciacho" & "Premia kwartalna"

    expect(result.transactions.length).toBe(2);
    expect(result.transactions[0].name).toBe("Kawa i Ciacho");
    expect(result.transactions[0].amount).toBe(35);
    expect(result.transactions[0].isoDate).toBe("2026-07-20");
  });

  it("6. applies categorization rules from transactionRules parameter", () => {
    const rules: TransactionRule[] = [
      {
        id: "rule-1",
        pattern: "Orlen",
        category: "Transport",
        categoryIcon: "🚗"
      }
    ];

    const result = parseAndMapCsv({
      rawCsvText: MBANK_FIXTURE,
      presetId: "mbank",
      rules
    });

    const orlenTx = result.transactions.find((t) => t.name.includes("Orlen"));
    expect(orlenTx).toBeDefined();
    expect(orlenTx?.category).toBe("Transport");
    expect(orlenTx?.categoryIcon).toBe("🚗");
  });

  it("7. correctly formats various date and amount string representations", () => {
    expect(parseCsvDate("2026-12-31")).toBe("2026-12-31");
    expect(parseCsvDate("31.12.2026")).toBe("2026-12-31");
    expect(parseCsvDate("05-01-2026")).toBe("2026-01-05");

    expect(parseCsvAmount("-1 234,56 PLN")).toEqual({ amount: 1234.56, isNegative: true });
    expect(parseCsvAmount("+500,00 zł")).toEqual({ amount: 500, isNegative: false });
    expect(parseCsvAmount("invalid")).toBeNull();
  });
});
