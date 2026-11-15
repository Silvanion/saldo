import { describe, it, expect } from "vitest";
import {
  calculateSingleTaxForm,
  TAX_CONSTANTS_PL,
  calculateLtvMetrics,
  calculateAnnuityInstallment,
  calculate503020,
  detectDirection,
  checkDuplicate,
  formatMoney,
  generateId,
  normalizeText,
  cleanPolishChars,
  formatDate
} from "./index";

describe("@saldo/core - Shared Domain Core", () => {
  it("eksportuje i poprawnie wykonuje kalkulacje podatkowe 2026", () => {
    const res = calculateSingleTaxForm("ryczalt", {
      monthlyRevenue: 20000,
      monthlyCosts: 0,
      zusTier: "full",
      includeSickPay: true,
      ryczaltRate: 12,
      isVatPayer: false,
    });
    expect(res.form).toBe("ryczalt");
    expect(res.zusSocial).toBe(TAX_CONSTANTS_PL.FULL_ZUS_WITH_SICK);
    expect(res.incomeTax).toBeGreaterThan(0);
  });

  it("eksportuje i poprawnie wykonuje kalkulacje hipoteki", () => {
    const ltv = calculateLtvMetrics(800000, 1000000);
    expect(ltv).not.toBeNull();
    expect(ltv!.ltvPercent).toBe(80);
    expect(ltv!.status).toBe("safe");

    const installment = calculateAnnuityInstallment(500000, 7.5, 300);
    expect(installment).toBeGreaterThan(3000);
  });

  it("eksportuje i poprawnie wykonuje kalkulacje budżetu 50/30/20", () => {
    const breakdown = calculate503020([]);
    expect(breakdown.needs.amount).toBe(0);
    expect(breakdown.wants.amount).toBe(0);
    expect(breakdown.savings.amount).toBe(0);
    expect(breakdown.totalExpense).toBe(0);
  });

  it("eksportuje i poprawnie wykrywa kierunek transakcji", () => {
    const decision = detectDirection(
      { explicitDirection: "WYDATEK" },
      { hasNegativeAmounts: false }
    );
    expect(decision.type).toBe("expense");
    expect(decision.confident).toBe(true);
  });

  it("eksportuje deduplikator transakcji", () => {
    const existing = [
      { id: "1", amount: 100, name: "Biedronka", isoDate: "2026-03-01", account: "PKO", currency: "PLN" as const, category: "Żywność", type: "expense" as const }
    ];
    const res = checkDuplicate(
      { amount: 100, name: "Biedronka", isoDate: "2026-03-01", account: "PKO", currency: "PLN", category: "Żywność", type: "expense" },
      existing
    );
    expect(res.isLikelyDuplicate).toBe(true);
  });

  it("eksportuje formatowanie i narzędzia tekstowe", () => {
    expect(formatMoney(1250.5, "PLN")).toContain("1");
    expect(generateId("tx")).toMatch(/^tx-/);
    expect(cleanPolishChars("Zażółć gęślą jaźń")).toBe("Zazolc gesla jazn");
    expect(formatDate("2026-05-15")).toContain("15");
  });
});
