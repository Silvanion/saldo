import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import {
  colToLetter,
  buildXlsxArchive,
  generateTransactionsExcelBlob,
  generateBudgetExcelBlob,
  generateDebtsExcelBlob
} from "./excelGenerator";
import { Profile, Transaction, DebtItem } from "../types";

describe("excelGenerator Service", () => {
  describe("colToLetter", () => {
    it("prawidłowo konwertuje indeksy kolumn na litery Excela", () => {
      expect(colToLetter(0)).toBe("A");
      expect(colToLetter(1)).toBe("B");
      expect(colToLetter(25)).toBe("Z");
      expect(colToLetter(26)).toBe("AA");
      expect(colToLetter(27)).toBe("AB");
      expect(colToLetter(51)).toBe("AZ");
      expect(colToLetter(52)).toBe("BA");
    });
  });

  describe("buildXlsxArchive", () => {
    it("tworzy poprawny plik zip ze strukturą OpenXML SpreadsheetML", () => {
      const bytes = buildXlsxArchive([
        {
          name: "TestSheet",
          rows: [
            ["Nagłówek 1", "Nagłówek 2", "Liczba"],
            ["Wartość A", "Wartość & B <test>", 123.45],
            ["Wartość C", null, -50]
          ]
        }
      ]);

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(500);

      // Sprawdź zawartość archiwum ZIP za pomocą unzipSync
      const files = unzipSync(bytes);
      expect(files["[Content_Types].xml"]).toBeDefined();
      expect(files["_rels/.rels"]).toBeDefined();
      expect(files["xl/_rels/workbook.xml.rels"]).toBeDefined();
      expect(files["xl/workbook.xml"]).toBeDefined();
      expect(files["xl/styles.xml"]).toBeDefined();
      expect(files["xl/worksheets/sheet1.xml"]).toBeDefined();

      const sheetXml = strFromU8(files["xl/worksheets/sheet1.xml"]);
      // Sprawdzenie escaping znaków XML
      expect(sheetXml).toContain("Wartość &amp; B &lt;test&gt;");
      // Sprawdzenie zapisu liczb
      expect(sheetXml).toContain("<v>123.45</v>");
      expect(sheetXml).toContain("<v>-50</v>");
    });

    it("radzi sobie z pustą listą arkuszy tworząc arkusz domyślny", () => {
      const bytes = buildXlsxArchive([]);
      const files = unzipSync(bytes);
      expect(files["xl/worksheets/sheet1.xml"]).toBeDefined();
    });
  });

  describe("generateTransactionsExcelBlob", () => {
    it("generuje Blob z arkuszem transakcji i poprawnym typem MIME", async () => {
      const transactions: Transaction[] = [
        {
          id: "t1",
          name: "Wynagrodzenie",
          amount: 5500,
          type: "income",
          category: "Praca",
          account: "Konto Główne",
          isoDate: "2026-11-01",
          currency: "PLN",
          tags: ["etat", "listopad"]
        },
        {
          id: "t2",
          name: "Biedronka zakupy",
          amount: 142.8,
          type: "expense",
          category: "Jedzenie",
          account: "Karta",
          isoDate: "2026-11-02",
          currency: "PLN",
          tags: ["spożywcze"]
        }
      ];

      const blob = generateTransactionsExcelBlob(transactions, "PLN");
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      expect(blob.size).toBeGreaterThan(1000);

      const arrayBuffer = await blob.arrayBuffer();
      const files = unzipSync(new Uint8Array(arrayBuffer));
      const sheetXml = strFromU8(files["xl/worksheets/sheet1.xml"]);

      expect(sheetXml).toContain("Tytuł operacji");
      expect(sheetXml).toContain("Biedronka zakupy");
      expect(sheetXml).toContain("<v>-142.8</v>"); // Wydatek jako ujemna kwota
      expect(sheetXml).toContain("<v>5500</v>");
      expect(sheetXml).toContain("etat, listopad");
    });
  });

  describe("generateBudgetExcelBlob", () => {
    it("generuje Blob z arkuszem budżetu i porównaniem limitów", async () => {
      const profile: Profile = {
        id: "p1",
        name: "Test",
        currency: "PLN",
        budgets: {
          Jedzenie: 1500,
          Mieszkanie: 2500
        },
        categoryGroups: {
          Jedzenie: "Potrzeby",
          Mieszkanie: "Potrzeby"
        },
        transactions: [
          {
            id: "t1",
            name: "Lidl",
            amount: 300,
            type: "expense",
            category: "Jedzenie",
            isoDate: "2026-11-05",
            account: "Konto",
            currency: "PLN"
          }
        ]
      } as unknown as Profile;

      const blob = generateBudgetExcelBlob(profile, 2026, 10); // listopad (indeks 10)
      expect(blob.size).toBeGreaterThan(1000);

      const arrayBuffer = await blob.arrayBuffer();
      const files = unzipSync(new Uint8Array(arrayBuffer));
      const sheetXml = strFromU8(files["xl/worksheets/sheet1.xml"]);

      expect(sheetXml).toContain("Jedzenie");
      expect(sheetXml).toContain("Mieszkanie");
      expect(sheetXml).toContain("<v>1500</v>");
      expect(sheetXml).toContain("<v>300</v>"); // Wydano
    });
  });

  describe("generateDebtsExcelBlob", () => {
    it("generuje Blob z arkuszem zobowiązań kredytowych", async () => {
      const debts: DebtItem[] = [
        {
          id: "d1",
          name: "Hipoteka Mieszkanie",
          institution: "PKO BP",
          type: "mortgage",
          originalAmount: 400000,
          balance: 320000,
          interestRate: 6.85,
          monthlyPayment: 2650,
          remainingMonths: 240,
          status: "active"
        } as unknown as DebtItem
      ];

      const blob = generateDebtsExcelBlob(debts, "PLN");
      expect(blob.size).toBeGreaterThan(1000);

      const arrayBuffer = await blob.arrayBuffer();
      const files = unzipSync(new Uint8Array(arrayBuffer));
      const sheetXml = strFromU8(files["xl/worksheets/sheet1.xml"]);

      expect(sheetXml).toContain("Hipoteka Mieszkanie");
      expect(sheetXml).toContain("PKO BP");
      expect(sheetXml).toContain("Kredyt hipoteczny");
      expect(sheetXml).toContain("<v>320000</v>");
      expect(sheetXml).toContain("<v>6.85</v>");
    });
  });
});
