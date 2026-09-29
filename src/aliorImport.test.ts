import { describe, it, expect } from "vitest";
import { parseAndMapCsv } from "./services/parseCsv";
import { parsePdfTransactions } from "./services/parsePdf";
import { detectAliorLayout, aliorImportHint } from "./services/aliorImport";

// Struktura odtworzona z prawdziwego eksportu "Historia operacji" Aliora;
// dane osobowe i numery kont są zmyślone.
const HEADER =
  "Data transakcji;Data księgowania;Nazwa nadawcy;Nazwa odbiorcy;Szczegóły transakcji;Kwota operacji;Waluta operacji;Kwota w walucie rachunku;Waluta rachunku;Numer rachunku nadawcy;Numer rachunku odbiorcy";
const ME = "Jan Marek Kowalski";
const MAIN = "11 2222 3333 4444 5555 6666 7777";
const LOAN = "22 3333 4444 5555 6666 7777 8888";
const OTHER_BANK = "33 4444 5555 6666 7777 8888 9999";

const CSV = [
  "Kryteria transakcji: Okres: 29-09-2025 - 29-09-2026;Typ transakcji: Uznania/Obciążenia;Produkty: 11222233334444555566667777, 22333344445555666677778888",
  HEADER,
  // zwykła płatność — kontrahent to odbiorca
  `16-09-2026;16-09-2026;${ME};ASTARIUM SPÓŁKA Z OGRANIC;Płatność BLIK w internecie;-107,00;PLN;-107,00;PLN;${MAIN};`,
  // opłata bez kontrahenta — nazwą ma być opis
  `31-08-2026;31-08-2026;${ME};;Korzyść: 3.50 Prowadzenie rachunku: 10.00;-13,50;PLN;-13,50;PLN;${MAIN};`,
  // cashback — brak nadawcy, odbiorca to ja
  `14-08-2026;14-08-2026;;${ME};WYPLATA CASHBACKPROGRAM: KJO_26/07/31;2,39;PLN;2,39;PLN;;${MAIN}`,
  // wpływ od kontrahenta — nazwą ma być nadawca, nie ja
  `10-08-2026;10-08-2026;FIRMA TESTOWA SP. Z O.O.;${ME};Wynagrodzenie;4000,00;PLN;4000,00;PLN;${OTHER_BANK};${MAIN}`,
  // przelew własny (drugi zapis bez drugiego imienia i polskich znaków)
  `18-09-2026;18-09-2026;JAN MAREK KOWALSKI;Jan Kowalski;PRZELEW ŚRODKÓW;150,00;PLN;150,00;PLN;${OTHER_BANK};${MAIN}`,
  // zakup + dwie nogi finansowania z konta kredytowego (jedno zdarzenie = 229 zł, trzy wiersze)
  `05-01-2026;05-01-2026;${ME};Autopay S.A.;app.example.pl;-229,00;PLN;-229,00;PLN;${MAIN};`,
  `05-01-2026;05-01-2026;;${ME};Nr transakcji: 4 Tytuł transakcji: Autopay S.A. Kapitał: PLN 229.00;229,00;PLN;229,00;PLN;;${MAIN}`,
  `05-01-2026;05-01-2026;${ME};;Nr transakcji: 4 Tytuł transakcji: Autopay S.A. Kapitał: PLN 229.00;-229,00;PLN;-229,00;PLN;${LOAN};${MAIN}`,
  `08-12-2025;08-12-2025;${ME};;Spłata kredytu;-258,11;PLN;-258,11;PLN;${MAIN};`
].join("\n");

describe("import Alior Bank (Historia operacji)", () => {
  const result = parseAndMapCsv({ rawCsvText: CSV, presetId: "alior" } as any);
  const byName = (name: string) => result.transactions.filter((t) => t.name === name);

  it("czyta wszystkie wiersze, pomijając preambułę z kryteriami", () => {
    expect(result.transactions).toHaveLength(9);
    expect(result.rejectedRows).toHaveLength(0);
  });

  it("nazwą jest druga strona operacji, a przy jej braku — szczegóły", () => {
    expect(byName("ASTARIUM SPÓŁKA Z OGRANIC")).toHaveLength(1);
    expect(byName("Korzyść: 3.50 Prowadzenie rachunku: 10.00")).toHaveLength(1);
    expect(byName("WYPLATA CASHBACKPROGRAM: KJO_26/07/31")).toHaveLength(1);
    // wpływ: nadawca, a nie własne imię
    expect(byName("FIRMA TESTOWA SP. Z O.O.")[0].type).toBe("income");
    expect(result.transactions.some((t) => t.name === ME && t.type === "income" && t.amount === 4000)).toBe(false);
  });

  it("oznacza operacje na koncie kredytowym i przelewy własne", () => {
    const kinds = result.transactions.map((t) => result.importHints[t.id]?.kind ?? null);
    expect(kinds.filter((k) => k === "credit-line")).toHaveLength(3); // 2 nogi Nr transakcji + Spłata kredytu
    expect(kinds.filter((k) => k === "own-transfer")).toHaveLength(1);
  });

  it("po wyłączeniu operacji kredytowych zostaje zakup raz, a nie trzy razy", () => {
    const kept = result.transactions.filter((t) => result.importHints[t.id]?.kind !== "credit-line");
    const autopay = kept.filter((t) => t.name === "Autopay S.A.");
    expect(autopay).toHaveLength(1);
    expect(autopay[0].amount).toBe(229);
    expect(kept.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0)).toBeCloseTo(107 + 13.5 + 229, 2);
  });

  it("nie oznacza zwykłej płatności ani wpływu od firmy", () => {
    for (const name of ["ASTARIUM SPÓŁKA Z OGRANIC", "FIRMA TESTOWA SP. Z O.O."]) {
      expect(result.importHints[byName(name)[0].id]).toBeUndefined();
    }
  });

  it("działa też, gdy modal przekazuje domyślnie wybraną kolumnę nazwy; kolumna spoza pól nadawca/odbiorca/szczegóły ma pierwszeństwo", () => {
    const viaModal = parseAndMapCsv({ rawCsvText: CSV, presetId: "generic", mapName: "Nazwa nadawcy" } as any);
    expect(viaModal.transactions.map((t) => t.name)).toEqual(result.transactions.map((t) => t.name));

    const manual = parseAndMapCsv({ rawCsvText: CSV, presetId: "generic", mapName: "Numer rachunku nadawcy" } as any);
    expect(manual.transactions.some((t) => t.name === MAIN)).toBe(true);
  });

  it("nie rozpoznaje układu, gdy brakuje kolumn Aliora, i nie zmienia innych banków", () => {
    expect(detectAliorLayout(["Data", "Kwota", "Tytuł"])).toBeNull();
    const layout = detectAliorLayout(HEADER.split(";"))!;
    expect(aliorImportHint(["", "", "", "", "Zwykły opis", "", "", "", "", "", ""], layout)).toBeNull();
  });
});

// Tekst w układzie, jaki daje extractPdfText dla PDF "Historia transakcji" Aliora (dane zmyślone).
const PDF_TEXT = `HISTORIA TRANSAKCJI
Produkty: 11222233334444555566667777
DANE TRANSAKCJI
Data Data Szczegóły transakcji Kwota Kwota w walucie
transakcji księgowania rachunku
24-09-2026 24-09-2026 Nadawca: FIRMA TESTOWA SP. Z O.O. 1 500,00 PLN 1 500,00 PLN
Numer rachunku nadawcy: 33 4444 5555 6666 7777 8888
9999
Odbiorca: ${ME}
Numer rachunku odbiorcy: 11 2222 3333 4444 5555 6666
7777
Opis transakcji: Wynagrodzenie
20-07-2026 20-07-2026 Nadawca: ${ME} - 102,82 PLN - 102,82 PLN
Numer rachunku nadawcy: 11 2222 3333 4444 5555 6666
7777
Odbiorca: SKLEP TESTOWY 1924
Opis transakcji: 94528153089Płatność BLIKObciążenie z dnia
2026-07-20,PL,KONIN,SKLEP TESTOWY 1924
08-12-2025 08-12-2025 Numer rachunku nadawcy: 11 2222 3333 4444 5555 1274 258,11 PLN 258,11 PLN
7777
Odbiorca: ${ME}
Numer rachunku odbiorcy: 22 3333 4444 5555 6666 7777
8888
Opis transakcji: Spłata kredytu
31-08-2026 31-08-2026 Nadawca: ${ME} - 13,50 PLN - 13,50 PLN
Numer rachunku nadawcy: 11 2222 3333 4444 5555 6666
7777
Opis transakcji: Korzyść: 3.50 Prowadzenie rachunku: 10.00
Niniejszy dokument został wygenerowany elektronicznie i nie wymaga podpisu ani stempla.
Strona 1 z 1`;

describe("import PDF Alior Bank (Historia transakcji)", () => {
  const result = parsePdfTransactions(PDF_TEXT, { currency: "PLN", account: "Konto", rules: [] });

  it("każdy blok to jedna transakcja; data w opisie nie rozcina bloku", () => {
    expect(result.transactions).toHaveLength(4);
    expect(result.rejectedRows).toHaveLength(0);
  });

  it("kwoty: separator tysięcy, znak i cyfry konta tuż przed kwotą", () => {
    const amounts = result.transactions.map((t) => (t.type === "expense" ? -t.amount : t.amount));
    expect(amounts).toEqual([1500, -102.82, 258.11, -13.5]);
  });

  it("nazwa to kontrahent albo opis, a nie cały blok tekstu", () => {
    expect(result.transactions.map((t) => t.name)).toEqual([
      "FIRMA TESTOWA SP. Z O.O.",
      "SKLEP TESTOWY 1924",
      "Spłata kredytu",
      "Korzyść: 3.50 Prowadzenie rachunku: 10.00"
    ]);
  });

  it("blok zaczynający się od numeru rachunku (brak nazwy nadawcy) nie ginie i dostaje ostrzeżenie", () => {
    const repayment = result.transactions.find((t) => t.name === "Spłata kredytu")!;
    expect(result.importHints?.[repayment.id]?.kind).toBe("credit-line");
  });
});

