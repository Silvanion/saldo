import { describe, it, expect } from "vitest";
import { calculateCashflowForecast } from "./cashflowForecast";
import { Profile, RecurringRule } from "../types";

describe("cashflowForecast Service", () => {
  const createMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
    id: "p1",
    name: "Profil Testowy",
    kind: "personal",
    currency: "PLN",
    budgets: {
      "Jedzenie": 1500,
      "Transport": 300,
    },
    transactions: [
      { id: "t1", name: "Pensja start", amount: 5000, type: "income", category: "Wynagrodzenie", account: "Konto", isoDate: "2026-08-01", currency: "PLN" },
      { id: "t2", name: "Zakupy", amount: 1000, type: "expense", category: "Jedzenie", account: "Konto", isoDate: "2026-08-05", currency: "PLN" },
    ],
    payments: [
      { id: "pay1", name: "Czynsz", amount: 1200, dueDate: "2026-08-25", status: "Do opłacenia", category: "Mieszkanie", currency: "PLN" },
      { id: "pay2", name: "Ubezpieczenie", amount: 600, dueDate: "2026-09-15", status: "Do opłacenia", category: "Opłaty", currency: "PLN" },
      { id: "pay3", name: "Stary zapłacony rachunek", amount: 300, dueDate: "2026-08-10", status: "Opłacono", category: "Opłaty", currency: "PLN" },
    ],
    goals: [],
    investments: [],
    ...overrides,
  });

  it("handles null profile gracefully with zeroed timeline and summaries", () => {
    const result = calculateCashflowForecast(null, [], { todayIsoStr: "2026-08-15" });

    expect(result.currentBalance).toBe(0);
    expect(result.timeline).toHaveLength(0);
    expect(result.summary30.projectedBalance).toBe(0);
    expect(result.summary60.projectedBalance).toBe(0);
    expect(result.summary90.projectedBalance).toBe(0);
    expect(result.hasRiskDip).toBe(false);
  });

  it("calculates initial balance and daily trajectory over 90 days correctly", () => {
    const profile = createMockProfile();
    const result = calculateCashflowForecast(profile, [], {
      todayIsoStr: "2026-08-15",
      safetyBuffer: 500,
      includeDailyRunRate: false, // test pure discrete events first
    });

    // Initial balance: 5000 - 1000 = 4000
    expect(result.currentBalance).toBe(4000);
    expect(result.timeline).toHaveLength(90);

    // Pay1 is due on 2026-08-25 (day 10 from 2026-08-15)
    const day10 = result.timeline[9]; // index 9 = day 10
    expect(day10.date).toBe("2026-08-25");
    expect(day10.events).toHaveLength(1);
    expect(day10.events[0].name).toBe("Czynsz");
    expect(day10.projectedBalance).toBe(4000 - 1200); // 2800

    // Pay2 is due on 2026-09-15 (day 31 from 2026-08-15)
    // 30 days summary should only include pay1
    expect(result.summary30.totalBills).toBe(1200);
    expect(result.summary30.projectedBalance).toBe(2800);

    // 60 days summary includes pay1 + pay2 = 1800
    expect(result.summary60.totalBills).toBe(1800);
    expect(result.summary60.projectedBalance).toBe(2200);
  });

  it("incorporates daily variable run-rate calculated from active budgets", () => {
    const profile = createMockProfile({
      budgets: {
        "Jedzenie": 1500,
        "Rachunki": 600, // total monthly = 2100 -> daily = 70 zł
      },
      payments: [],
    });

    const result = calculateCashflowForecast(profile, [], {
      todayIsoStr: "2026-08-15",
      includeDailyRunRate: true,
    });

    expect(result.monthlyPlannedBudget).toBe(2100);
    expect(result.dailyBurnRate).toBe(70);

    // Day 1: 4000 - 70 = 3930
    expect(result.timeline[0].expenses).toBe(70);
    expect(result.timeline[0].projectedBalance).toBe(3930);

    // In 30 days: 4000 - (30 * 70) = 4000 - 2100 = 1900
    expect(result.summary30.totalVariableSpend).toBe(2100);
    expect(result.summary30.projectedBalance).toBe(1900);
  });

  it("projects recurring income and expense rules across multi-month horizon", () => {
    const profile = createMockProfile({
      budgets: {}, // 0 burn rate for pure recurring check
      payments: [],
    });

    const recurringSalary: RecurringRule = {
      id: "rule_salary",
      name: "Wynagrodzenie miesięczne",
      amount: 4000,
      type: "income",
      category: "Wynagrodzenie",
      account: "Konto",
      frequency: "monthly",
      nextDueDate: "2026-09-01",
      isActive: true,
      currency: "PLN",
    };

    const result = calculateCashflowForecast(profile, [recurringSalary], {
      todayIsoStr: "2026-08-15",
      includeDailyRunRate: false,
    });

    // In 90 days from Aug 15:
    // Salary 1: Sep 1
    // Salary 2: Oct 1
    // Salary 3: Nov 1
    // 3 salaries = +12000
    expect(result.summary90.totalIncomes).toBe(12000);
    expect(result.summary90.projectedBalance).toBe(4000 + 12000); // 16000
  });

  it("detects liquidity risk dips when projected balance drops below safetyBuffer", () => {
    const profile = createMockProfile({
      transactions: [
        { id: "t1", name: "Stan", amount: 1000, type: "income", category: "Wynagrodzenie", account: "Konto", isoDate: "2026-08-01", currency: "PLN" },
      ],
      budgets: { "Życie": 900 }, // 30 zł / day
      payments: [
        { id: "pay1", name: "Duży wydatek", amount: 800, dueDate: "2026-08-20", status: "Do opłacenia", category: "Inne", currency: "PLN" },
      ],
    });

    const result = calculateCashflowForecast(profile, [], {
      todayIsoStr: "2026-08-15",
      safetyBuffer: 500, // safety threshold
      includeDailyRunRate: true,
    });

    // Day 5 (2026-08-20): 1000 - (5 * 30) - 800 = 1000 - 150 - 800 = 50 zł (< 500 zł safety buffer)
    expect(result.hasRiskDip).toBe(true);
    expect(result.summary30.riskDaysCount).toBeGreaterThan(0);
    expect(result.summary30.lowestPoint.amount).toBeLessThan(500);
  });

  it("ignores already generated recurring instances to prevent double counting", () => {
    const profile = createMockProfile({
      budgets: {},
      transactions: [
        { id: "t1", name: "Start", amount: 3000, type: "income", category: "Wynagrodzenie", account: "Konto", isoDate: "2026-08-01", currency: "PLN" },
        // Transaction already generated from rule for 2026-08-20
        { id: "t2", name: "Abonament", amount: 50, type: "expense", category: "Subskrypcje", account: "Konto", isoDate: "2026-08-20", recurringRuleId: "sub_1", currency: "PLN" },
      ],
      payments: [],
    });

    const recurringSub: RecurringRule = {
      id: "sub_1",
      name: "Abonament",
      amount: 50,
      type: "expense",
      category: "Subskrypcje",
      account: "Konto",
      frequency: "monthly",
      nextDueDate: "2026-08-20", // already exists in transactions!
      isActive: true,
      currency: "PLN",
    };

    const result = calculateCashflowForecast(profile, [recurringSub], {
      todayIsoStr: "2026-08-15",
      includeDailyRunRate: false,
    });

    // On 2026-08-20, rule instance sub_1_2026-08-20 is skipped because t2 exists.
    // Next instance will be 2026-09-20 (+50 expense) and 2026-10-20 (+50 expense).
    const eventsOnAug20 = result.timeline.find(pt => pt.date === "2026-08-20")?.events || [];
    expect(eventsOnAug20).toHaveLength(0);

    const eventsOnSep20 = result.timeline.find(pt => pt.date === "2026-09-20")?.events || [];
    expect(eventsOnSep20).toHaveLength(1);
    expect(eventsOnSep20[0].amount).toBe(50);
  });
});
