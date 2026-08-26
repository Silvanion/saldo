import { describe, it, expect } from "vitest";
import {
  extractAmount,
  extractDate,
  parseQuickEntry,
  parseStatementText,
  buildCalendarReminder
} from "./localParsers";

const TODAY = "2026-03-10";

describe("extractAmount", () => {
  it.each([
    ["120 zł", 120],
    ["45,99", 45.99],
    ["12.50 PLN", 12.5],
    ["1 234,56 zł", 1234.56],
    ["koszt 89 eur za bilet", 89],
    ["300zl", 300]
  ])("wyciąga kwotę z %j", (input, expected) => {
    expect(extractAmount(input)).toBe(expected);
  });

  it("zwraca null gdy nie ma liczby", () => {
    expect(extractAmount("przypomnij o wizycie")).toBeNull();
    expect(extractAmount("")).toBeNull();
  });
});

describe("extractDate", () => {
  it.each([
    ["dzisiaj", "2026-03-10"],
    ["jutro", "2026-03-11"],
    ["pojutrze", "2026-03-12"],
    ["za 5 dni", "2026-03-15"],
    ["za 2 tygodnie", "2026-03-24"],
    ["termin 2026-04-01", "2026-04-01"],
    ["termin 01.04.2026", "2026-04-01"]
  ])("rozpoznaje %j", (input, expected) => {
    expect(extractDate(input, TODAY)).toBe(expected);
  });

  it("przechodzi poprawnie przez granicę miesiąca", () => {
    expect(extractDate("jutro", "2026-03-31")).toBe("2026-04-01");
    expect(extractDate("za 1 dni", "2026-12-31")).toBe("2027-01-01");
  });

  it("obsługuje rok przestępny", () => {
    expect(extractDate("jutro", "2028-02-28")).toBe("2028-02-29");
  });

  it("odrzuca daty nieistniejące i wraca do daty odniesienia", () => {
    expect(extractDate("termin 2024-13-45", TODAY)).toBe(TODAY);
    expect(extractDate("termin 31.02.2026", TODAY)).toBe(TODAY);
  });

  it("bez rozpoznanej daty zwraca datę odniesienia", () => {
    expect(extractDate("cokolwiek", TODAY)).toBe(TODAY);
  });

  /**
   * Regresja: \b w JS jest ASCII-owe, więc granica po "ś" / "ń" nigdy nie pasowała
   * i formy "dziś" czy "za 2 tydzień" były niewidoczne dla parsera.
   */
  it("rozpoznaje formy z polskimi znakami na końcu wyrazu", () => {
    expect(extractDate("dziś", TODAY)).toBe(TODAY);
    expect(extractDate("zapłać dziś", TODAY)).toBe(TODAY);
    expect(extractDate("za 1 dzień", TODAY)).toBe("2026-03-11");
    expect(extractDate("za 1 tydzień", TODAY)).toBe("2026-03-17");
  });

  it("nie reaguje na słowo klucz zaszyte w innym wyrazie", () => {
    // "jutro" nie występuje, "Jutrzenka" nie może udawać terminu.
    expect(extractDate("Jutrzenka 50 zł", TODAY)).toBe(TODAY);
  });
});

describe("parseQuickEntry", () => {
  it("buduje rachunek ze zdania w języku naturalnym", () => {
    const result = parseQuickEntry("prąd 340 zł za 3 dni", TODAY);
    expect(result).toMatchObject({
      kind: "payment",
      amount: 340,
      isoDate: "2026-03-13"
    });
    expect(result!.name).toBe("Prąd");
  });

  it("rozpoznaje intencję przypomnienia", () => {
    const result = parseQuickEntry("przypomnij o przeglądzie auta jutro", TODAY);
    expect(result!.kind).toBe("event");
    expect(result!.isoDate).toBe("2026-03-11");
    // Wiodący przyimek nie może zostać w nazwie.
    expect(result!.name).toBe("Przeglądzie auta");
  });

  /**
   * Regresja: wycinanie słów sterujących bez granic \b psuło nazwy —
   * "zapłać" traciło "za", a "Orange" traciło "na".
   */
  it("nie wycina słów sterujących ze środka wyrazów", () => {
    expect(parseQuickEntry("zapłać 120 zł za prąd jutro", TODAY)!.name).toBe("Prąd");
    expect(parseQuickEntry("Orange 79 zł jutro", TODAY)!.name).toBe("Orange");
    expect(parseQuickEntry("Nawigacja 30 zł", TODAY)!.name).toBe("Nawigacja");
  });

  it("kategoryzuje po nazwie zgodnie z kategoriami aplikacji", () => {
    const result = parseQuickEntry("Biedronka 89,90 zł", TODAY);
    expect(result!.category).toBe("Żywność");
  });

  it("odrzuca tekst bez kwoty, gdy to nie jest przypomnienie", () => {
    expect(parseQuickEntry("cokolwiek bez liczb", TODAY)).toBeNull();
  });

  it("przypomnienie bez kwoty jest dozwolone", () => {
    const result = parseQuickEntry("przypomnij o wizycie u dentysty jutro", TODAY);
    expect(result!.kind).toBe("event");
    expect(result!.amount).toBe(0);
  });

  it("pusty tekst zwraca null", () => {
    expect(parseQuickEntry("", TODAY)).toBeNull();
    expect(parseQuickEntry("   ", TODAY)).toBeNull();
  });

  it("nazwa nigdy nie jest pusta", () => {
    expect(parseQuickEntry("500 zł", TODAY)!.name).toBe("Szybki wpis");
  });
});

describe("parseStatementText", () => {
  it("parsuje wyciąg rozdzielany średnikami", () => {
    const rows = parseStatementText(
      ["2026-01-05;Biedronka Warszawa;-45,99", "2026-01-06;Wynagrodzenie;5000,00"].join("\n"),
      TODAY
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: "Biedronka Warszawa",
      amount: 45.99,
      type: "expense",
      isoDate: "2026-01-05",
      category: "Żywność"
    });
    expect(rows[1]).toMatchObject({ amount: 5000, type: "income", isoDate: "2026-01-06" });
  });

  it("pomija wiersz nagłówkowy", () => {
    const rows = parseStatementText(["Data;Opis;Kwota", "2026-01-05;Orlen;-200,00"].join("\n"), TODAY);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Orlen");
    expect(rows[0].category).toBe("Transport");
  });

  it("obsługuje daty w formacie DD.MM.YYYY", () => {
    const rows = parseStatementText("05.01.2026;Lidl;-30,00", TODAY);
    expect(rows[0].isoDate).toBe("2026-01-05");
  });

  it("używa daty odniesienia gdy w wierszu nie ma daty", () => {
    const rows = parseStatementText("Lidl;-30,00", TODAY);
    expect(rows[0].isoDate).toBe(TODAY);
  });

  it("pomija wiersze bez kwoty oraz o kwocie zerowej", () => {
    expect(parseStatementText("2026-01-05;Tylko opis", TODAY)).toHaveLength(0);
    expect(parseStatementText("2026-01-05;Opis;0,00", TODAY)).toHaveLength(0);
  });

  it("nigdy nie zwraca kwot nieskończonych ani NaN", () => {
    const rows = parseStatementText(
      ["2026-01-05;Test;1e999", "2026-01-06;Test2;abc", "2026-01-07;Test3;-12,50"].join("\n"),
      TODAY
    );
    for (const row of rows) {
      expect(Number.isFinite(row.amount)).toBe(true);
    }
    expect(rows.some((r) => r.amount === 12.5)).toBe(true);
  });

  it("pusty tekst daje pustą listę", () => {
    expect(parseStatementText("", TODAY)).toEqual([]);
    expect(parseStatementText("\n\n  \n", TODAY)).toEqual([]);
  });

  it("przypisuje kategorie istniejące w aplikacji (nie 'Rachunki')", () => {
    const rows = parseStatementText("2026-01-05;Netflix;-43,00", TODAY);
    expect(rows[0].category).toBe("Rozrywka");
  });
});

describe("buildCalendarReminder", () => {
  it("formatuje kwotę zgodnie z walutą", () => {
    const draft = buildCalendarReminder(
      { name: "Prąd", amount: 340.5, dueDate: "2026-03-20", currency: "PLN" },
      TODAY
    );
    expect(draft.summary).toContain("Prąd");
    expect(draft.summary).toContain("340,50");
    expect(draft.description).toContain("Termin: 2026-03-20");
    expect(draft.suggestedTime).toBe("10:00:00");
    expect(draft.reminders).toEqual([1440, 120]);
  });

  it("radzi sobie z brakiem kwoty i terminu", () => {
    const draft = buildCalendarReminder({ name: "", amount: NaN as any, dueDate: "" }, TODAY);
    expect(draft.summary).toContain("Rachunek");
    expect(draft.summary).toContain("nieznaną kwotę");
    expect(draft.description).toContain(`Termin: ${TODAY}`);
  });
});
