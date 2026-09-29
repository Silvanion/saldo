import { describe, it, expect } from "vitest";
import { parseAndMapCsv, parseCsvDate, detectCsvSeparator } from "./services/parseCsv";
import { parsePdfTransactions } from "./services/parsePdf";
import { detectZenLayout } from "./services/zenImport";

// Struktura odtworzona z prawdziwego eksportu Zen; dane osobowe i numery są zmyślone.
const CSV = `PLN – Account Statement
Generated: 29 Sep 2026
Date: 1 Sep 2026 to 30 Sep 2026

Account owner
JAN MAREK KOWALSKI
Ulica Testowa 1/2
00-001 Miasto
Poland

Account details
Local IBAN/Account Number: 00000000000000000000000000
Local BIC/SWIFT/SORT CODE: TESTPLPK
Global IBAN: GB00TEST00000000000000
Global BIC/SWIFT: TESTGB3L
Currency: PLN

Total income:,330.00,PLN
Opening balance:,34.01,PLN
Total outcome:,-324.69,PLN
Closing balance:,39.32,PLN


Transactions:
Date,Transaction type,Description,Settlement amount,Settlement currency,Original amount,Original currency,Currency rate,Fee description,Fee amount,Fee currency,Balance
1 Sep 2026,Incoming transfer,"ZEN.COM UAB,   ZEN account top-up, Card **0000 ",50.00,PLN,50.00,PLN,1.000000,,,,84.01
3 Sep 2026,Card payment,"Sklep Testowy Dublin,IRL CARD: MASTERCARD *0001",-23.99,PLN,-23.99,PLN,1.000000,,,,60.02
10 Sep 2026,Incoming transfer,"JAN KOWALSKI, UL.TESTOWA 1 M.2 00-001 MIASTO PL ZEN PL00000000000000000000000000",71.00,PLN,71.00,PLN,,,,,131.02
11 Sep 2026,Exchange money,Currency exchange transaction,-25.03,PLN,-5.76,EUR,0.230124,,,,105.99
26 Sep 2026,Card payment,"FIRMA TESTOWA* SUBSKRYPCJA SAN FRANCISCO,USA CARD: MASTERCARD *0002",-89.00,PLN,-89.00,PLN,1.000000,,,,16.99

This is a computer-generated document. No signature is required.
`;

describe("import Zen (CSV)", () => {
  const result = parseAndMapCsv({ rawCsvText: CSV, presetId: "generic" } as any);

  it("długa preambuła bez separatorów nie myli wykrywania separatora", () => {
    expect(detectCsvSeparator(CSV)).toBe(",");
    expect(result.detectedSeparator).toBe(",");
    expect(result.transactions).toHaveLength(5);
    expect(result.rejectedRows).toHaveLength(0);
  });

  it("daty w formacie 'D Mon YYYY' nie cofają się o dzień w strefie +01/+02", () => {
    expect(parseCsvDate("1 Sep 2026")).toBe("2026-09-01");
    expect(parseCsvDate("31 Dec 2025")).toBe("2025-12-31");
    expect(parseCsvDate("3 September 2026")).toBe("2026-09-03");
    expect(parseCsvDate("31 Feb 2026")).toBeNull();
    expect(result.transactions.map((t) => t.isoDate)).toEqual(["2026-09-01", "2026-09-03", "2026-09-10", "2026-09-11", "2026-09-26"]);
  });

  it("sumy zgadzają się z podsumowaniem banku, a walutą jest waluta rozliczenia", () => {
    const sum = (type: string) => result.transactions.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0);
    expect(sum("income")).toBeCloseTo(121, 2);
    expect(sum("expense")).toBeCloseTo(23.99 + 25.03 + 89, 2);
    expect(result.transactions.every((t) => t.currency === "PLN")).toBe(true);
  });

  it("nazwy bez końcówek kart, kodu kraju i adresu właściciela", () => {
    expect(result.transactions.map((t) => t.name)).toEqual([
      "ZEN.COM UAB, ZEN account top-up",
      "Sklep Testowy Dublin",
      "JAN KOWALSKI",
      "Currency exchange transaction",
      "FIRMA TESTOWA* SUBSKRYPCJA SAN FRANCISCO"
    ]);
    expect(result.transactions.some((t) => /Ulica|TESTOWA 1|\*000/.test(t.name))).toBe(false);
  });

  it("oznacza zasilenie kartą, przelew od właściciela i wymianę walut, ale nie zwykłą płatność", () => {
    const hinted = result.transactions.filter((t) => result.importHints[t.id]).map((t) => t.name);
    expect(hinted).toEqual(["ZEN.COM UAB, ZEN account top-up", "JAN KOWALSKI", "Currency exchange transaction"]);
  });

  it("rozpoznaje układ tylko dla eksportu Zen", () => {
    expect(detectZenLayout(["Date", "Description", "Amount"])).toBeNull();
  });
});

const PDF_TEXT = `PLN – Account Statement
Generated: 29 Sep 2026
ACCOUNT OWNER
JAN MAREK KOWALSKI
Transactions:
BOOKING DATE SETTLEMENT AMOUNT/ORIGINAL AMOUNT
TRANSACTION DATE DESCRIPTION CURRENCY RATE/FEE BALANCE
1 Sep 2026 Incoming transfer PLN 50.00 PLN 84.01
1 Sep 2026 ZEN.COM UAB,
ZEN account top-up, Card **0000
3 Sep 2026 Card payment PLN -23.99 PLN 60.02
31 Aug 2026 Sklep Testowy
Dublin,IRL
CARD: MASTERCARD *0001
UAB ZEN.COM is an electronic money institution under the supervision of the Central Bank of Lithuania.
Registered address: Konstitucijos av. 18B, LT-09308 Vilnius, Lithuania.
1 of 2
10 Sep 2026 Incoming transfer PLN 1,071.00 PLN 1,131.02
10 Sep 2026 JAN KOWALSKI, UL.TESTOWA 1
M.2 00-001 MIASTO PL
ZEN
PL00000000000000000000000000
11 Sep 2026 Exchange money PLN -25.03 PLN 1,105.99
11 Sep 2026 Currency exchange transaction EUR -5.76
1 PLN = 0.230124 EUR`;

describe("import Zen (PDF)", () => {
  const result = parsePdfTransactions(PDF_TEXT, { currency: "PLN", account: "Konto", rules: [] });

  it("czyta dwuliniowe bloki, pomija stopki stron i bierze datę księgowania", () => {
    expect(result.transactions).toHaveLength(4);
    expect(result.rejectedRows).toHaveLength(0);
    // 3 Sep to data księgowania (transakcja z 31 Aug) — tak samo jak w CSV
    expect(result.transactions[1].isoDate).toBe("2026-09-03");
  });

  it("kwoty z separatorem tysięcy, saldo i nazwy", () => {
    expect(result.transactions.map((t) => (t.type === "expense" ? -t.amount : t.amount))).toEqual([50, -23.99, 1071, -25.03]);
    expect(result.transactions.map((t) => t.balanceAfter)).toEqual([84.01, 60.02, 1131.02, 1105.99]);
    expect(result.transactions.map((t) => t.name)).toEqual([
      "ZEN.COM UAB, ZEN account top-up",
      "Sklep Testowy Dublin",
      "JAN KOWALSKI",
      "Currency exchange transaction"
    ]);
  });

  it("ostrzeżenia jak w CSV; właściciel konta pochodzi z nagłówka PDF", () => {
    const kinds = result.transactions.map((t) => result.importHints?.[t.id]?.kind ?? null);
    expect(kinds).toEqual(["own-transfer", null, "own-transfer", "own-transfer"]);
  });
});
