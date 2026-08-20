import { describe, it, expect } from "vitest";
import { getDebtPayoffSummary, calculateDebtPayoffSimulator } from "./debtPayoff";
import { Profile } from "../types";

describe("debtPayoff service", () => {
  const baseDate = new Date("2026-08-15T12:00:00");

  const createMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
    id: "p1",
    name: "Profil Testowy",
    kind: "personal",
    currency: "PLN",
    transactions: [],
    payments: [],
    accounts: [],
    goals: [],
    budgets: {},
    investments: [],
    ...overrides,
  });

  it("returns safe empty and low-data state for null profile", () => {
    const result = getDebtPayoffSummary(null);

    expect(result.totalDebt).toBe(0);
    expect(result.totalDebtLikeAmount).toBe(0);
    expect(result.debtItemsCount).toBe(0);
    expect(result.debtItems).toEqual([]);
    expect(result.snowballQueue).toEqual([]);
    expect(result.isDebtFree).toBe(true);
    expect(result.isLowData).toBe(true);
    expect(result.baselineMonths).toBe(0);
    expect(result.acceleratedMonths).toBe(0);
    expect(result.monthsSaved).toBe(0);
    expect(result.strategy).toBe("snowball");
  });

  it("returns safe empty state for profile with no unpaid obligations or credit limits", () => {
    const profile = createMockProfile({
      payments: [
        { id: "p1", name: "Opłacony prąd", amount: 250, dueDate: "2026-08-10", status: "Opłacono", currency: "PLN" }
      ],
      accounts: [
        { id: "a1", name: "Konto osobiste", bankName: "PKO BP", hasCreditLimit: false, creditLimit: 0 }
      ]
    });

    const result = getDebtPayoffSummary(profile, { selectedDate: baseDate });

    expect(result.totalDebt).toBe(0);
    expect(result.debtItemsCount).toBe(0);
    expect(result.isDebtFree).toBe(true);
    expect(result.isLowData).toBe(true);
    expect(result.snowballQueue).toEqual([]);
  });

  it("calculates baseline months and sorts snowball queue from smallest obligation upward", () => {
    const profile = createMockProfile({
      transactions: [
        { id: "t1", name: "Pensja", amount: 6000, type: "income", category: "Wynagrodzenie", account: "Główne", isoDate: "2026-08-01", currency: "PLN" },
        { id: "t2", name: "Wydatki", amount: 5000, type: "expense", category: "Żywność", account: "Główne", isoDate: "2026-08-05", currency: "PLN" }
      ], // Surplus = 1000 PLN/mc
      payments: [
        { id: "pay1", name: "Czynsz", amount: 2000, dueDate: "2026-08-30", status: "Do opłacenia", currency: "PLN" },
        { id: "pay2", name: "Abonament", amount: 150, dueDate: "2026-08-20", status: "Do opłacenia", currency: "PLN" },
        { id: "pay3", name: "Opłacony rachunek", amount: 800, dueDate: "2026-08-01", status: "Opłacono", currency: "PLN" }
      ],
      accounts: [
        { id: "acc1", name: "Karta mBank", bankName: "mBank", hasCreditLimit: true, creditLimit: 3850 }
      ]
    });

    // Total Debt: 2000 + 150 + 3850 = 6000 PLN
    // Monthly surplus = 1000 PLN/mc -> Baseline: 6000 / 1000 = 6 months
    const result = getDebtPayoffSummary(profile, { selectedDate: baseDate, extraPayment: 0 });

    expect(result.totalDebt).toBe(6000);
    expect(result.totalDebtLikeAmount).toBe(6000);
    expect(result.debtItemsCount).toBe(3);
    expect(result.isDebtFree).toBe(false);
    expect(result.isLowData).toBe(false);
    expect(result.monthlyAvailableSurplus).toBe(1000);
    expect(result.baselineMonthlyPayment).toBe(1000);
    expect(result.acceleratedMonthlyPayment).toBe(1000);
    expect(result.baselineMonths).toBe(6);
    expect(result.acceleratedMonths).toBe(6);
    expect(result.monthsSaved).toBe(0);

    // Snowball queue order: 150 (Abonament) -> 2000 (Czynsz) -> 3850 (Karta mBank)
    expect(result.snowballQueue.length).toBe(3);
    expect(result.snowballQueue[0].name).toBe("Abonament");
    expect(result.snowballQueue[0].amount).toBe(150);
    expect(result.snowballQueue[1].name).toBe("Czynsz");
    expect(result.snowballQueue[1].amount).toBe(2000);
    expect(result.snowballQueue[2].name).toBe("Karta mBank (Limit kredytowy)");
    expect(result.snowballQueue[2].amount).toBe(3850);
  });

  it("calculates accelerated months and months saved correctly with extra monthly payment", () => {
    const profile = createMockProfile({
      transactions: [
        { id: "t1", name: "Pensja", amount: 6000, type: "income", category: "Wynagrodzenie", account: "Główne", isoDate: "2026-08-01", currency: "PLN" },
        { id: "t2", name: "Wydatki", amount: 5000, type: "expense", category: "Żywność", account: "Główne", isoDate: "2026-08-05", currency: "PLN" }
      ], // Surplus = 1000 PLN/mc
      payments: [
        { id: "pay1", name: "Dług 1", amount: 3000, dueDate: "2026-08-30", status: "Do opłacenia", currency: "PLN" },
        { id: "pay2", name: "Dług 2", amount: 3000, dueDate: "2026-08-20", status: "Do opłacenia", currency: "PLN" }
      ]
    });

    // Total Debt: 6000 PLN
    // Baseline: 6000 / 1000 = 6 months
    // Extra payment: +1000 PLN/mc -> Total monthly: 2000 PLN/mc -> Accelerated: 6000 / 2000 = 3 months
    // Months saved: 6 - 3 = 3 months
    const result = getDebtPayoffSummary(profile, { selectedDate: baseDate, extraPayment: 1000 });

    expect(result.totalDebt).toBe(6000);
    expect(result.extraPayment).toBe(1000);
    expect(result.baselineMonthlyPayment).toBe(1000);
    expect(result.acceleratedMonthlyPayment).toBe(2000);
    expect(result.baselineMonths).toBe(6);
    expect(result.acceleratedMonths).toBe(3);
    expect(result.monthsSaved).toBe(3);
  });

  it("uses default minimum baseline payment (300 PLN) when monthly surplus is 0 or negative", () => {
    const profile = createMockProfile({
      transactions: [
        { id: "t1", name: "Pensja", amount: 3000, type: "income", category: "Wynagrodzenie", account: "Główne", isoDate: "2026-08-01", currency: "PLN" },
        { id: "t2", name: "Wydatki", amount: 4000, type: "expense", category: "Żywność", account: "Główne", isoDate: "2026-08-05", currency: "PLN" }
      ], // Deficit (surplus = 0)
      payments: [
        { id: "pay1", name: "Rachunek", amount: 900, dueDate: "2026-08-30", status: "Do opłacenia", currency: "PLN" }
      ]
    });

    const result = getDebtPayoffSummary(profile, { selectedDate: baseDate, extraPayment: 0 });

    expect(result.monthlyAvailableSurplus).toBe(0);
    expect(result.baselineMonthlyPayment).toBe(300);
    // 900 / 300 = 3 months
    expect(result.baselineMonths).toBe(3);
    expect(result.acceleratedMonths).toBe(3);
  });

  it("handles negative extraPayment by clamping to 0 without breaking calculations", () => {
    const profile = createMockProfile({
      payments: [
        { id: "pay1", name: "Rachunek", amount: 600, dueDate: "2026-08-30", status: "Do opłacenia", currency: "PLN" }
      ]
    });

    const result = getDebtPayoffSummary(profile, { selectedDate: baseDate, extraPayment: -500 });

    expect(result.extraPayment).toBe(0);
    expect(result.acceleratedMonthlyPayment).toBe(300);
    expect(result.baselineMonths).toBe(2);
    expect(result.acceleratedMonths).toBe(2);
    expect(result.monthsSaved).toBe(0);
  });

  it("backward-compatible calculateDebtPayoffSimulator wrapper returns exact same result", () => {
    const profile = createMockProfile({
      payments: [
        { id: "pay1", name: "Zobowiązanie A", amount: 1200, dueDate: "2026-08-30", status: "Do opłacenia", currency: "PLN" }
      ]
    });

    const summary1 = getDebtPayoffSummary(profile, { selectedDate: baseDate, extraPayment: 100 });
    const summary2 = calculateDebtPayoffSimulator(profile, baseDate, 100);

    expect(summary1).toEqual(summary2);
  });
});
