import { describe, it, expect } from "vitest";
import { Profile } from "../types";
import {
  calculateNetWorthSummary,
  calculateAssetBreakdown,
  calculateLiabilityBreakdown,
  generateNetWorthTimeline,
} from "./netWorthCalculations";

describe("netWorthCalculations", () => {
  const createBaseProfile = (overrides: Partial<Profile> = {}): Profile => ({
    id: "p1",
    name: "Jan Kowalski",
    kind: "personal",
    currency: "PLN",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    debts: [],
    ...overrides,
  });

  describe("calculateAssetBreakdown", () => {
    it("zwraca zera dla pustego profilu", () => {
      const breakdown = calculateAssetBreakdown(null);
      expect(breakdown).toEqual({
        liquidCash: 0,
        savings: 0,
        investments: 0,
        property: 0,
        totalAssets: 0,
      });
    });

    it("poprawnie sumuje płynne środki, cele, inwestycje i nieruchomości", () => {
      const profile = createBaseProfile({
        transactions: [
          {
            id: "t1",
            name: "Wypłata",
            category: "Wynagrodzenie",
            account: "Konto",
            amount: 10000,
            type: "income",
            isoDate: "2026-03-01",
            currency: "PLN",
          },
          {
            id: "t2",
            name: "Zakupy",
            category: "Jedzenie",
            account: "Konto",
            amount: 4000,
            type: "expense",
            isoDate: "2026-03-02",
            currency: "PLN",
          },
        ],
        goals: [
          { id: "g1", name: "Wakacje", target: 5000, saved: 3500 },
          { id: "g2", name: "Czarna godzina", target: 20000, saved: 15000 },
        ],
        investments: [
          { id: "i1", name: "ETF S&P 500", amount: 25000, isoDate: "2026-01-01" },
          { id: "i2", name: "Obligacje skarbowe", amount: 10000, isoDate: "2026-01-01" },
        ],
        debts: [
          {
            id: "d1",
            name: "Kredyt hipoteczny",
            institution: "PKO",
            type: "mortgage",
            currency: "PLN",
            balance: 350000,
            monthlyPayment: 2400,
            interestRate: 6.5,
            propertyValue: 600000,
            status: "active",
            createdAt: "2024-01-01",
          },
          {
            id: "d2",
            name: "Stary kredyt spłacony",
            institution: "mBank",
            type: "cash_loan",
            currency: "PLN",
            balance: 0,
            monthlyPayment: 0,
            interestRate: 8,
            propertyValue: 50000, // nie powinno być liczone bo status closed
            status: "closed",
            createdAt: "2023-01-01",
          },
        ],
      });

      const breakdown = calculateAssetBreakdown(profile);
      expect(breakdown.liquidCash).toBe(6000); // 10000 - 4000
      expect(breakdown.savings).toBe(18500); // 3500 + 15000
      expect(breakdown.investments).toBe(35000); // 25000 + 10000
      expect(breakdown.property).toBe(600000); // tylko aktywne nieruchomości
      expect(breakdown.totalAssets).toBe(659500);
    });

    it("radzi sobie z ujemnym saldem płynnym (debet)", () => {
      const profile = createBaseProfile({
        transactions: [
          {
            id: "t1",
            name: "Zakupy",
            category: "Jedzenie",
            account: "Konto",
            amount: 500,
            type: "expense",
            isoDate: "2026-03-01",
            currency: "PLN",
          },
        ],
      });
      const breakdown = calculateAssetBreakdown(profile);
      expect(breakdown.liquidCash).toBe(-500);
      expect(breakdown.totalAssets).toBe(-500);
    });
  });

  describe("calculateLiabilityBreakdown", () => {
    it("zwraca zera dla braku zobowiązań", () => {
      const breakdown = calculateLiabilityBreakdown(null);
      expect(breakdown).toEqual({
        debts: 0,
        unpaidBills: 0,
        totalLiabilities: 0,
      });
    });

    it("sumuje tylko aktywne długi i nieopłacone rachunki", () => {
      const profile = createBaseProfile({
        debts: [
          {
            id: "d1",
            name: "Kredyt gotówkowy",
            institution: "Alior",
            type: "cash_loan",
            currency: "PLN",
            balance: 15000,
            monthlyPayment: 600,
            interestRate: 10,
            status: "active",
            createdAt: "2025-01-01",
          },
          {
            id: "d2",
            name: "Spłacony debet",
            institution: "Santander",
            type: "credit_card",
            currency: "PLN",
            balance: 5000,
            monthlyPayment: 100,
            interestRate: 15,
            status: "closed",
            createdAt: "2024-01-01",
          },
        ],
        payments: [
          {
            id: "p1",
            name: "Czynsz",
            amount: 850,
            dueDate: "2026-03-10",
            status: "Do opłacenia",
            currency: "PLN",
          },
          {
            id: "p2",
            name: "Prąd",
            amount: 220,
            dueDate: "2026-03-05",
            status: "Opłacono",
            currency: "PLN",
          },
        ],
      });

      const breakdown = calculateLiabilityBreakdown(profile);
      expect(breakdown.debts).toBe(15000);
      expect(breakdown.unpaidBills).toBe(850);
      expect(breakdown.totalLiabilities).toBe(15850);
    });
  });

  describe("calculateNetWorthSummary", () => {
    it("zwraca bezpieczną strukturę dla profilu null", () => {
      const summary = calculateNetWorthSummary(null);
      expect(summary.netWorth).toBe(0);
      expect(summary.debtToAssetsRatio).toBe(0);
      expect(summary.liquidRunwayMonths).toBe(0);
      expect(summary.momChange.absolute).toBe(0);
      expect(summary.momChange.percentage).toBe(0);
      expect(summary.timeline).toHaveLength(6);
    });

    it("poprawnie wylicza wskaźnik majątku netto i wskaźnik zadłużenia", () => {
      const profile = createBaseProfile({
        transactions: [
          {
            id: "t1",
            name: "Wypłata",
            category: "Wynagrodzenie",
            account: "Konto",
            amount: 8000,
            type: "income",
            isoDate: "2026-03-01",
            currency: "PLN",
          },
        ],
        goals: [{ id: "g1", name: "Poduszka", target: 10000, saved: 12000 }],
        debts: [
          {
            id: "d1",
            name: "Kredyt",
            institution: "Bank",
            type: "cash_loan",
            currency: "PLN",
            balance: 5000,
            monthlyPayment: 500,
            interestRate: 8,
            status: "active",
            createdAt: "2025-01-01",
          },
        ],
      });

      const summary = calculateNetWorthSummary(profile);
      // Aktywa: 8000 (płynne) + 12000 (cele) = 20000
      // Pasywa: 5000
      // Net Worth: 15000
      expect(summary.assets.totalAssets).toBe(20000);
      expect(summary.liabilities.totalLiabilities).toBe(5000);
      expect(summary.netWorth).toBe(15000);
      expect(summary.debtToAssetsRatio).toBe(25); // 5000 / 20000 * 100%
    });

    it("zwraca poprawny debtToAssetsRatio gdy pasywa przewyższają aktywa", () => {
      const profile = createBaseProfile({
        transactions: [
          {
            id: "t1",
            name: "Wpłata",
            category: "Wynagrodzenie",
            account: "Konto",
            amount: 2000,
            type: "income",
            isoDate: "2026-03-01",
            currency: "PLN",
          },
        ],
        debts: [
          {
            id: "d1",
            name: "Pożyczka",
            institution: "Bank",
            type: "cash_loan",
            currency: "PLN",
            balance: 10000,
            monthlyPayment: 400,
            interestRate: 12,
            status: "active",
            createdAt: "2025-01-01",
          },
        ],
      });

      const summary = calculateNetWorthSummary(profile);
      expect(summary.netWorth).toBe(-8000);
      expect(summary.debtToAssetsRatio).toBe(500); // (10000 / 2000) * 100 = 500%
    });

    it("zwraca 0 dla wskaźnika zadłużenia gdy brak aktywów i pasywów", () => {
      const profile = createBaseProfile();
      const summary = calculateNetWorthSummary(profile);
      expect(summary.debtToAssetsRatio).toBe(0);
    });
  });

  describe("generateNetWorthTimeline", () => {
    it("generuje wskazaną liczbę miesięcy (np. 6 lub 12)", () => {
      const profile = createBaseProfile();
      const timeline6 = generateNetWorthTimeline(profile, 6, new Date("2026-03-15"));
      expect(timeline6).toHaveLength(6);
      expect(timeline6[5].date).toBe("2026-03");

      const timeline12 = generateNetWorthTimeline(profile, 12, new Date("2026-03-15"));
      expect(timeline12).toHaveLength(12);
      expect(timeline12[11].date).toBe("2026-03");
    });

    it("poprawnie akumuluje historię przepływów na osi czasu", () => {
      const profile = createBaseProfile({
        transactions: [
          {
            id: "t1",
            name: "Pensja Styczeń",
            category: "Wynagrodzenie",
            account: "Konto",
            amount: 5000,
            type: "income",
            isoDate: "2026-01-10",
            currency: "PLN",
          },
          {
            id: "t2",
            name: "Pensja Luty",
            category: "Wynagrodzenie",
            account: "Konto",
            amount: 5000,
            type: "income",
            isoDate: "2026-02-10",
            currency: "PLN",
          },
          {
            id: "t3",
            name: "Wydatki Luty",
            category: "Różne",
            account: "Konto",
            amount: 2000,
            type: "expense",
            isoDate: "2026-02-15",
            currency: "PLN",
          },
        ],
        investments: [
          { id: "i1", name: "Krypto", amount: 3000, isoDate: "2026-01-01" },
        ],
      });

      const timeline = generateNetWorthTimeline(profile, 3, new Date("2026-03-15"));
      // 3 miesiące: 2026-01, 2026-02, 2026-03
      expect(timeline[0].date).toBe("2026-01");
      expect(timeline[1].date).toBe("2026-02");
      expect(timeline[2].date).toBe("2026-03");

      // W styczniu: 5000 (transakcje) + 3000 (inwestycje) = 8000
      expect(timeline[0].netWorth).toBe(8000);
      // W lutym: 5000 + (5000-2000) + 3000 = 11000
      expect(timeline[1].netWorth).toBe(11000);
      // W marcu brak dodatkowych transakcji: nadal 11000
      expect(timeline[2].netWorth).toBe(11000);
    });

    it("radzi sobie z przejściem przez granicę roku (np. 12 miesięcy)", () => {
      const profile = createBaseProfile();
      const timeline = generateNetWorthTimeline(profile, 12, new Date("2026-03-15"));
      expect(timeline).toHaveLength(12);
      expect(timeline[0].date).toBe("2025-04");
      expect(timeline[11].date).toBe("2026-03");
    });

    it("bezpiecznie ignoruje nieprawidłowe lub brakujące dane numeryczne", () => {
      const profile = createBaseProfile({
        goals: [
          { id: "g1", name: "Zły cel", target: 1000, saved: "nie-liczba" as any },
        ],
        debts: [
          {
            id: "d1",
            name: "Zły dług",
            institution: "Bank",
            type: "other",
            currency: "PLN",
            balance: NaN,
            monthlyPayment: null as any,
            interestRate: 0,
            status: "active",
            createdAt: "2025-01-01",
          },
        ],
      });
      const summary = calculateNetWorthSummary(profile);
      expect(summary.netWorth).toBe(0);
      expect(summary.assets.savings).toBe(0);
      expect(summary.liabilities.debts).toBe(0);
    });
  });
});
