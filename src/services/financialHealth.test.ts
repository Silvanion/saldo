import { describe, it, expect } from "vitest";
import { getFinancialHealthSummary } from "./financialHealth";
import { Profile, Payment, RecurringRule, Transaction } from "../types";

describe("financialHealth service", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Jan Kowalski",
    kind: "personal",
    avatar: "👤",
    currency: "PLN",
    accounts: [{ id: "acc1", name: "Konto Główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }],
    settlements: [],
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: { Jedzenie: 1500, Rachunki: 800 },
  };

  const todayIsoStr = "2026-07-25";

  it("returns high score (>=85) and positive alerts for a healthy financial profile", () => {
    const transactions: Transaction[] = [
      { id: "tx1", name: "Wypłata", amount: 6000, type: "income", category: "Wynagrodzenie", isoDate: "2026-07-01", account: "Konto", currency: "PLN" },
      { id: "tx2", name: "Zakupy", amount: 400, type: "expense", category: "Jedzenie", isoDate: "2026-07-10", account: "Konto", currency: "PLN" },
    ];

    const payments: Payment[] = [
      { id: "pay1", name: "Netflix", amount: 50, status: "Opłacono", category: "Rozrywka", isRecurring: true, dueDate: "2026-07-20", currency: "PLN" },
    ];

    const result = getFinancialHealthSummary(
      { ...baseProfile, transactions, payments },
      [],
      { todayIsoStr }
    );

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.grade).toBe("excellent");
    expect(result.gradeLabel).toBe("Wzorowa kondycja");
    expect(result.pillars.budget.score).toBe(25);
    expect(result.pillars.payments.score).toBe(25);
    expect(result.pillars.liquidity.score).toBe(25);
    expect(result.positiveDrivers.length).toBeGreaterThan(0);
    expect(result.negativeDrivers.length).toBe(0);
    expect(result.alerts.some(a => a.severity === "positive")).toBe(true);
  });

  it("reduces payments pillar score and generates critical alert when overdue payment exists", () => {
    const payments: Payment[] = [
      { id: "pay_overdue", name: "Czynsz", amount: 2000, status: "Do opłacenia", category: "Dom", isRecurring: true, dueDate: "2026-07-15", currency: "PLN" },
    ];
    const transactions: Transaction[] = [
      { id: "tx_init", name: "Wpłata", amount: 5000, type: "income", category: "Wynagrodzenie", isoDate: "2026-07-01", account: "Konto", currency: "PLN" },
    ];

    const result = getFinancialHealthSummary(
      { ...baseProfile, transactions, payments },
      [],
      { todayIsoStr }
    );

    expect(result.status).toBe("ACTIVE");
    expect(result.pillars.payments.score).toBeLessThan(25);
    expect(result.negativeDrivers).toContain("1 zaległa opłata");
    
    const overdueAlert = result.alerts.find(a => a.id.startsWith("payment_overdue_"));
    expect(overdueAlert).toBeDefined();
    expect(overdueAlert?.severity).toBe("critical");
    expect(overdueAlert?.title).toContain("Zaległy rachunek: Czynsz");
  });

  it("reduces budget pillar score and generates critical alert when budget limit is exceeded", () => {
    const transactions: Transaction[] = [
      { id: "tx1", name: "Duże zakupy", amount: 1800, type: "expense", category: "Jedzenie", isoDate: "2026-07-15", account: "Konto", currency: "PLN" },
    ];

    const result = getFinancialHealthSummary(
      { ...baseProfile, budgets: { Jedzenie: 1500 }, transactions },
      [],
      { todayIsoStr }
    );

    expect(result.status).toBe("ACTIVE");
    expect(result.pillars.budget.score).toBeLessThan(20);
    expect(result.negativeDrivers).toContain("Przekroczono limit w 1 kategorii");
    
    const budgetAlert = result.alerts.find(a => a.id.startsWith("budget_exceeded_"));
    expect(budgetAlert).toBeDefined();
    expect(budgetAlert?.severity).toBe("critical");
    expect(budgetAlert?.title).toContain("Przekroczony budżet: Jedzenie");
  });

  it("reduces liquidity pillar score when forecast detects negative dip or deficit", () => {
    const emptyAccountProfile: Profile = {
      ...baseProfile,
      transactions: [{ id: "tx_init", name: "Stan początkowy", amount: 100, type: "income", category: "Inne", isoDate: "2026-07-01", account: "Konto", currency: "PLN" }],
      payments: [
        { id: "p1", name: "Duża rata", amount: 1500, status: "Do opłacenia", category: "Kredyt", isRecurring: true, dueDate: "2026-08-01", currency: "PLN" }
      ]
    };

    const result = getFinancialHealthSummary(emptyAccountProfile, [], { todayIsoStr });

    expect(result.status).toBe("ACTIVE");
    expect(result.pillars.liquidity.score).toBe(0);
    expect(result.pillars.liquidity.status).toBe("poor");
    
    const liquidityAlert = result.alerts.find(a => a.severity === "critical" && a.pillar === "liquidity");
    expect(liquidityAlert).toBeDefined();
    expect(liquidityAlert?.title).toContain("Zagrożenie deficytem płynności");
  });

  it("penalizes fixed costs when subscriptions & bills exceed 70% of monthly income", () => {
    const transactions: Transaction[] = [
      { id: "tx_inc", name: "Pensja", amount: 3000, type: "income", category: "Praca", isoDate: "2026-07-01", account: "Konto", currency: "PLN" },
    ];
    const recurringRules: RecurringRule[] = [
      { id: "rec1", name: "Pensja", type: "income", amount: 3000, category: "Praca", account: "Konto", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true, currency: "PLN" },
      { id: "rec2", name: "Czynsz", type: "expense", amount: 2400, category: "Czynsz i leasing", account: "Konto", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true, currency: "PLN" },
    ];

    const result = getFinancialHealthSummary(
      { ...baseProfile, transactions },
      recurringRules,
      { todayIsoStr }
    );

    // 2400 / 3000 = 80% fixed cost burden
    expect(result.status).toBe("ACTIVE");
    expect(result.pillars.fixedCosts.score).toBeLessThan(25);
    const fixedAlert = result.alerts.find(a => a.pillar === "fixed_costs");
    expect(fixedAlert).toBeDefined();
    expect(fixedAlert?.severity).toBe("critical");
    expect(fixedAlert?.title).toContain("Wysokie koszty stałe");
  });

  it("handles null or low-data profile safely with INSUFFICIENT_DATA and score null", () => {
    const resultNull = getFinancialHealthSummary(null);
    expect(resultNull.isLowData).toBe(true);
    expect(resultNull.status).toBe("INSUFFICIENT_DATA");
    expect(resultNull.score).toBeNull();
    expect(resultNull.gradeLabel).toBe("Brak wystarczających danych");
    expect(resultNull.alerts).toHaveLength(0);

    const emptyProfile: Profile = {
      ...baseProfile,
      accounts: [],
      payments: [],
      transactions: [],
      budgets: { "Żywność": 0, "Dom i rachunki": 0, "Transport": 0, "Rozrywka": 0 },
    };

    const resultEmpty = getFinancialHealthSummary(emptyProfile, [], { todayIsoStr });
    expect(resultEmpty.isLowData).toBe(true);
    expect(resultEmpty.status).toBe("INSUFFICIENT_DATA");
    expect(resultEmpty.score).toBeNull();
    expect(resultEmpty.gradeLabel).toBe("Brak wystarczających danych");
    expect(resultEmpty.alerts).toHaveLength(0);
    expect(resultEmpty.positiveDrivers).toHaveLength(0);
    expect(resultEmpty.negativeDrivers).toHaveLength(0);
  });

  // =========================================================================
  // FAZA 8 — REGRESSION TESTS (TEST 1 to TEST 7)
  // =========================================================================

  describe("Faza 8 — Regresja semantyki profilu i stanu danych", () => {
    it("TEST 1: Nowy profil (0 transakcji) -> INSUFFICIENT_DATA, score = null, brak 'Dobra kondycja', brak alertu 'Niski bufor'", () => {
      const freshProfile: Profile = {
        id: "fresh_1",
        name: "Świeży Profil",
        kind: "personal",
        currency: "PLN",
        transactions: [],
        payments: [],
        goals: [],
        investments: [],
        budgets: {
          "Żywność": 0,
          "Dom i rachunki": 0,
          "Transport": 0,
          "Rozrywka": 0
        }
      };

      const result = getFinancialHealthSummary(freshProfile, [], { todayIsoStr });

      expect(result.status).toBe("INSUFFICIENT_DATA");
      expect(result.score).toBeNull();
      expect(result.grade).toBe("insufficient_data");
      expect(result.gradeLabel).toBe("Brak wystarczających danych");
      expect(result.gradeLabel).not.toBe("Dobra kondycja");
      expect(result.alerts).toHaveLength(0);
      expect(result.alerts.some(a => a.title.includes("Niski bufor gotówkowy"))).toBe(false);
      expect(result.pillars.budget.score).toBeNull();
      expect(result.pillars.payments.score).toBeNull();
      expect(result.pillars.liquidity.score).toBeNull();
      expect(result.pillars.fixedCosts.score).toBeNull();
    });

    it("TEST 2: Jedna transakcja przychodząca -> score i status są wyliczane (ACTIVE, wysoki score, brak fałszywego bufora)", () => {
      const singleIncomeProfile: Profile = {
        id: "p_income_1",
        name: "Profil Wpływ",
        kind: "personal",
        currency: "PLN",
        transactions: [
          { id: "tx_inc", name: "Wynagrodzenie", amount: 7000, type: "income", category: "Wynagrodzenie", isoDate: todayIsoStr, account: "Konto", currency: "PLN" }
        ],
        payments: [],
        goals: [],
        investments: [],
        budgets: {}
      };

      const result = getFinancialHealthSummary(singleIncomeProfile, [], { todayIsoStr });

      expect(result.status).toBe("ACTIVE");
      expect(typeof result.score).toBe("number");
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.gradeLabel).not.toBe("Brak wystarczających danych");
      // Bufor płynności jest bezpieczny (7000 zł > 500 zł), więc nie ma alertu niskiego bufora
      expect(result.alerts.some(a => a.title.includes("Niski bufor gotówkowy"))).toBe(false);
    });

    it("TEST 3: Jedna transakcja wychodząca -> score i status są wyliczane (ACTIVE, spadek płynności odzwierciedlony w score)", () => {
      const singleExpenseProfile: Profile = {
        id: "p_exp_1",
        name: "Profil Wydatek",
        kind: "personal",
        currency: "PLN",
        transactions: [
          { id: "tx_exp", name: "Duży zakup", amount: 1500, type: "expense", category: "Inne", isoDate: todayIsoStr, account: "Konto", currency: "PLN" }
        ],
        payments: [],
        goals: [],
        investments: [],
        budgets: {}
      };

      const result = getFinancialHealthSummary(singleExpenseProfile, [], { todayIsoStr });

      expect(result.status).toBe("ACTIVE");
      expect(typeof result.score).toBe("number");
      // Saldo wynosi -1500 zł, więc filar płynności wykrywa deficyt
      expect(result.pillars.liquidity.score).toBe(0);
      expect(result.alerts.some(a => a.pillar === "liquidity" && a.severity === "critical")).toBe(true);
    });

    it("TEST 4: Wpływy + wydatki -> prawidłowy bilans i zrównoważony score", () => {
      const balancedProfile: Profile = {
        id: "p_bal",
        name: "Zrównoważony",
        kind: "personal",
        currency: "PLN",
        transactions: [
          { id: "tx_inc", name: "Wpłata", amount: 5000, type: "income", category: "Praca", isoDate: "2026-07-01", account: "Konto", currency: "PLN" },
          { id: "tx_exp", name: "Zakupy", amount: 1200, type: "expense", category: "Jedzenie", isoDate: "2026-07-10", account: "Konto", currency: "PLN" },
        ],
        payments: [],
        goals: [],
        investments: [],
        budgets: { Jedzenie: 2000 }
      };

      const result = getFinancialHealthSummary(balancedProfile, [], { todayIsoStr });

      expect(result.status).toBe("ACTIVE");
      expect(typeof result.score).toBe("number");
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.pillars.budget.score).toBe(25);
      expect(result.pillars.liquidity.score).toBe(25);
    });

    it("TEST 5: Pełny miesiąc danych -> precyzyjny deterministyczny wynik wszystkich 4 filarów", () => {
      const fullMonthProfile: Profile = {
        id: "p_full",
        name: "Pełny Miesiąc",
        kind: "personal",
        currency: "PLN",
        budgets: { Jedzenie: 2000, Rachunki: 1000 },
        transactions: [
          { id: "t1", name: "Pensja", amount: 8000, type: "income", category: "Wynagrodzenie", isoDate: "2026-07-01", account: "Konto", currency: "PLN" },
          { id: "t2", name: "Supermarket", amount: 1200, type: "expense", category: "Jedzenie", isoDate: "2026-07-05", account: "Konto", currency: "PLN" },
          { id: "t3", name: "Prąd", amount: 350, type: "expense", category: "Rachunki", isoDate: "2026-07-12", account: "Konto", currency: "PLN" },
        ],
        payments: [
          { id: "p1", name: "Internet", amount: 90, status: "Opłacono", category: "Media", dueDate: "2026-07-15", currency: "PLN" }
        ],
        goals: [],
        investments: [],
      };

      const result = getFinancialHealthSummary(fullMonthProfile, [], { todayIsoStr });

      expect(result.status).toBe("ACTIVE");
      expect(result.score).toBe(100);
      expect(result.grade).toBe("excellent");
      expect(result.pillars.budget.score).toBe(25);
      expect(result.pillars.payments.score).toBe(25);
      expect(result.pillars.liquidity.score).toBe(25);
      expect(result.pillars.fixedCosts.score).toBe(25);
    });

    it("TEST 6: Profil po resecie -> stare dane/cache nie wpływają na nowy lub zresetowany profil", () => {
      // Symulacja profilu po wyczyszczeniu wszystkich transakcji
      const profileBeforeReset: Profile = {
        ...baseProfile,
        transactions: [
          { id: "tx1", name: "Wpływ", amount: 5000, type: "income", category: "Praca", isoDate: todayIsoStr, account: "Konto", currency: "PLN" }
        ]
      };

      const resultBefore = getFinancialHealthSummary(profileBeforeReset, [], { todayIsoStr });
      expect(resultBefore.status).toBe("ACTIVE");
      expect(resultBefore.score).not.toBeNull();

      // Reset
      const profileAfterReset: Profile = {
        ...profileBeforeReset,
        transactions: [],
        payments: []
      };

      const resultAfter = getFinancialHealthSummary(profileAfterReset, [], { todayIsoStr });
      expect(resultAfter.status).toBe("INSUFFICIENT_DATA");
      expect(resultAfter.score).toBeNull();
      expect(resultAfter.gradeLabel).toBe("Brak wystarczających danych");
      expect(resultAfter.alerts).toHaveLength(0);
    });

    it("TEST 7: Nowy profil po zapisie i odtworzeniu (persistence / JSON roundtrip) zachowuje stan INSUFFICIENT_DATA", () => {
      const newlyCreatedProfile: Profile = {
        id: "p_persist_test",
        name: "Test Persistence",
        kind: "personal",
        currency: "PLN",
        transactions: [],
        payments: [],
        goals: [],
        investments: [],
        budgets: {
          "Żywność": 0,
          "Dom i rachunki": 0,
          "Transport": 0,
          "Rozrywka": 0
        }
      };

      // Symulacja zapisu do IDB / localStorage (JSON serialization roundtrip)
      const serialized = JSON.stringify(newlyCreatedProfile);
      const reloadedProfile: Profile = JSON.parse(serialized);

      const result = getFinancialHealthSummary(reloadedProfile, [], { todayIsoStr });
      expect(result.status).toBe("INSUFFICIENT_DATA");
      expect(result.score).toBeNull();
      expect(result.gradeLabel).toBe("Brak wystarczających danych");
      expect(result.alerts).toHaveLength(0);
      expect(result.alerts.some(a => a.title.includes("Niski bufor"))).toBe(false);
    });
  });

  it("sorts alerts strictly by severity: critical -> warning -> positive", () => {
    const profileWithMixedAlerts: Profile = {
      ...baseProfile,
      budgets: { Jedzenie: 500 },
      transactions: [
        { id: "tx1", name: "Supermarket", amount: 800, type: "expense", category: "Jedzenie", isoDate: "2026-07-10", account: "Konto", currency: "PLN" },
        { id: "tx2", name: "Pensja", amount: 4000, type: "income", category: "Praca", isoDate: "2026-07-01", account: "Konto", currency: "PLN" },
      ],
      payments: [
        { id: "pay_soon", name: "Internet", amount: 80, status: "Do opłacenia", category: "Media", isRecurring: true, dueDate: "2026-07-26", currency: "PLN" },
      ]
    };

    const result = getFinancialHealthSummary(profileWithMixedAlerts, [], { todayIsoStr });

    expect(result.alerts.length).toBeGreaterThanOrEqual(2);

    // Critical must come before warning/positive
    const severities = result.alerts.map(a => a.severity);
    const criticalIdx = severities.indexOf("critical");
    const warningIdx = severities.indexOf("warning");
    const positiveIdx = severities.indexOf("positive");

    if (criticalIdx !== -1 && warningIdx !== -1) {
      expect(criticalIdx).toBeLessThan(warningIdx);
    }
    if (warningIdx !== -1 && positiveIdx !== -1) {
      expect(warningIdx).toBeLessThan(positiveIdx);
    }
  });
});
