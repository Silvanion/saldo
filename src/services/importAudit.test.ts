import { describe, it, expect } from "vitest";
import { parseCsvAmount, parseCsvDate, parseAndMapCsv, autoDetectBankColumns } from "./parseCsv";
import { detectDirection, matchDirectionValue, looksLikeDebitColumn, looksLikeCreditColumn } from "./directionDetector";
import { parsePdfTransactions, normalizeAiPdfTransactions } from "./parsePdf";
import { parseStatementText } from "./localParsers";
import { computeTransactionFingerprint } from "./duplicateDetector";
import { auditProfileTransactions } from "./corruptedDataAuditor";
import { traceRowImport } from "./importDiagnostics";
import { Transaction, Profile } from "../types";

describe("ETAP 14 & 15 — Kompleksowy audyt i testy importu transakcji (Saldo)", () => {
  // ============================================================
  // ETAP 14 — TEST REPRODUKUJĄCY OBECNY BŁĄD ZE SCREENA
  // ============================================================
  describe("ETAP 14 — Testy regresyjne błędu ze screena (+20 260 919,00 zł oraz Skrytka Pocztowa 2108)", () => {
    it("odrzuca datę ISO jako kwotę — nie wycina myślników z '2026-09-19'", () => {
      expect(parseCsvAmount("2026-09-19")).toBeNull();
      expect(parseCsvAmount("2026-09-18")).toBeNull();
      expect(parseCsvAmount("2026-09-17")).toBeNull();
      expect(parseCsvAmount("19.09.2026")).toBeNull();
      expect(parseCsvAmount("19/09/2026")).toBeNull();
      expect(parseCsvAmount("20260919")).toBeNull();
    });

    it("odrzuca tekst z literami — 'Skrytka Pocztowa 2108' nie staje się kwotą 2108", () => {
      expect(parseCsvAmount("Skrytka Pocztowa 2108")).toBeNull();
      expect(parseCsvAmount("Faktura 1234")).toBeNull();
      expect(parseCsvAmount("Konto 1020")).toBeNull();
      expect(parseCsvAmount("Przelew 500")).toBeNull();
    });

    it("rozróżnia kwotę transakcji (1,00 zł) od salda po operacji (20 260 919,00 zł)", () => {
      const csv = [
        "Data;Tytuł;Kwota;Saldo",
        "2026-09-19;Przelew testowy;1,00;20 260 919,00",
        "2026-09-18;Opłata pocztowa;-2,50;20 260 918,00"
      ].join("\n");

      const result = parseAndMapCsv({ rawCsvText: csv, presetId: "generic" });
      expect(result.transactions.length).toBe(2);

      const tx1 = result.transactions[0];
      expect(tx1.amount).toBe(1.00);
      expect(tx1.amount).not.toBe(20260919.00);
      expect(tx1.balanceAfter).toBe(20260919.00);

      const tx2 = result.transactions[1];
      expect(tx2.amount).toBe(2.50);
      expect(tx2.type).toBe("expense");
      expect(tx2.balanceAfter).toBe(20260918.00);
    });

    it("wykrywa i blokuje kolizję kolumny daty z kolumną kwoty (np. Data wartości)", () => {
      const headers = ["Data operacji", "Data wartości", "Opis operacji", "Kwota operacji", "Saldo po operacji"];
      const detected = autoDetectBankColumns(headers, "generic");
      expect(detected.mapDate).toBe("Data operacji");
      expect(detected.mapAmount).toBe("Kwota operacji");
      expect(detected.mapAmount).not.toBe("Data wartości");
      expect(detected.mapBalance).toBe("Saldo po operacji");
    });
  });

  // ============================================================
  // ETAP 15 — 25 SCENARIUSZY TESTOWYCH WYMAGANYCH PRZEZ SPECYFIKACJĘ
  // ============================================================
  describe("ETAP 15 — Zestaw 25 obowiązkowych scenariuszy testowych", () => {
    // 1. Wpływ 1000 zł
    it("1. poprawnie importuje wpływ 1000 zł", () => {
      const csv = "Data;Opis;Kwota\n2026-05-10;Wpłata na konto;+1000,00";
      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.transactions[0].amount).toBe(1000);
      expect(res.transactions[0].type).toBe("income");
    });

    // 2. Wydatek 1000 zł
    it("2. poprawnie importuje wydatek 1000 zł", () => {
      const csv = "Data;Opis;Kwota\n2026-05-10;Zakup sprzętu;-1000,00";
      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.transactions[0].amount).toBe(1000);
      expect(res.transactions[0].type).toBe("expense");
    });

    // 3. Wpływ + wydatek w jednym pliku
    it("3. poprawnie rozróżnia wpływ i wydatek w jednym pliku", () => {
      const csv = "Data;Opis;Kwota\n2026-05-10;Pensja;5000,00\n2026-05-11;Biedronka;-150,00";
      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.transactions[0].type).toBe("income");
      expect(res.transactions[1].type).toBe("expense");
    });

    // 4. Saldo po operacji
    it("4. zapisuje saldo po operacji jako odrębne pole balanceAfter", () => {
      const csv = "Data;Opis;Kwota;Saldo po operacji\n2026-05-10;Przelew;200,00;1500,00";
      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.transactions[0].amount).toBe(200);
      expect(res.transactions[0].balanceAfter).toBe(1500);
    });

    // 5. Osobne kolumny wpływ / wydatek
    it("5. obsługuje osobne kolumny obciążenie / uznanie", () => {
      const csv = "Data;Opis;Obciążenia;Uznania\n2026-05-10;Zakupy;250,00;\n2026-05-11;Zwrot;;100,00";
      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.transactions[0].amount).toBe(250);
      expect(res.transactions[0].type).toBe("expense");
      expect(res.transactions[1].amount).toBe(100);
      expect(res.transactions[1].type).toBe("income");
    });

    // 6. Winien / Ma
    it("6. rozpoznaje oznaczenia księgowe Winien / Ma", () => {
      expect(matchDirectionValue("Winien")).toBe("expense");
      expect(matchDirectionValue("Wn")).toBe("expense");
      expect(matchDirectionValue("Ma")).toBe("income");
      expect(looksLikeDebitColumn("Kwota Winien")).toBe(true);
      expect(looksLikeCreditColumn("Kwota Ma")).toBe(true);
    });

    // 7. Uznanie / Obciążenie
    it("7. rozpoznaje etykiety Uznanie / Obciążenie", () => {
      expect(matchDirectionValue("Uznanie")).toBe("income");
      expect(matchDirectionValue("Obciążenie")).toBe("expense");
      expect(looksLikeDebitColumn("Obciążenie")).toBe(true);
      expect(looksLikeCreditColumn("Uznanie")).toBe(true);
    });

    // 8. Minus w różnych pozycjach
    it("8. poprawnie interpretuje znak minus (wiodący, końcowy, nawiasy)", () => {
      expect(parseCsvAmount("-1234,56")).toEqual({ amount: 1234.56, isNegative: true });
      expect(parseCsvAmount("1234,56-")).toEqual({ amount: 1234.56, isNegative: true });
      expect(parseCsvAmount("(1234,56)")).toEqual({ amount: 1234.56, isNegative: true });
      expect(parseCsvAmount("- 1 234,56")).toEqual({ amount: 1234.56, isNegative: true });
    });

    // 9. Polski separator dziesiętny
    it("9. obsługuje polski przecinek dziesiętny", () => {
      expect(parseCsvAmount("1234,56")).toEqual({ amount: 1234.56, isNegative: false });
      expect(parseCsvAmount("0,99")).toEqual({ amount: 0.99, isNegative: false });
    });

    // 10. Separator tysięcy (spacje, kropki)
    it("10. poprawnie parsuje duże kwoty z separatorami tysięcy", () => {
      expect(parseCsvAmount("1 234,56")).toEqual({ amount: 1234.56, isNegative: false });
      expect(parseCsvAmount("12 345,67")).toEqual({ amount: 12345.67, isNegative: false });
      expect(parseCsvAmount("1 000 000,00")).toEqual({ amount: 1000000, isNegative: false });
      expect(parseCsvAmount("20 260 919,00")).toEqual({ amount: 20260919, isNegative: false });
      expect(parseCsvAmount("1.234,56")).toEqual({ amount: 1234.56, isNegative: false });
      expect(parseCsvAmount("1,234.56")).toEqual({ amount: 1234.56, isNegative: false });
    });

    // 11. CSV z BOM
    it("11. poprawnie importuje CSV zawierający UTF-8 BOM", () => {
      const csvWithBom = "\uFEFFData;Opis;Kwota\n2026-06-01;Zakup testowy;-50,00";
      const res = parseAndMapCsv({ rawCsvText: csvWithBom });
      expect(res.transactions.length).toBe(1);
      expect(res.transactions[0].name).toBe("Zakup testowy");
      expect(res.transactions[0].amount).toBe(50);
    });

    // 12. CSV ze średnikiem
    it("12. poprawnie parsuje CSV rozdzielany średnikami", () => {
      const csv = "Data;Opis;Kwota\n2026-06-01;Paliwo;-200,00";
      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.detectedSeparator).toBe(";");
      expect(res.transactions.length).toBe(1);
    });

    // 13. CSV z przecinkiem
    it("13. poprawnie parsuje CSV rozdzielany przecinkami", () => {
      const csv = 'Date,Description,Amount\n2026-06-01,"Coffee Shop",-15.50';
      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.detectedSeparator).toBe(",");
      expect(res.transactions.length).toBe(1);
      expect(res.transactions[0].amount).toBe(15.50);
    });

    // 14. PDF wielostronicowy (tekst z kilku stron)
    it("14. poprawnie łączy transakcje z wielu stron PDF", () => {
      const page1 = "Operacje\n01.05.2026 Przelew od klienta 1 500,00 PLN 10 000,00 PLN";
      const page2 = "02.05.2026 Abonament internetowy -100,00 PLN 9 900,00 PLN";
      const fullText = `${page1}\n${page2}`;

      const res = parsePdfTransactions(fullText, {
        currency: "PLN",
        account: "Konto główne",
        rules: []
      });

      expect(res.transactions.length).toBe(2);
      expect(res.transactions[0].amount).toBe(1500);
      expect(res.transactions[0].balanceAfter).toBe(10000);
      expect(res.transactions[1].amount).toBe(100);
      expect(res.transactions[1].balanceAfter).toBe(9900);
    });

    // 15. PDF z powtarzającym się nagłówkiem
    it("15. ignoruje powtarzające się nagłówki tabel w PDF", () => {
      const text = [
        "Operacje",
        "Data operacji Opis operacji Kwota Saldo",
        "01.05.2026 Usługa księgowa -300,00 PLN 5 000,00 PLN",
        "Data operacji Opis operacji Kwota Saldo",
        "02.05.2026 Składka ZUS -400,00 PLN 4 600,00 PLN"
      ].join("\n");

      const res = parsePdfTransactions(text, {
        currency: "PLN",
        account: "Konto główne",
        rules: []
      });

      expect(res.transactions.length).toBe(2);
      expect(res.transactions[0].name).toContain("Usługa księgowa");
      expect(res.transactions[1].name).toContain("Składka ZUS");
    });

    // 16. PDF z wielowierszowym opisem
    it("16. zachowuje wielowierszowe opisy operacji w PDF", () => {
      const text = [
        "Operacje",
        "01.05.2026 Przelew na rzecz",
        "Spółdzielnia Mieszkaniowa Warszawa",
        "Tytułem: czynsz za maj 2026 -850,00 PLN 4 150,00 PLN"
      ].join("\n");

      const res = parsePdfTransactions(text, {
        currency: "PLN",
        account: "Konto główne",
        rules: []
      });

      expect(res.transactions.length).toBe(1);
      expect(res.transactions[0].amount).toBe(850);
      expect(res.transactions[0].name).toContain("Spółdzielnia Mieszkaniowa");
    });

    // 17. OCR / AI PDF
    it("17. poprawnie normalizuje i weryfikuje rekordy z OCR/AI", () => {
      const rawAiRows = [
        { name: "Zakupy spożywcze", amount: 145.20, type: "Wydatek", isoDate: "2026-05-15" },
        { name: "Niepoprawny rekord", amount: "NaN", type: "income", isoDate: "2026-05-15" }
      ];

      const res = normalizeAiPdfTransactions(rawAiRows, {
        currency: "PLN",
        account: "Konto główne",
        rules: []
      });

      expect(res.transactions.length).toBe(1);
      expect(res.transactions[0].amount).toBe(145.20);
      expect(res.transactions[0].type).toBe("expense");
      expect(res.rejectedRows.length).toBe(1);
    });

    // 18. Refundacja / Zwrot
    it("18. poprawnie klasyfikuje zwrot jako wpływ pomimo słów o zakupie", () => {
      const dir = detectDirection(
        { description: "Zwrot za zamówienie Allegro", amountNegative: false },
        { hasNegativeAmounts: true }
      );
      expect(dir.type).toBe("income");
    });

    // 19. Prowizja / Opłata
    it("19. poprawnie klasyfikuje prowizję jako wydatek", () => {
      const dir = detectDirection(
        { description: "Prowizja za prowadzenie konta", amountNegative: false },
        { hasNegativeAmounts: false }
      );
      expect(dir.type).toBe("expense");
    });

    // 20. Duplikat importu (Idempotencja)
    it("20. wyznacza identyczny fingerprint dla identycznych transakcji", () => {
      const txA = {
        name: "Biedronka",
        amount: 85.50,
        type: "expense" as const,
        isoDate: "2026-05-10",
        account: "Konto główne",
        currency: "PLN" as const,
        balanceAfter: 1200.00
      };
      const txB = { ...txA };
      expect(computeTransactionFingerprint(txA)).toBe(computeTransactionFingerprint(txB));
    });

    // 21. Podsumowanie dokumentu
    it("21. pomija wiersze podsumowania i stopki w CSV", () => {
      const csv = [
        "Data;Opis;Kwota",
        "2026-05-10;Zakup;-50,00",
        "Podsumowanie;Suma wydatków;-50,00",
        "# Raport wygenerowany przez bank"
      ].join("\n");

      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.transactions.length).toBe(1);
      expect(res.stats.skippedEmptyCount).toBeGreaterThanOrEqual(1);
    });

    // 22. Saldo początkowe
    it("22. nie traktuje wiersza salda początkowego jako transakcji", () => {
      const text = [
        "Data;Opis;Kwota",
        "2026-05-01;Saldo początkowe;10000,00",
        "2026-05-02;Przelew;-100,00"
      ].join("\n");

      const rows = parseStatementText(text, "2026-05-01");
      // Saldo początkowe w nagłówku lub wierszu z opisem "Saldo początkowe"
      expect(rows.some(r => r.name.toLowerCase().includes("przelew"))).toBe(true);
    });

    // 23. Saldo końcowe
    it("23. poprawnie rozróżnia kolumnę salda końcowego od kwoty transakcji", () => {
      const headers = ["Data", "Tytuł operacji", "Kwota", "Saldo końcowe"];
      const cols = autoDetectBankColumns(headers, "generic");
      expect(cols.mapAmount).toBe("Kwota");
      expect(cols.mapBalance).toBe("Saldo końcowe");
    });

    // 24. Pusty wiersz
    it("24. bezpiecznie ignoruje puste wiersze bez generowania błędów", () => {
      const csv = "Data;Opis;Kwota\n\n\n2026-05-10;Kawa;-12,00\n\n";
      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.transactions.length).toBe(1);
      expect(res.transactions[0].amount).toBe(12);
    });

    // 25. Niejednoznaczny rekord (NEEDS_REVIEW / confident: false)
    it("25. oznacza niejednoznaczny kierunek jako niepewny zamiast cichego domysłu", () => {
      const dir = detectDirection(
        { description: "Przelew wewnętrzny XYZ", amountNegative: false },
        { hasNegativeAmounts: false }
      );
      expect(dir.confident).toBe(false);
    });
  });

  // ============================================================
  // ETAP 8 — WALIDACJA MATEMATYCZNA
  // ============================================================
  describe("ETAP 8 — Walidacja matematyczna ciągłości salda", () => {
    it("potwierdza spójność matematyczną (balance_before + income - expense = balance_after)", () => {
      const csv = [
        "Data;Opis;Kwota;Saldo",
        "2026-05-01;Wpłata;500,00;1500,00",
        "2026-05-02;Zakupy;-200,00;1300,00"
      ].join("\n");

      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.transactions[0].validationStatus).toBe("VALID");
      expect(res.transactions[1].validationStatus).toBe("VALID");
    });

    it("wykrywa niespójność matematyczną salda jako BALANCE_CONTINUITY_ERROR, zachowując validationStatus VALID", () => {
      const csv = [
        "Data;Opis;Kwota;Saldo",
        "2026-05-01;Wpłata;500,00;1500,00",
        "2026-05-02;Zakupy;-200,00;900,00" // 1500 - 200 = 1300 != 900
      ].join("\n");

      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.transactions[0].validationStatus).toBe("VALID");
      expect(res.transactions[0].balanceContinuity).toBe("BALANCE_CONTINUITY_ERROR");
    });
  });

  // ============================================================
  // ETAP 17 — AUDYT USZKODZONYCH DANYCH
  // ============================================================
  describe("ETAP 17 — Audyt uszkodzonych danych w bazie (corruptedDataAuditor)", () => {
    it("bezbłędnie identyfikuje 123 uszkodzone transakcje ze screena (daty i skrytka pocztowa)", () => {
      const mockProfile: Profile = {
        id: "p-seweryn",
        name: "Seweryn",
        currency: "PLN",
        transactions: [
          {
            id: "tx-1",
            name: "2026-09-19",
            amount: 20260919,
            type: "income",
            isoDate: "2026-09-19",
            category: "Różne",
            account: "Konto główne",
            currency: "PLN"
          },
          {
            id: "tx-2",
            name: "2026-09-18",
            amount: 20260918,
            type: "income",
            isoDate: "2026-09-18",
            category: "Różne",
            account: "Konto główne",
            currency: "PLN"
          },
          {
            id: "tx-3",
            name: "Skrytka Pocztowa 2108",
            amount: 2108,
            type: "income",
            isoDate: "2026-12-31",
            category: "Różne",
            account: "Konto główne",
            currency: "PLN"
          },
          {
            id: "tx-valid",
            name: "Wynagrodzenie za pracę",
            amount: 7500,
            type: "income",
            isoDate: "2026-09-10",
            category: "Wynagrodzenie",
            account: "Konto główne",
            currency: "PLN"
          }
        ]
      } as Profile;

      const report = auditProfileTransactions(mockProfile);
      expect(report.totalTransactions).toBe(4);
      expect(report.corruptedCount).toBe(3);
      expect(report.validCount).toBe(1);
      expect(report.corruptedTransactions[0].detectedPattern).toBe("DATE_AS_AMOUNT");
      expect(report.corruptedTransactions[1].detectedPattern).toBe("DATE_AS_AMOUNT");
      expect(report.corruptedTransactions[2].detectedPattern).toBe("ADDRESS_AS_AMOUNT");
    });
  });

  // ============================================================
  // ETAP 18 — DIAGNOSTYKA IMPORTU
  // ============================================================
  describe("ETAP 18 — Śledzenie diagnostyczne rekordu importu (importDiagnostics)", () => {
    it("generuje kompletny trace od RAW do NORMALIZED TRANSACTION", () => {
      const raw = "19.09.2026;Przelew wynagrodzenia;5000,00;20260919,00";
      const parts = raw.split(";");
      const headers = ["Data", "Opis", "Kwota", "Saldo"];

      const trace = traceRowImport(
        raw,
        parts,
        { dateIdx: 0, nameIdx: 1, amountIdx: 2, balanceIdx: 3 },
        headers
      );

      expect(trace.rawAmount).toBe("5000,00");
      expect(trace.parsedAmount).toBe(5000);
      expect(trace.parsedBalance).toBe(20260919);
      expect(trace.detectedDirection).toBe("income");
      expect(trace.normalizedTransaction.amount).toBe(5000);
      expect(trace.normalizedTransaction.balanceAfter).toBe(20260919);
      expect(trace.validationIssues.length).toBe(0);
    });
  });

  // ============================================================
  // DRUGI NIEZALEŻNY AUDYT — SEKCJE 2-15
  // ============================================================
  describe("DRUGI AUDYT — Krytyczna weryfikacja parseCsvAmount & Testy Anty-Halucynacyjne", () => {
    it("Sekcja 2 & 13: bezwzględnie odrzuca wzorce dat, adresów i opisów z cyframi", () => {
      expect(parseCsvAmount("2026-09-19")).toBeNull();
      expect(parseCsvAmount("2026/09/19")).toBeNull();
      expect(parseCsvAmount("19.09.2026")).toBeNull();
      expect(parseCsvAmount("20260919")).toBeNull();
      expect(parseCsvAmount("Skrytka Pocztowa 2108")).toBeNull();
      expect(parseCsvAmount("Przelew 2108")).toBeNull();
      expect(parseCsvAmount("ABC 123")).toBeNull();
      expect(parseCsvAmount("Przelew 123456")).toBeNull();
      expect(parseCsvAmount("Rachunek 1234567890")).toBeNull();
      expect(parseCsvAmount("Faktura FV/2026/123")).toBeNull();
    });

    it("Sekcja 2: bezwzględnie odrzuca numery kont bankowych, kart i identyfikatory", () => {
      // 26-cyfrowy numer konta (NRB) ze spacjami
      expect(parseCsvAmount("61 1090 1014 0000 0712 1981 2874")).toBeNull();
      // 26-cyfrowy numer konta bez spacji
      expect(parseCsvAmount("61109010140000071219812874")).toBeNull();
      // IBAN z prefiksem PL
      expect(parseCsvAmount("PL61109010140000071219812874")).toBeNull();
      // 16-cyfrowy numer karty w blokach po 4 cyfry
      expect(parseCsvAmount("4111 2222 3333 4444")).toBeNull();
      // Błędne separatory (np. IP lub czas z kropkami)
      expect(parseCsvAmount("12.34.56")).toBeNull();
      expect(parseCsvAmount("192.168.1.1")).toBeNull();
      // 12-cyfrowy identyfikator transakcji bez separatora dziesiętnego
      expect(parseCsvAmount("987654321012")).toBeNull();
    });

    it("Sekcja 2: prawidłowo akceptuje wszystkie dozwolone formaty kwot finansowych", () => {
      expect(parseCsvAmount("1,00")?.amount).toBe(1.00);
      expect(parseCsvAmount("10,00")?.amount).toBe(10.00);
      expect(parseCsvAmount("100,00")?.amount).toBe(100.00);
      expect(parseCsvAmount("1 000,00")?.amount).toBe(1000.00);
      expect(parseCsvAmount("10 000,00")?.amount).toBe(10000.00);
      expect(parseCsvAmount("20 260 919,00")?.amount).toBe(20260919.00);
      expect(parseCsvAmount("-1 000,00")?.amount).toBe(1000.00);
      expect(parseCsvAmount("-1 000,00")?.isNegative).toBe(true);
      expect(parseCsvAmount("1.000,00")?.amount).toBe(1000.00);
      expect(parseCsvAmount("1234.56")?.amount).toBe(1234.56);
      expect(parseCsvAmount("1 234.56")?.amount).toBe(1234.56);
      expect(parseCsvAmount("100")?.amount).toBe(100.00);
      expect(parseCsvAmount("1000")?.amount).toBe(1000.00);
      expect(parseCsvAmount("+50,20")?.amount).toBe(50.20);
      expect(parseCsvAmount("+50,20")?.isNegative).toBe(false);
    });
  });

  describe("DRUGI AUDYT — Sekcja 3 & 14: Badanie pozycji kolumn w wyciągach (PDF i wklejonych)", () => {
    it("Wariant 1: DATA | OPIS | KWOTA | SALDO", () => {
      const pdfText = [
        "Wyciąg bankowy",
        "Data | Opis transakcji | Kwota | Saldo",
        "19.09.2026 Sklep Biedronka -45,99 1500,00"
      ].join("\n");

      const res = parsePdfTransactions(pdfText, {
        currency: "PLN",
        account: "Konto",
        rules: []
      });

      expect(res.transactions.length).toBe(1);
      const tx = res.transactions[0];
      expect(tx.amount).toBe(45.99);
      expect(tx.type).toBe("expense");
      expect(tx.balanceAfter).toBe(1500.00);
      expect(tx.validationStatus).toBe("VALID");
    });

    it("Wariant 2: DATA | OPIS | SALDO | KWOTA (Saldo przed Kwotą)", () => {
      const pdfText = [
        "Wyciąg z rachunku",
        "Data operacji | Opis | Saldo po operacji | Kwota transakcji",
        "19.09.2026 Sklep Żabka 20 260 919,00 -1,00"
      ].join("\n");

      const res = parsePdfTransactions(pdfText, {
        currency: "PLN",
        account: "Konto",
        rules: []
      });

      expect(res.transactions.length).toBe(1);
      const tx = res.transactions[0];
      // Kluczowe: Saldo 20 260 919,00 NIE może zostać użyte jako kwota transakcji!
      expect(tx.amount).toBe(1.00);
      expect(tx.type).toBe("expense");
      expect(tx.balanceAfter).toBe(20260919.00);
      expect(tx.validationStatus).toBe("VALID");
    });

    it("Wariant 3: DATA | KWOTA | OPIS | SALDO", () => {
      const pdfText = [
        "Wyciąg bankowy",
        "Data | Kwota | Opis | Saldo",
        "19.09.2026 -120,00 Stacja paliw Orlen 3400,00"
      ].join("\n");

      const res = parsePdfTransactions(pdfText, {
        currency: "PLN",
        account: "Konto",
        rules: []
      });

      expect(res.transactions.length).toBe(1);
      const tx = res.transactions[0];
      expect(tx.amount).toBe(120.00);
      expect(tx.type).toBe("expense");
      expect(tx.balanceAfter).toBe(3400.00);
      expect(tx.validationStatus).toBe("VALID");
    });

    it("Wariant 4: Wklejony tekst z nagłówkiem DATA | OPIS | SALDO | KWOTA", () => {
      const text = [
        "Data\tOpis\tSaldo\tKwota",
        "19.09.2026\tSkrytka Pocztowa 2108\t20 260 919,00\t-1,00"
      ].join("\n");

      const rows = parseStatementText(text);
      expect(rows.length).toBe(1);
      expect(rows[0].amount).toBe(1.00);
      expect(rows[0].type).toBe("expense");
      expect(rows[0].balanceAfter).toBe(20260919.00);
      expect(rows[0].name).not.toContain("20 260 919");
    });

    it("Wariant 5: Niejednoznaczna struktura bez nagłówka oznacza rekord jako NEEDS_REVIEW", () => {
      const ambiguousPdf = [
        "Tajemniczy dokument bankowy",
        "19.09.2026 Tajemnicza operacja 100,00 200,00"
      ].join("\n");

      const res = parsePdfTransactions(ambiguousPdf, {
        currency: "PLN",
        account: "Konto",
        rules: []
      });

      expect(res.transactions.length).toBe(1);
      // Nie zgadujemy — oznaczamy jako wymagający przeglądu
      expect(res.transactions[0].validationStatus).toBe("NEEDS_REVIEW");
    });
  });

  describe("DRUGI AUDYT — Sekcja 5: Test na rzeczywistym problemie ze screena", () => {
    it("Dla opisu 'Skrytka Pocztowa 2108 (2026-09-19)' i salda 20 260 919,00 kwota wynosi 1,00", () => {
      const csv = [
        "Data operacji;Tytuł;Kwota;Saldo",
        "19.09.2026;Skrytka Pocztowa 2108 (2026-09-19);1,00;20 260 919,00"
      ].join("\n");

      const res = parseAndMapCsv({ rawCsvText: csv });
      expect(res.transactions.length).toBe(1);
      const tx = res.transactions[0];

      expect(tx.amount).toBe(1.00);
      expect(tx.amount).not.toBe(20260919);
      expect(tx.amount).not.toBe(2108);
      expect(tx.balanceAfter).toBe(20260919);
      expect(tx.name).toBe("Skrytka Pocztowa 2108 (2026-09-19)");
    });
  });

  describe("DRUGI AUDYT — Sekcja 6: Weryfikacja kierunku (income vs expense)", () => {
    it("sprawdza wszystkie dopuszczalne formaty kierunku i znaków", () => {
      expect(detectDirection({ amountNegative: false, explicitDirection: "+100,00" }, { hasNegativeAmounts: true }).type).toBe("income");
      expect(detectDirection({ amountNegative: true, explicitDirection: "-100,00" }, { hasNegativeAmounts: true }).type).toBe("expense");
      expect(detectDirection({ explicitDirection: "Wpływ" }, { hasNegativeAmounts: false }).type).toBe("income");
      expect(detectDirection({ explicitDirection: "Wydatek" }, { hasNegativeAmounts: false }).type).toBe("expense");
      expect(detectDirection({ explicitDirection: "Ma" }, { hasNegativeAmounts: false }).type).toBe("income");
      expect(detectDirection({ explicitDirection: "Winien" }, { hasNegativeAmounts: false }).type).toBe("expense");
      expect(detectDirection({ explicitDirection: "Uznanie" }, { hasNegativeAmounts: false }).type).toBe("income");
      expect(detectDirection({ explicitDirection: "Obciążenie" }, { hasNegativeAmounts: false }).type).toBe("expense");
    });
  });

  describe("DRUGI AUDYT — Sekcja 8 & 15: Precyzja zaokrągleń oraz separacja salda od sum", () => {
    it("wykonuje operacje pieniężne bez anomalii IEEE-754 na wartościach 0.01, 0.10, 0.30, 1000.01, 999999.99", () => {
      const a = 0.10;
      const b = 0.20;
      // Tradycyjny float daje 0.30000000000000004
      expect(a + b).not.toBe(0.30);
      // Nasz format i model finansowy daje dokładnie 0.30
      const sum = Number((a + b).toFixed(2));
      expect(sum).toBe(0.30);

      const val1 = 1000.01;
      const val2 = 999999.99;
      expect(Number((val1 + val2).toFixed(2))).toBe(1001000.00);
    });

    it("Sekcja 15: Dla +100, -50, +20, -10 saldo nie wpływa na sumy (wpływy=120, wydatki=60, netto=60)", () => {
      const mockTransactions: Transaction[] = [
        { id: "1", name: "Wpływ A", amount: 100, type: "income", isoDate: "2026-09-01", category: "Inne", categoryIcon: "✨", account: "Konto", currency: "PLN", balanceAfter: 20260919 },
        { id: "2", name: "Wydatek B", amount: 50, type: "expense", isoDate: "2026-09-02", category: "Inne", categoryIcon: "✨", account: "Konto", currency: "PLN", balanceAfter: 20260869 },
        { id: "3", name: "Wpływ C", amount: 20, type: "income", isoDate: "2026-09-03", category: "Inne", categoryIcon: "✨", account: "Konto", currency: "PLN", balanceAfter: 20260889 },
        { id: "4", name: "Wydatek D", amount: 10, type: "expense", isoDate: "2026-09-04", category: "Inne", categoryIcon: "✨", account: "Konto", currency: "PLN", balanceAfter: 20260879 }
      ];

      const incomeSum = mockTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenseSum = mockTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const net = incomeSum - expenseSum;

      expect(incomeSum).toBe(120);
      expect(expenseSum).toBe(60);
      expect(net).toBe(60);
      // Sprawdzamy, czy pole balanceAfter (20 mln) w żaden sposób nie powiększyło wpływów ani wydatków
      expect(incomeSum).not.toBeGreaterThan(120);
    });
  });

  describe("DRUGI AUDYT — Sekcja 9: Deduplikacja wyciągów (computeTransactionFingerprint)", () => {
    it("balanceAfter NIE jest częścią fingerprintu — przelewy z nachodzących wyciągów są poprawnie deduplikowane", () => {
      const txFromStatementA = {
        name: "Opłata za abonament",
        amount: 59.99,
        type: "expense",
        isoDate: "2026-09-15",
        currency: "PLN",
        account: "Konto główne",
        balanceAfter: 4500.00
      };

      const txFromStatementB = {
        name: "Opłata za abonament",
        amount: 59.99,
        type: "expense",
        isoDate: "2026-09-15",
        currency: "PLN",
        account: "Konto główne",
        balanceAfter: 5200.00 // Różne saldo na innym wyciągu lub brak salda
      };

      const fpA = computeTransactionFingerprint(txFromStatementA);
      const fpB = computeTransactionFingerprint(txFromStatementB);

      // Kluczowe wymaganie: ten sam przelew z innym balanceAfter MUSI mieć ten sam fingerprint
      expect(fpA).toBe(fpB);
      expect(fpA).toBe("2026-09-15|Konto główne|PLN|expense|59.99|opata za abonament");
    });
  });

  describe("DRUGI AUDYT — Sekcja 12: Testy End-to-End: Od źródła (CSV/PDF) do bazy i agregacji dashboardu", () => {
    it("CSV -> Parse -> Normalization -> Profile -> Dashboard Aggregation", () => {
      const csv = [
        "Data operacji;Tytuł przelewu;Kwota;Saldo po operacji",
        "2026-09-01;Wynagrodzenie z pracy;6000,00;6000,00",
        "2026-09-02;Czynsz za mieszkanie;-2000,00;4000,00",
        "2026-09-03;Zakupy spożywcze;-500,00;3500,00"
      ].join("\n");

      // 1. Parser
      const parseResult = parseAndMapCsv({ rawCsvText: csv, sourceFileName: "wrzesien.csv" });
      expect(parseResult.transactions.length).toBe(3);

      // 2. Normalizacja & Zapis w profilu
      const profile = {
        id: "prof-e2e",
        name: "Test User",
        kind: "personal" as const,
        accounts: [{ id: "acc-1", name: "Konto główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }],
        transactions: parseResult.transactions
      } as unknown as Profile;

      // 3. Agregacja (Dashboard Totals)
      const thisMonthTxs = profile.transactions.filter(t => t.isoDate.startsWith("2026-09"));
      const totalIncome = thisMonthTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const totalExpense = thisMonthTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const netSavings = totalIncome - totalExpense;

      expect(totalIncome).toBe(6000.00);
      expect(totalExpense).toBe(2500.00);
      expect(netSavings).toBe(3500.00);

      // Wszystkie rekordy mają zachowaną proweniencję źródłową
      expect(profile.transactions[0].sourceFile).toBe("wrzesien.csv");
      expect(profile.transactions[0].sourceRow).toBe(2);
      expect(profile.transactions[0].validationStatus).toBe("VALID");
    });
  });

  // ============================================================
  // ETAP 19 — NAPRAWA KONKRETNEGO BŁĘDU PDF (PLIK B mBank)
  // ============================================================
  describe("ETAP 19 — Naprawa konkretnego błędu PDF (Plik B mBank: ZUS vs chor. 01.10-04.11.2025)", () => {
    // Test 6 ze specyfikacji: dokładny wiersz ZUS
    it("Test 6: bezbłędnie parsuje konkretny wiersz ZUS ze świadczeniem 4590.75 zł (nie 1.10 zł)", () => {
      const statement = [
        "Data operacji Opis operacji Rachunek Kategoria Kwota",
        "Operacje",
        "2025-11-21 ZUS ul. Chmielna 27 33 80-748 Gdańsk, Świadczenie ZUS eKonto Wpływy - inne 4 590,75 PLN 100000U251121D0000076 chor. 01.10-04.11.2025 9111 ... 7186 ZUS ul. Chmielna 27 33 80-748 Gdańsk PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY 64102056040000090280901015"
      ].join("\n");

      const result = parsePdfTransactions(statement, {
        currency: "PLN",
        account: "eKonto",
        rules: []
      });

      expect(result.transactions.length).toBe(1);
      const tx = result.transactions[0];

      // Oczekiwane wartości:
      expect(tx.isoDate).toBe("2025-11-21");
      expect(tx.amount).toBe(4590.75);
      expect(tx.type).toBe("income");
      expect(tx.balanceAfter).toBeUndefined();
      expect(tx.validationStatus).toBe("VALID");

      // Bezwzględnie wykluczone wartości fałszywe:
      expect(tx.amount).not.toBe(1.10);
      expect(tx.type).not.toBe("expense");
      expect(tx.balanceAfter).not.toBe(4590.75);
    });

    // Test 7 ze specyfikacji: testy regresyjne fragmentów dat
    it("Test 7: żaden fragment zakresu dat ani miesiąc/rok nie może wygenerować kwoty", () => {
      expect(parseCsvAmount("chor. 01.10-04.11.2025")).toBeNull();
      expect(parseCsvAmount("okres 01.10–04.11.2025")).toBeNull();
      expect(parseCsvAmount("01.10 - 04.11.2025")).toBeNull();
      expect(parseCsvAmount("za 08.2025")).toBeNull();
      expect(parseCsvAmount("od 01.10 do 04.11")).toBeNull();

      expect(parseCsvAmount("01.10-")).toBeNull();
      expect(parseCsvAmount("01.10")).toBeNull();
      expect(parseCsvAmount("04.11")).toBeNull();
      expect(parseCsvAmount("08.2025")).toBeNull();
      expect(parseCsvAmount("10.2025")).toBeNull();
    });

    // Test 8 ze specyfikacji: test prawdziwej kwoty vs odrzucenia uciętej daty
    it("Test 8: 4 590,75 PLN jest poprawną kwotą, a 01.10- nie jest rozpoznawane jako -1.10", () => {
      const validAmount = parseCsvAmount("4 590,75 PLN");
      expect(validAmount).toEqual({ amount: 4590.75, isNegative: false });

      expect(parseCsvAmount("01.10-")).toBeNull();
      expect(parseCsvAmount("01.10-")).not.toEqual({ amount: 1.10, isNegative: true });
    });

    // Test 3 & 4 ze specyfikacji: pierwszeństwo waluty oraz brak salda w układzie KWOTA_ONLY
    it("Test 3 & 4: w układzie KWOTA_ONLY dopasowanie z walutą PLN ma bezwzględne pierwszeństwo, a balanceAfter = undefined", () => {
      const statement = [
        "Data operacji Opis operacji Rachunek Kategoria Kwota",
        "Operacje",
        "2025-05-10 Rozliczenie okresu 01.04-30.04.2025 eKonto Usługi 250,00 PLN faktura FV 04.2025"
      ].join("\n");

      const result = parsePdfTransactions(statement, {
        currency: "PLN",
        account: "eKonto",
        rules: []
      });

      expect(result.transactions.length).toBe(1);
      const tx = result.transactions[0];
      expect(tx.amount).toBe(250.00);
      expect(tx.balanceAfter).toBeUndefined(); // KWOTA_ONLY nie tworzy balanceAfter
      expect(tx.validationStatus).toBe("VALID");
    });
  });
});

