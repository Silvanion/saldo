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

describe("CSV 2.0 — Bank CSV Import, Presets & Multicurrency Support", () => {
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

  // Sample fixture 3: Revolut Multi-currency CSV format
  const REVOLUT_FIXTURE = `
Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
CARD_PAYMENT,Current,2026-08-10 14:32:00,2026-08-10 14:32:00,Uber Eats,-18.50,0.00,EUR,COMPLETED,100.00
TOPUP,Current,2026-08-11 09:15:00,2026-08-11 09:15:00,Top-up by card,250.00,0.00,PLN,COMPLETED,350.00
CARD_PAYMENT,Current,2026-08-12 18:20:00,2026-08-12 18:20:00,Amazon.com,-45.00,0.00,USD,COMPLETED,55.00
CARD_PAYMENT,Current,2026-08-13 12:00:00,2026-08-13 12:00:00,London Underground,-3.50,0.00,GBP,COMPLETED,51.50
`.trim();

  // Sample fixture 4: Santander Bank Polska CSV format
  const SANTANDER_FIXTURE = `
Data operacji,Data księgowania,Opis transakcji,Kwota w walucie rachunku,Waluta
2026-08-01,2026-08-01,Apteka Gemini,-64.20,PLN
2026-08-02,2026-08-02,Wynagrodzenie Santander,5200.00,PLN
`.trim();

  // Sample fixture 5: Bank Millennium CSV format
  const MILLENNIUM_FIXTURE = `
Data transakcji,Data rozliczenia,Odbiorca/Nadawca,Opis,Kwota w walucie rachunku,Waluta
2026-08-05,2026-08-05,Lidl Polska,Zakupy spożywcze,-88.40,PLN
2026-08-06,2026-08-06,Cinema City,Bilety kino,-70.00,PLN
`.trim();

  // Sample fixture 6: Bank Pekao S.A. CSV format
  const PEKAO_FIXTURE = `
Data operacji;Data księgowania;Tytułem;Kwota operacji;Waluta
08.08.2026;08.08.2026;Rossmann Supermarket;-32,90;PLN
09.08.2026;09.08.2026;Przelew Blik;+150,00;PLN
`.trim();

  // Sample fixture 7: Alior Bank CSV format
  const ALIOR_FIXTURE = `
Data transakcji;Data księgowania;Opis transakcji;Kwota transakcji;Waluta
2026-08-07;2026-08-07;Kaufland Market;-112,30;PLN
`.trim();

  // Sample fixture 8: BNP Paribas CSV format
  const BNP_FIXTURE = `
Data transakcji;Data rozliczenia;Opis transakcji;Kwota transakcji;Waluta
2026-08-09;2026-08-09;Ikea Meble;-450,00;PLN
`.trim();

  // Sample fixture 9: Generic CSV with UTF-8 BOM, semicolon, and DD.MM.YYYY dates
  const GENERIC_BOM_FIXTURE = `\uFEFFData;Kwota;Tytuł
20.07.2026;-35,00;Kawa i Ciacho
21.07.2026;invalid_amount;Błędny wpis kwoty
;100,00;Błędna data
22.07.2026;150,00 PLN;Premia kwartalna
`.trim();

  it("1. verifies presence of 10 supported bank presets", () => {
    expect(BANK_PRESETS.length).toBe(10);
    const ids = BANK_PRESETS.map((p) => p.id);
    expect(ids).toContain("generic");
    expect(ids).toContain("revolut");
    expect(ids).toContain("mbank");
    expect(ids).toContain("pko");
    expect(ids).toContain("ing");
    expect(ids).toContain("santander");
    expect(ids).toContain("millennium");
    expect(ids).toContain("pekao");
    expect(ids).toContain("alior");
    expect(ids).toContain("bnp");
  });

  it("2. correctly cleans UTF-8 BOM and detects delimiters", () => {
    const rawWithBom = "\uFEFFData;Kwota;Tytuł";
    const cleaned = cleanCsvBomAndEncoding(rawWithBom);
    expect(cleaned.startsWith("\uFEFF")).toBe(false);
    expect(cleaned).toBe("Data;Kwota;Tytuł");

    expect(detectCsvSeparator(MBANK_FIXTURE)).toBe(";");
    expect(detectCsvSeparator(PKO_FIXTURE)).toBe(",");
    expect(detectCsvSeparator(REVOLUT_FIXTURE)).toBe(",");
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
    expect(t1.currency).toBe("PLN");

    expect(t2.name).toBe("Paliwo Orlen");
    expect(t2.amount).toBe(210);
    expect(t2.type).toBe("expense");

    expect(t3.name).toBe("Wynagrodzenie lipiec");
    expect(t3.amount).toBe(4500);
    expect(t3.type).toBe("income");
  });

  it("4. parses Revolut multi-currency fixture correctly with individual currencies", () => {
    const result = parseAndMapCsv({
      rawCsvText: REVOLUT_FIXTURE,
      presetId: "revolut"
    });

    expect(result.transactions.length).toBe(4);

    const [t1, t2, t3, t4] = result.transactions;

    // 1. Uber Eats in EUR
    expect(t1.name).toBe("Uber Eats");
    expect(t1.amount).toBe(18.5);
    expect(t1.type).toBe("expense");
    expect(t1.isoDate).toBe("2026-08-10");
    expect(t1.currency).toBe("EUR");

    // 2. Top-up in PLN
    expect(t2.name).toBe("Top-up by card");
    expect(t2.amount).toBe(250);
    expect(t2.type).toBe("income");
    expect(t2.isoDate).toBe("2026-08-11");
    expect(t2.currency).toBe("PLN");

    // 3. Amazon in USD
    expect(t3.name).toBe("Amazon.com");
    expect(t3.amount).toBe(45);
    expect(t3.type).toBe("expense");
    expect(t3.currency).toBe("USD");

    // 4. London Underground in GBP
    expect(t4.name).toBe("London Underground");
    expect(t4.amount).toBe(3.5);
    expect(t4.type).toBe("expense");
    expect(t4.currency).toBe("GBP");
  });

  it("5. parses Santander fixture correctly", () => {
    const result = parseAndMapCsv({
      rawCsvText: SANTANDER_FIXTURE,
      presetId: "santander"
    });

    expect(result.transactions.length).toBe(2);
    expect(result.transactions[0].name).toBe("Apteka Gemini");
    expect(result.transactions[0].amount).toBe(64.2);
    expect(result.transactions[0].type).toBe("expense");
    expect(result.transactions[1].name).toBe("Wynagrodzenie Santander");
    expect(result.transactions[1].amount).toBe(5200);
    expect(result.transactions[1].type).toBe("income");
  });

  it("6. parses Bank Millennium fixture correctly", () => {
    const result = parseAndMapCsv({
      rawCsvText: MILLENNIUM_FIXTURE,
      presetId: "millennium"
    });

    expect(result.transactions.length).toBe(2);
    expect(result.transactions[0].name).toBe("Lidl Polska");
    expect(result.transactions[0].amount).toBe(88.4);
    expect(result.transactions[0].isoDate).toBe("2026-08-05");
  });

  it("7. parses Bank Pekao fixture correctly with DD.MM.YYYY dates", () => {
    const result = parseAndMapCsv({
      rawCsvText: PEKAO_FIXTURE,
      presetId: "pekao"
    });

    expect(result.transactions.length).toBe(2);
    expect(result.transactions[0].name).toBe("Rossmann Supermarket");
    expect(result.transactions[0].amount).toBe(32.9);
    expect(result.transactions[0].isoDate).toBe("2026-08-08");
    expect(result.transactions[1].type).toBe("income");
    expect(result.transactions[1].amount).toBe(150);
  });

  it("8. parses Alior Bank and BNP Paribas fixtures correctly", () => {
    const aliorRes = parseAndMapCsv({
      rawCsvText: ALIOR_FIXTURE,
      presetId: "alior"
    });
    expect(aliorRes.transactions.length).toBe(1);
    expect(aliorRes.transactions[0].name).toBe("Kaufland Market");
    expect(aliorRes.transactions[0].amount).toBe(112.3);

    const bnpRes = parseAndMapCsv({
      rawCsvText: BNP_FIXTURE,
      presetId: "bnp"
    });
    expect(bnpRes.transactions.length).toBe(1);
    expect(bnpRes.transactions[0].name).toBe("Ikea Meble");
    expect(bnpRes.transactions[0].amount).toBe(450);
  });

  it("9. tracks parse errors (invalid amount, invalid date, skipped rows)", () => {
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

  it("10. applies categorization rules from transactionRules parameter", () => {
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

  it("11. correctly formats various date and amount string representations", () => {
    expect(parseCsvDate("2026-12-31")).toBe("2026-12-31");
    expect(parseCsvDate("31.12.2026")).toBe("2026-12-31");
    expect(parseCsvDate("05-01-2026")).toBe("2026-01-05");
    expect(parseCsvDate("2026-08-10 14:32:00")).toBe("2026-08-10");

    expect(parseCsvAmount("-1 234,56 PLN")).toEqual({ amount: 1234.56, isNegative: true });
    expect(parseCsvAmount("+500,00 zł")).toEqual({ amount: 500, isNegative: false });
    expect(parseCsvAmount("(150.00)")).toEqual({ amount: 150, isNegative: true });
    expect(parseCsvAmount("invalid")).toBeNull();
  });
});
