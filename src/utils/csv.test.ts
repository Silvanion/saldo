import { describe, it, expect } from "vitest";
import Papa from "papaparse";
import { generateCsvContent, generateDebtsCsvContent, generateBudgetCsvContent } from "./csv";

// SEC-18: tytuł przelewu przychodzącego kontroluje nadawca — eksport nie może uruchamiać formuł w arkuszu.
const parseRows = (csv: string) => csv.replace(/^﻿/, "").trim().split("\n").map((l) => l);

describe("eksport CSV: neutralizacja formuł (CWE-1236)", () => {
  const tx = (name: string, amount = -50): any => ({
    id: "t1", name, amount, currency: "PLN", category: "Inne", account: "Konto", type: "expense", isoDate: "2026-11-01", tags: []
  });

  it.each(["=HYPERLINK(\"http://x\",\"a\")", "+cmd|' /C calc'!A0", "-2+3", "@SUM(1+1)", "\tcmd", "\rcmd"])(
    "tekst zaczynający się od groźnego znaku dostaje apostrof: %j",
    (payload) => {
      const rows = Papa.parse<string[]>(generateCsvContent([tx(payload)]).replace(/^\uFEFF/, ""), { skipEmptyLines: true }).data;
      expect(rows[1][1]).toBe(`'${payload}`); // Nazwa
      expect(rows[1][2]).toBe("-50");          // kwota nietknięta
    }
  );

  it("nie psuje kwot ujemnych ani zwykłego tekstu", () => {
    const rows = Papa.parse<string[]>(generateCsvContent([tx("Zakupy spożywcze", -50)]).replace(/^\uFEFF/, ""), { skipEmptyLines: true }).data;
    expect(rows[1][1]).toBe("Zakupy spożywcze");
    expect(rows[1][2]).toBe("-50");
  });

  it("dotyczy też eksportu długów (notatki, nazwy)", () => {
    const csv = generateDebtsCsvContent([{ id: "d1", name: "=1+1", institution: "@x", type: "cash_loan", balance: 10, currency: "PLN", interestRate: 1, monthlyPayment: 1, status: "active", notes: "+evil" } as any], "PLN");
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'@x");
    expect(csv).toContain("'+evil");
  });

  it("dotyczy eksportu budżetu (nazwa kategorii/profilu)", () => {
    const profile: any = { name: "=profil", transactions: [{ type: "expense", isoDate: "2026-11-02", category: "=kat", amount: 5 }], budgets: { "=kat": 10 } };
    const csv = generateBudgetCsvContent(profile, 2026, 10);
    expect(csv).toContain("'=kat");
    expect(csv).toContain("'=profil");
  });
});
