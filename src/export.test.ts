import { describe, it, expect, vi } from "vitest";
import {
  generateCsvContent,
  generateBudgetCsvContent,
  generateDebtsCsvContent,
  shareOrDownloadBlob
} from "./utils";
import { Profile, DebtItem } from "./types";

describe("KROK 8G - Bezpieczny eksport CSV", () => {
  it("generuje poprawny CSV z polskimi znakami i ucieczkami", () => {
    const txs = [
      {
        id: "1",
        name: 'Zakupy "Biedronka"',
        amount: 150.5,
        category: "Żywność",
        account: "Główne",
        type: "expense",
        isoDate: "2026-07-20",
        currency: "PLN",
        tags: ["jedzenie", "dom"]
      },
      {
        id: "2",
        name: "Opłata, prowizja",
        amount: 10,
        category: "Opłaty",
        account: "Główne",
        type: "expense",
        isoDate: "2026-07-21",
        currency: "PLN"
      },
      {
        id: "3",
        name: "Opis z\nnową linią",
        amount: 10,
        category: "Opłaty",
        account: "Główne",
        type: "expense",
        isoDate: "2026-07-22",
        currency: "PLN"
      }
    ];

    const csv = generateCsvContent(txs as any);
    expect(csv.startsWith("\uFEFF")).toBe(true); // BOM
    expect(csv).toContain('"Zakupy ""Biedronka"""'); // escaped quotes
    expect(csv).toContain('"Opłata, prowizja"'); // escaped comma
    expect(csv).toContain('"Opis z\nnową linią"'); // escaped newline
    expect(csv).toContain("jedzenie; dom");
  });

  it("generuje poprawny CSV dla budżetu miesięcznego z limitami i wykonaniem", () => {
    const mockProfile: Partial<Profile> = {
      name: "Główny",
      budgets: {
        Żywność: 1500,
        Rozrywka: 300
      },
      transactions: [
        {
          id: "t1",
          name: "Lidl",
          amount: 500,
          category: "Żywność",
          account: "Konto",
          type: "expense",
          isoDate: "2026-09-05",
          currency: "PLN"
        },
        {
          id: "t2",
          name: "Kino",
          amount: 400,
          category: "Rozrywka",
          account: "Konto",
          type: "expense",
          isoDate: "2026-09-08",
          currency: "PLN"
        }
      ] as any
    };

    const csv = generateBudgetCsvContent(mockProfile as Profile, 2026, 8); // Wrzesień 2026
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Kategoria,Miesięczny Limit,Rzeczywiste Wydatki");
    expect(csv).toContain("Żywność");
    expect(csv).toContain("1500.00");
    expect(csv).toContain("500.00");
    expect(csv).toContain("W normie");
    expect(csv).toContain("Rozrywka");
    expect(csv).toContain("300.00");
    expect(csv).toContain("400.00");
    expect(csv).toContain("Przekroczony");
  });

  it("generuje poprawny CSV dla portfela długów i kredytów", () => {
    const mockDebts: DebtItem[] = [
      {
        id: "d1",
        name: "Kredyt Hipoteczny Mieszkanie",
        institution: "PKO BP",
        type: "mortgage",
        currency: "PLN",
        balance: 350000,
        monthlyPayment: 2650,
        interestRate: 6.85,
        remainingMonths: 240,
        status: "active",
        createdAt: "2026-01-01"
      },
      {
        id: "d2",
        name: "Karta Kredytowa",
        institution: "mBank",
        type: "credit_card",
        currency: "PLN",
        balance: 5000,
        monthlyPayment: 250,
        interestRate: 18.5,
        status: "active",
        createdAt: "2026-02-01"
      }
    ];

    const csv = generateDebtsCsvContent(mockDebts, "PLN");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Kredyt Hipoteczny Mieszkanie,PKO BP,Hipoteka,350000.00,PLN,6.85,2650.00,240,Aktywny");
    expect(csv).toContain("Karta Kredytowa,mBank,Karta kredytowa,5000.00,PLN,18.50,250.00,-,Aktywny");
  });

  it("obsługuje shareOrDownloadBlob z fallbackiem do pobierania", async () => {
    const blob = new Blob(["test"], { type: "text/plain" });
    const result = await shareOrDownloadBlob(blob, "test.txt", "Tytuł");
    expect(result).toHaveProperty("shared");
  });

  it("generuje miesięczny i roczny raport PDF jako Blob bez błędów", async () => {
    const { generateReportPdf, generateAnnualReportPdf } = await import("./services/pdfGenerator");
    const mockProfile: Partial<Profile> = {
      name: "Jan Kowalski",
      kind: "personal",
      accounts: [{ id: "acc1", name: "Główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }],
      goals: [{ id: "g1", name: "Wakacje", target: 4000, saved: 2000, currency: "PLN" }],
      debts: [
        {
          id: "deb1",
          name: "Pożyczka",
          institution: "Bank",
          type: "cash_loan",
          balance: 1200,
          interestRate: 5,
          monthlyPayment: 100,
          currency: "PLN",
          status: "active",
          createdAt: "2026-01-01"
        }
      ],
      transactions: [
        {
          id: "t1",
          name: "Wypłata",
          amount: 6000,
          category: "Wynagrodzenie",
          account: "Główne",
          type: "income",
          isoDate: "2026-09-01",
          currency: "PLN"
        },
        {
          id: "t2",
          name: "Zakupy",
          amount: 250,
          category: "Żywność",
          account: "Główne",
          type: "expense",
          isoDate: "2026-09-02",
          currency: "PLN"
        }
      ] as any
    };

    const monthlyBlob = generateReportPdf(mockProfile as Profile, 2026, 8, "PLN", { returnBlob: true });
    expect(monthlyBlob).toBeInstanceOf(Blob);

    const annualBlob = generateAnnualReportPdf(mockProfile as Profile, 2026, "PLN", { returnBlob: true });
    expect(annualBlob).toBeInstanceOf(Blob);
  });

  it("generuje specjalistyczny raport PDF Mortgage Pro z harmonogramem i testem KNF", async () => {
    const { generateMortgageReportPdf } = await import("./services/pdfGenerator");
    const mockMortgage: DebtItem = {
      id: "mortgage-test",
      name: "Apartament Mokotów",
      institution: "mBank Hipoteczny",
      type: "mortgage",
      currency: "PLN",
      balance: 450000,
      monthlyPayment: 3200,
      interestRate: 6.95,
      remainingMonths: 240,
      propertyValue: 600000,
      status: "active",
      createdAt: "2026-01-01"
    };

    const pdfBlob = generateMortgageReportPdf(mockMortgage, "PLN", { returnBlob: true }) as Blob;
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.size).toBeGreaterThan(1000);
  });
});
