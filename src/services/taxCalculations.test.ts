import { describe, it, expect } from "vitest";
import {
  calculateSocialZus,
  calculateHealthInsurance,
  calculateSingleTaxForm,
  compareAllTaxForms,
  calculateCurrentMonthTaxBuffer,
  TAX_CONSTANTS_PL,
} from "./taxCalculations";
import { Transaction } from "../types";

describe("taxCalculations - Polski Silnik Podatkowy B2B / JDG", () => {
  describe("calculateSocialZus", () => {
    it("zwraca 0 zł dla Ulgi na start", () => {
      expect(calculateSocialZus("relief_start", true)).toBe(0);
      expect(calculateSocialZus("relief_start", false)).toBe(0);
    });

    it("zwraca poprawne składki dla preferencyjnego ZUS (Mały ZUS)", () => {
      expect(calculateSocialZus("preferential", true)).toBe(TAX_CONSTANTS_PL.PREF_ZUS_WITH_SICK);
      expect(calculateSocialZus("preferential", false)).toBe(TAX_CONSTANTS_PL.PREF_ZUS_WITHOUT_SICK);
    });

    it("zwraca pełny ZUS (Duży ZUS) z i bez chorobowego", () => {
      expect(calculateSocialZus("full", true)).toBe(TAX_CONSTANTS_PL.FULL_ZUS_WITH_SICK);
      expect(calculateSocialZus("full", false)).toBe(TAX_CONSTANTS_PL.FULL_ZUS_WITHOUT_SICK);
    });
  });

  describe("calculateHealthInsurance", () => {
    it("dla ryczałtu zwraca 3 progi w zależności od przychodu rocznego", () => {
      // Przychód 4000 zł/mc * 12 = 48 000 zł (próg 1 <= 60k)
      expect(calculateHealthInsurance("ryczalt", 4000, 0)).toBe(TAX_CONSTANTS_PL.RYCZALT_HEALTH_TIER_1);

      // Przychód 15 000 zł/mc * 12 = 180 000 zł (próg 2 <= 300k)
      expect(calculateHealthInsurance("ryczalt", 15000, 0)).toBe(TAX_CONSTANTS_PL.RYCZALT_HEALTH_TIER_2);

      // Przychód 35 000 zł/mc * 12 = 420 000 zł (próg 3 > 300k)
      expect(calculateHealthInsurance("ryczalt", 35000, 0)).toBe(TAX_CONSTANTS_PL.RYCZALT_HEALTH_TIER_3);
    });

    it("dla podatku liniowego wylicza 4.9% dochodu z uwzględnieniem minimalnej składki", () => {
      // Niski dochód 2000 zł -> 4.9% to 98 zł < minimalna 420 zł
      expect(calculateHealthInsurance("linear", 10000, 2000)).toBe(TAX_CONSTANTS_PL.MIN_HEALTH_INSURANCE);

      // Wyższy dochód 20 000 zł -> 4.9% z 20 000 = 980 zł
      expect(calculateHealthInsurance("linear", 25000, 20000)).toBe(980);
    });

    it("dla skali podatkowej wylicza 9% dochodu z minimalną składką", () => {
      // Dochód 3000 zł -> 9% to 270 zł < minimalna 420 zł
      expect(calculateHealthInsurance("scale", 5000, 3000)).toBe(TAX_CONSTANTS_PL.MIN_HEALTH_INSURANCE);

      // Dochód 10 000 zł -> 9% z 10 000 = 900 zł
      expect(calculateHealthInsurance("scale", 15000, 10000)).toBe(900);
    });
  });

  describe("calculateSingleTaxForm", () => {
    it("poprawnie wylicza Ryczałt 12% z odliczeniem 50% zdrowotnej i ZUS", () => {
      const result = calculateSingleTaxForm("ryczalt", {
        monthlyRevenue: 20000,
        monthlyCosts: 1000,
        zusTier: "full",
        includeSickPay: true,
        ryczaltRate: 12,
        isVatPayer: false,
      });

      expect(result.form).toBe("ryczalt");
      expect(result.monthlyRevenue).toBe(20000);
      expect(result.zusSocial).toBe(TAX_CONSTANTS_PL.FULL_ZUS_WITH_SICK);
      expect(result.healthInsurance).toBe(TAX_CONSTANTS_PL.RYCZALT_HEALTH_TIER_2); // 20k * 12 = 240k (próg 2)

      // Podstawa = Przychód (20000) - ZUS (1774) - 50% zdrowotnej (385) = 17841
      expect(result.taxBase).toBe(20000 - 1774 - 385);
      expect(result.incomeTax).toBe(Math.round(result.taxBase * 0.12));
      expect(result.netIncome).toBeGreaterThan(14000);
      expect(result.taxBufferToSetAside).toBe(result.zusSocial + result.healthInsurance + result.incomeTax);
    });

    it("poprawnie wylicza Podatek Liniowy 19% z limitem odliczenia zdrowotnej", () => {
      const result = calculateSingleTaxForm("linear", {
        monthlyRevenue: 25000,
        monthlyCosts: 5000,
        zusTier: "full",
        includeSickPay: true,
        isVatPayer: true,
        vatRate: 23,
      });

      expect(result.form).toBe("linear");
      expect(result.incomeTax).toBeGreaterThan(0);
      expect(result.vatDue).toBe(Math.round((25000 * 0.23) - (5000 * 0.23)));
      expect(result.taxBufferToSetAside).toBe(result.zusSocial + result.healthInsurance + result.incomeTax + result.vatDue);
    });

    it("poprawnie wylicza Skalę Podatkową z kwotą wolną i progami", () => {
      // Niski dochód roczny <= 30k (np. 2000 zł/mc)
      const lowResult = calculateSingleTaxForm("scale", {
        monthlyRevenue: 3000,
        monthlyCosts: 1000,
        zusTier: "relief_start",
        includeSickPay: false,
        isVatPayer: false,
      });
      expect(lowResult.incomeTax).toBe(0); // w kwocie wolnej

      // Wysoki dochód roczny wpadający w próg 32% (np. 18 000 zł/mc)
      const highResult = calculateSingleTaxForm("scale", {
        monthlyRevenue: 20000,
        monthlyCosts: 2000,
        zusTier: "full",
        includeSickPay: true,
        isVatPayer: false,
      });
      expect(highResult.incomeTax).toBeGreaterThan(1500);
    });
  });

  describe("compareAllTaxForms", () => {
    it("rekomenduje Ryczałt dla typowego programisty B2B o wysokim przychodzie i niskich kosztach", () => {
      const comparison = compareAllTaxForms({
        monthlyRevenue: 22000,
        monthlyCosts: 800,
        zusTier: "full",
        includeSickPay: true,
        ryczaltRate: 12,
        isVatPayer: true,
      });

      expect(comparison.bestForm).toBe("ryczalt");
      expect(comparison.annualDifferenceBestVsWorst).toBeGreaterThan(0);
      expect(comparison.recommendationReason).toContain("Ryczałt (12%)");
    });

    it("rekomenduje Podatek Liniowy dla firmy z wysokimi kosztami operacyjnymi", () => {
      const comparison = compareAllTaxForms({
        monthlyRevenue: 40000,
        monthlyCosts: 25000, // wysokie koszty 62.5%
        zusTier: "full",
        includeSickPay: true,
        ryczaltRate: 15,
        isVatPayer: true,
      });

      expect(comparison.bestForm).toBe("linear");
      expect(comparison.recommendationReason).toContain("Podatek liniowy (19%)");
    });
  });

  describe("calculateCurrentMonthTaxBuffer", () => {
    it("analizuje transakcje w danym miesiącu i wylicza rezerwę podatkową bez dublowania wpłat ZUS/US", () => {
      const mockTransactions: Transaction[] = [
        {
          id: "tx1",
          name: "Faktura za usługi programistyczne",
          amount: 18000,
          type: "income",
          isoDate: "2026-09-05",
          currency: "PLN",
          category: "Przychody B2B",
          account: "Firmowe",
        },
        {
          id: "tx2",
          name: "Licencja JetBrains",
          amount: 750,
          type: "expense",
          isoDate: "2026-09-10",
          currency: "PLN",
          category: "Koszty IT",
          account: "Firmowe",
        },
        {
          id: "tx3",
          name: "ZUS Składka ZUS DRA", // powinno być wykluczone z kosztów
          amount: 1774,
          type: "expense",
          isoDate: "2026-09-15",
          currency: "PLN",
          category: "ZUS i podatki",
          account: "Firmowe",
        },
        {
          id: "tx4",
          name: "Stara transakcja z sierpnia",
          amount: 5000,
          type: "income",
          isoDate: "2026-08-20",
          currency: "PLN",
          category: "Przychody B2B",
          account: "Firmowe",
        },
      ];

      const result = calculateCurrentMonthTaxBuffer(mockTransactions, 2026, 8, {
        zusTier: "full",
        includeSickPay: true,
        ryczaltRate: 12,
        selectedForm: "ryczalt",
      });

      expect(result.revenue).toBe(18000);
      expect(result.costs).toBe(750);
      expect(result.activeResult.taxBufferToSetAside).toBeGreaterThan(3000);
      expect(result.daysTo20th).toBeGreaterThanOrEqual(0);
      expect(result.daysTo25th).toBeGreaterThanOrEqual(0);
    });
  });
});
