import { describe, it, expect } from "vitest";
import {
  calculateSafeToSpend,
  calculateEndOfMonthForecast,
  calculateBudgetWarnings,
  calculateMonthlyTotals,
  calculateEmergencyLimit,
  calculateInvestmentCushion,
  getUnpaidAndUrgentPayments,
  calculateBudgetSummary,
  calculateRunway,
  calculateMoMTrends,
  calculate503020
} from "./services/budgetCalculations";
import { Profile, RecurringRule, Transaction } from "./types";

describe("KROK 8A — Bezpieczna kwota do wydania", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Test Profile",
    kind: "personal",
    transactions: [
      { id: "t1", name: "Pensja", amount: 5000, type: "income", category: "Wynagrodzenie", account: "Główne", isoDate: "2026-07-01",
          currency: "PLN" as const
    },
      { id: "t2", name: "Zakupy", amount: 1000, type: "expense", category: "Żywność", account: "Główne", isoDate: "2026-07-05",
          currency: "PLN" as const
    }
    ],
    payments: [],
    goals: [],
    investments: [],
    currency: "PLN" as const, budgets: {}
  };

  it("brak płatności — zwraca pełne saldo minus brak obciążeń", () => {
    // Current balance = 5000 - 1000 = 4000
    const res = calculateSafeToSpend(baseProfile, [], "2026-07-15");
    expect(res.currentBalance).toBe(4000);
    expect(res.unpaidPaymentsSum).toBe(0);
    expect(res.futureRecurringExpensesSum).toBe(0);
    expect(res.reservedGoalsSum).toBe(0);
    expect(res.safeToSpend).toBe(4000);
    expect(res.isNegative).toBe(false);
  });

  it("płatność dziś — uwzględnia płatność wymagalną dzisiaj", () => {
    const profileWithPayment: Profile = {
      ...baseProfile,
      payments: [
        { id: "pay1", name: "Rachunek za prąd", amount: 300, dueDate: "2026-07-15", status: "Do opłacenia",
            currency: "PLN" as const
        }
      ]
    };

    const res = calculateSafeToSpend(profileWithPayment, [], "2026-07-15");
    expect(res.unpaidPaymentsSum).toBe(300);
    expect(res.safeToSpend).toBe(3700); // 4000 - 300
  });

  it("zaległa płatność z przeszłości — wchodzi do sumy nieopłaconych", () => {
    const profileWithOverduePayment: Profile = {
      ...baseProfile,
      payments: [
        { id: "pay-overdue", name: "Zaległy telefon", amount: 200, dueDate: "2026-07-10", status: "Do opłacenia",
            currency: "PLN" as const
        }
      ]
    };

    const res = calculateSafeToSpend(profileWithOverduePayment, [], "2026-07-23");
    expect(res.unpaidPaymentsSum).toBe(200);
    expect(res.safeToSpend).toBe(3800); // 4000 - 200

    const forecastRes = calculateEndOfMonthForecast(profileWithOverduePayment, [], "2026-07-23");
    expect(forecastRes.unpaidPaymentsSum).toBe(200);
  });

  it("płatność po końcu miesiąca — ignoruje płatności z przyszłego miesiąca", () => {
    const profileWithFuturePayment: Profile = {
      ...baseProfile,
      payments: [
        { id: "pay1", name: "Czynsz za Sierpień", amount: 1500, dueDate: "2026-08-05", status: "Do opłacenia",
            currency: "PLN" as const
        }
      ]
    };

    const res = calculateSafeToSpend(profileWithFuturePayment, [], "2026-07-15");
    expect(res.unpaidPaymentsSum).toBe(0);
    expect(res.safeToSpend).toBe(4000);
  });

  it("płatność opłacona — ignoruje opłacone rachunki", () => {
    const profileWithPaidPayment: Profile = {
      ...baseProfile,
      payments: [
        { id: "pay1", name: "Rachunek opłacony", amount: 400, dueDate: "2026-07-20", status: "Opłacono",
            currency: "PLN" as const
        }
      ]
    };

    const res = calculateSafeToSpend(profileWithPaidPayment, [], "2026-07-15");
    expect(res.unpaidPaymentsSum).toBe(0);
    expect(res.safeToSpend).toBe(4000);
  });

  it("saldo ujemne — prawidłowo flaguje ujemną bezpieczną kwotę", () => {
    const lowBalanceProfile: Profile = {
      ...baseProfile,
      transactions: [
        { id: "t1", name: "Wpłata", amount: 500, type: "income", category: "Inne", account: "Główne", isoDate: "2026-07-01",
            currency: "PLN" as const
        },
        { id: "t2", name: "Duży wydatek", amount: 1000, type: "expense", category: "Inne", account: "Główne", isoDate: "2026-07-02",
            currency: "PLN" as const
        }
      ],
      payments: [
        { id: "p1", name: "Rata", amount: 300, dueDate: "2026-07-20", status: "Do opłacenia",
            currency: "PLN" as const
        }
      ]
    };

    // Current balance = 500 - 1000 = -500. Unpaid = 300. Safe = -800.
    const res = calculateSafeToSpend(lowBalanceProfile, [], "2026-07-15");
    expect(res.currentBalance).toBe(-500);
    expect(res.safeToSpend).toBe(-800);
    expect(res.isNegative).toBe(true);
  });

  it("polskie daty i przełom miesiąca — uwzględnia reguły cykliczne oraz cele do końca miesiąca", () => {
    const profileWithGoal: Profile = {
      ...baseProfile,
      goals: [
        { id: "g1", name: "Wakacje", target: 5000, saved: 1200 }
      ],
      payments: [
        { id: "p1", name: "Internet", amount: 100, dueDate: "2026-07-31", status: "Do opłacenia",
            currency: "PLN" as const
        }
      ]
    };

    const rules: RecurringRule[] = [
      {
        id: "r1",
        name: "Subskrypcja Spotify",
        amount: 30,
        type: "expense",
        category: "Rozrywka",
        account: "Główne",
        frequency: "monthly",
        nextDueDate: "2026-07-28",
        isActive: true,
          currency: "PLN" as const
    }
    ];

    // Today is 2026-07-25 (end of month is 2026-07-31).
    // Current balance = 4000
    // Unpaid payments (due 07-31) = 100
    // Future recurring expense (due 07-28) = 30
    // Reserved goals = 1200
    // Safe = 4000 - 100 - 30 - 1200 = 2670
    const res = calculateSafeToSpend(profileWithGoal, rules, "2026-07-25");
    expect(res.currentBalance).toBe(4000);
    expect(res.unpaidPaymentsSum).toBe(100);
    expect(res.futureRecurringExpensesSum).toBe(30);
    expect(res.reservedGoalsSum).toBe(1200);
    expect(res.safeToSpend).toBe(2670);
    expect(res.isNegative).toBe(false);
  });

  it("dane z polskimi znakami w nazwie płatności — poprawnie przetwarza i oblicza kwoty", () => {
    const profileWithPolishChars: Profile = {
      ...baseProfile,
      payments: [
        { id: "p-pl", name: "Opłata za prąd i żarówki w Rzeszowie 💡", amount: 250, dueDate: "2026-07-20", status: "Do opłacenia",
            currency: "PLN" as const
        },
        { id: "p-pl2", name: "Czynsz spółdzielczy — Żoliborz", amount: 750, dueDate: "2026-07-22", status: "Do opłacenia",
            currency: "PLN" as const
        }
      ]
    };

    const rules: RecurringRule[] = [
      {
        id: "r-pl",
        name: "Abonament za telefon i internet — Łódź 📱",
        amount: 80,
        type: "expense",
        category: "Telefon",
        account: "Główne",
        frequency: "monthly",
        nextDueDate: "2026-07-29",
        isActive: true,
          currency: "PLN" as const
    }
    ];

    const res = calculateSafeToSpend(profileWithPolishChars, rules, "2026-07-15");
    // 4000 - 250 - 750 - 80 = 2920
    expect(res.unpaidPaymentsSum).toBe(1000);
    expect(res.futureRecurringExpensesSum).toBe(80);
    expect(res.safeToSpend).toBe(2920);
  });
});

describe("KROK 8B — Prognoza salda do końca miesiąca", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Test Profile",
    kind: "personal",
    transactions: [
      { id: "t1", name: "Pensja", amount: 5000, type: "income", category: "Wypłata", account: "Główne", isoDate: "2026-07-01",
          currency: "PLN" as const
    },
      { id: "t2", name: "Wydatki", amount: 1000, type: "expense", category: "Życie", account: "Główne", isoDate: "2026-07-05",
          currency: "PLN" as const
    }
    ],
    payments: [],
    goals: [],
    investments: [],
    currency: "PLN" as const, budgets: {}
  };

  it("tylko przyszły przychód — dodaje przyszły dochód cykliczny", () => {
    const rules: RecurringRule[] = [
      { id: "r1", name: "Premia", amount: 500, type: "income", category: "Praca", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-28", isActive: true,
          currency: "PLN" as const
    }
    ];
    // balance: 4000 + 500 = 4500
    const res = calculateEndOfMonthForecast(baseProfile, rules, "2026-07-15");
    expect(res.currentBalance).toBe(4000);
    expect(res.futureRecurringIncomesSum).toBe(500);
    expect(res.futureRecurringExpensesSum).toBe(0);
    expect(res.forecastedBalance).toBe(4500);
    expect(res.isNegative).toBe(false);
  });

  it("tylko przyszły wydatek — odlicza z salda", () => {
    const rules: RecurringRule[] = [
      { id: "r1", name: "Subskrypcja", amount: 200, type: "expense", category: "Rozrywka", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true,
          currency: "PLN" as const
    }
    ];
    const profileWithPayment = {
      ...baseProfile,
      payments: [{ id: "p1", name: "Rachunek", amount: 300, dueDate: "2026-07-25", status: "Do opłacenia" as const,
          currency: "PLN" as const
    }]
    };
    
    // balance: 4000 - 300 (payment) - 200 (rule) = 3500
    const res = calculateEndOfMonthForecast(profileWithPayment, rules, "2026-07-15");
    expect(res.unpaidPaymentsSum).toBe(300);
    expect(res.futureRecurringExpensesSum).toBe(200);
    expect(res.forecastedBalance).toBe(3500);
  });

  it("jednoczesny przychód i wydatek — uwzględnia oba", () => {
    const rules: RecurringRule[] = [
      { id: "r1", name: "Kieszonkowe", amount: 100, type: "income", category: "Inne", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-25", isActive: true,
          currency: "PLN" as const
    },
      { id: "r2", name: "Netflix", amount: 50, type: "expense", category: "Rozrywka", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-26", isActive: true,
          currency: "PLN" as const
    }
    ];
    // 4000 + 100 - 50 = 4050
    const res = calculateEndOfMonthForecast(baseProfile, rules, "2026-07-15");
    expect(res.futureRecurringIncomesSum).toBe(100);
    expect(res.futureRecurringExpensesSum).toBe(50);
    expect(res.forecastedBalance).toBe(4050);
  });

  it("reguła cykliczna miesięczna - nie liczy wystąpień po końcu miesiąca", () => {
    const rules: RecurringRule[] = [
      { id: "r1", name: "Abonament", amount: 80, type: "expense", category: "TV", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true,
          currency: "PLN" as const
    }
    ];
    const res = calculateEndOfMonthForecast(baseProfile, rules, "2026-07-15");
    expect(res.futureRecurringExpensesSum).toBe(80); // only July counts
  });

  it("brak podwójnego liczenia — ignoruje reguły, które mają już wygenerowaną transakcję/płatność", () => {
    const rules: RecurringRule[] = [
      { id: "rule-1", name: "Abonament", amount: 80, type: "expense", category: "TV", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true,
          currency: "PLN" as const
    }
    ];
    
    // There's a payment with this rule id and date
    const profileWithDups = {
      ...baseProfile,
      payments: [{ id: "p1", name: "Abonament", amount: 80, dueDate: "2026-07-20", status: "Do opłacenia" as const, recurringRuleId: "rule-1",
          currency: "PLN" as const
    }]
    };

    const res = calculateEndOfMonthForecast(profileWithDups, rules, "2026-07-15");
    expect(res.unpaidPaymentsSum).toBe(80);
    expect(res.futureRecurringExpensesSum).toBe(0); // Deduplicated!
    expect(res.forecastedBalance).toBe(3920);
  });

  it("data na ostatni dzień miesiąca — uwzględnia z dokładnością do dnia", () => {
    const rules: RecurringRule[] = [
      { id: "r1", name: "Rata", amount: 500, type: "expense", category: "Kredyt", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-31", isActive: true,
          currency: "PLN" as const
    }
    ];
    const res = calculateEndOfMonthForecast(baseProfile, rules, "2026-07-15");
    expect(res.futureRecurringExpensesSum).toBe(500); // 31 is included
    expect(res.forecastDate).toBe("2026-07-31");
  });

  it("prognoza ujemna — poprawnie oznacza zagrożenie debetem", () => {
    const profileLow = {
      ...baseProfile,
      transactions: [{ id: "t1", name: "Bieda", amount: 500, type: "income" as const, category: "Wypłata", account: "Główne", isoDate: "2026-07-01",
          currency: "PLN" as const
    }]
    };
    const rules: RecurringRule[] = [
      { id: "r1", name: "Rata", amount: 600, type: "expense", category: "Kredyt", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true,
          currency: "PLN" as const
    }
    ];
    const res = calculateEndOfMonthForecast(profileLow, rules, "2026-07-15");
    // 500 - 600 = -100
    expect(res.forecastedBalance).toBe(-100);
    expect(res.isNegative).toBe(true);
  });
});

describe("KROK 8C — Alerty budżetowe (80% i 100%)", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Test Profile",
    kind: "personal",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    currency: "PLN" as const, budgets: {
      "Żywność": 1000,
      "Transport": 500,
      "Bez limitu": 0
    }
  };

  it("wykorzystanie 0% — status normalny", () => {
    const res = calculateBudgetWarnings(baseProfile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("normal");
    expect(food?.ratio).toBe(0);
  });

  it("dokładnie 80% — status ostrzeżenie", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "t1", type: "expense" as const, category: "Żywność", account: "X", amount: 800, isoDate: "2026-07-05",
            currency: "PLN" as const
        }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("warning");
    expect(food?.percent).toBe(80);
  });

  it("99.99% — status ostrzeżenie", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "t1", type: "expense" as const, category: "Żywność", account: "X", amount: 999.9, isoDate: "2026-07-05",
            currency: "PLN" as const
        }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("warning");
  });

  it("dokładnie 100% — status przekroczony", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "t1", type: "expense" as const, category: "Żywność", account: "X", amount: 1000, isoDate: "2026-07-05",
            currency: "PLN" as const
        }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("exceeded");
    expect(food?.percent).toBe(100);
  });

  it("ponad 100% — status przekroczony", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "t1", type: "expense" as const, category: "Żywność", account: "X", amount: 1500, isoDate: "2026-07-05",
            currency: "PLN" as const
        }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("exceeded");
    expect(food?.percent).toBe(100);
    expect(food?.ratio).toBe(1.5);
  });

  it("limit 0 lub brak limitu — brak ostrzeżeń i elementu", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "t1", type: "expense" as const, category: "Bez limitu", account: "X", amount: 1000, isoDate: "2026-07-05",
            currency: "PLN" as const
        },
        { id: "2", name: "t2", type: "expense" as const, category: "Inne", account: "X", amount: 5000, isoDate: "2026-07-05",
            currency: "PLN" as const
        }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    expect(res.find(w => w.category === "Bez limitu")).toBeUndefined();
    expect(res.find(w => w.category === "Inne")).toBeUndefined();
  });

  it("ujemna korekta/zwrot — zmniejsza wykorzystanie limitu", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "Zakupy", type: "expense" as const, category: "Żywność", account: "X", amount: 900, isoDate: "2026-07-05",
            currency: "PLN" as const
        },
        { id: "2", name: "Zwrot", type: "expense" as const, category: "Żywność", account: "X", amount: -150, isoDate: "2026-07-10",
            currency: "PLN" as const
        }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.spent).toBe(750);
    expect(food?.status).toBe("normal");
  });

  it("tylko wydatki z bieżącego miesiąca", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "Czerwiec", type: "expense" as const, category: "Żywność", account: "X", amount: 800, isoDate: "2026-06-05",
            currency: "PLN" as const
        },
        { id: "2", name: "Lipiec", type: "expense" as const, category: "Żywność", account: "X", amount: 200, isoDate: "2026-07-05",
            currency: "PLN" as const
        }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.spent).toBe(200);
    expect(food?.status).toBe("normal");
  });
});

describe("PROMPT 4 - Izolacja kalkulacji dla aktywnego profilu", () => {
  const baseProfile: Profile = {
    id: "prof-A",
    name: "Profil A",
    kind: "personal",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    currency: "PLN" as const, budgets: {
      "Żywność": 1000
    }
  };

  it("reguły obcego profilu nie wpływają na safe-to-spend (choć z racji API funkcji dostarczamy tylko reguły aktywnego)", () => {
    // We simulate the correct usage where only active rules are passed
    // And verify safe-to-spend only considers those.
    const rulesA: RecurringRule[] = [
      { id: "r-A", name: "Expense A", amount: 200, type: "expense", category: "Test", account: "Cash", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true,
          currency: "PLN" as const
    }
    ];
    // In practice, rulesB won't even be passed, but we test the isolation on the profile transactions level as well.
    const res = calculateSafeToSpend(baseProfile, rulesA, "2026-07-15");
    expect(res.futureRecurringExpensesSum).toBe(200);
  });

  it("forecast profilu A ignoruje recurring B", () => {
    const rulesA: RecurringRule[] = [
      { id: "r-A", name: "Income A", amount: 1000, type: "income", category: "Test", account: "Cash", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true,
          currency: "PLN" as const
    }
    ];
    
    // Test that forecastedBalance only uses rulesA
    const res = calculateEndOfMonthForecast(baseProfile, rulesA, "2026-07-15");
    expect(res.futureRecurringIncomesSum).toBe(1000);
    expect(res.forecastedBalance).toBe(1000);
  });

  it("warnings liczą tylko transakcje aktywnego profilu", () => {
    // profile contains ONLY its own transactions
    const profileA = {
      ...baseProfile,
      transactions: [
        { id: "t1", name: "A", type: "expense" as const, category: "Żywność", account: "X", amount: 800, isoDate: "2026-07-05",
            currency: "PLN" as const
        }
      ]
    };
    
    const res = calculateBudgetWarnings(profileA, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("warning");
    expect(food?.spent).toBe(800);
  });
});

describe("R6c - roundCurrency w budgetCalculations (precyzja float)", () => {
  it("spent 10.10 + 10.20 zaokrąglone do 20.3 (bez błędu float)", () => {
    const profile: Profile = {
      id: "p1",
      name: "Test",
      kind: "personal",
      transactions: [
        { id: "t1", name: "A", type: "expense" as const, category: "Jedzenie", account: "X", amount: 10.10, isoDate: "2026-07-05",
            currency: "PLN" as const
        },
        { id: "t2", name: "B", type: "expense" as const, category: "Jedzenie", account: "X", amount: 10.20, isoDate: "2026-07-06",
            currency: "PLN" as const
        }
      ],
      payments: [],
      goals: [],
      investments: [],
      currency: "PLN" as const, budgets: { "Jedzenie": 50 }
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Jedzenie");
    expect(food).toBeDefined();
    // Bez roundCurrency: 10.10 + 10.20 = 20.299999999999997
    // Z roundCurrency: 20.3
    expect(food!.spent).toBe(20.3);
    expect(food!.status).toBe("normal");
  });

  describe("Narzędzia pomocnicze dashboardu (Krok 2 refaktoring)", () => {
    it("calculateMonthlyTotals — poprawnie grupuje przychody, wydatki i kategorie w danym miesiącu", () => {
      const txs = [
        { id: "1", name: "Pensja", amount: 5000, type: "income" as const, category: "Wynagrodzenie", account: "Główne", isoDate: "2026-08-01", currency: "PLN" as const },
        { id: "2", name: "Obiad", amount: 50, type: "expense" as const, category: "Jedzenie", account: "Główne", isoDate: "2026-08-05", currency: "PLN" as const },
        { id: "3", name: "Kino", amount: 30, type: "expense" as const, category: "Rozrywka", account: "Główne", isoDate: "2026-08-10", currency: "PLN" as const },
        { id: "4", name: "Stary wydatek", amount: 100, type: "expense" as const, category: "Jedzenie", account: "Główne", isoDate: "2026-07-20", currency: "PLN" as const }
      ];
      const res = calculateMonthlyTotals(txs, new Date("2026-08-15"));
      expect(res.totalIncome).toBe(5000);
      expect(res.totalExpense).toBe(80);
      expect(res.balance).toBe(4920);
      expect(res.categorySpentMap["Jedzenie"]).toBe(50);
      expect(res.categorySpentMap["Rozrywka"]).toBe(30);
    });

    it("calculateEmergencyLimit i calculateInvestmentCushion — poprawnie zliczają limity i poduszki", () => {
      const accounts = [
        { id: "a1", name: "Karta", bankName: "Bank", type: "credit" as const, balance: 0, hasCreditLimit: true, creditLimit: 2000, currency: "PLN" as const }
      ];
      const investments = [
        { id: "i1", name: "Fundusz", amount: 15000, type: "Poduszka finansowa" as const, currency: "PLN" as const, isoDate: "2026-01-01" },
        { id: "i2", name: "Akcje", amount: 5000, type: "Akcje" as const, currency: "PLN" as const, isoDate: "2026-01-01" }
      ];

      expect(calculateEmergencyLimit(accounts)).toBe(2000);
      expect(calculateInvestmentCushion(investments)).toBe(15000);
    });

    it("getUnpaidAndUrgentPayments — sortuje nieopłacone i liczy pilne płatności", () => {
      const today = new Date();
      const dueDateUrgent = today.toISOString().split("T")[0];
      const payments = [
        { id: "p1", name: "Prąd", amount: 200, dueDate: dueDateUrgent, status: "Do opłacenia" as const, currency: "PLN" as const },
        { id: "p2", name: "Gaz", amount: 100, dueDate: "2099-01-01", status: "Opłacono" as const, currency: "PLN" as const }
      ];

      const res = getUnpaidAndUrgentPayments(payments);
      expect(res.unpaidPayments.length).toBe(1);
      expect(res.urgentPaymentsCount).toBe(1);
    });

    it("calculateBudgetSummary — wylicza planowany i rzeczywisty budżet dla podanych kategorii", () => {
      const budgets = { "Jedzenie": 500, "Transport": 200 };
      const categorySpentMap = { "Jedzenie": 300, "Inne": 50 };
      const categories = ["Jedzenie", "Transport"];

      const res = calculateBudgetSummary(budgets, categorySpentMap, categories);
      expect(res.totalPlannedBudget).toBe(700);
      expect(res.totalActualSpentInBudget).toBe(300);
    });
  });

  describe("EPIC 2 — Analytics Foundation (Runway, MoM, 50/30/20)", () => {
    it("calculateRunway — poprawnie wylicza poduszkę finansową i statusy", () => {
      // 1. Null profile
      expect(calculateRunway(null)).toEqual({
        liquidAssets: 0,
        avgMonthlyExpenses: 0,
        runwayMonths: 0,
        status: "critical"
      });

      // 2. Profile with income only (no expenses)
      const noExpensesProfile: Profile = {
        id: "p-no-exp",
        name: "Test",
        kind: "personal",
        currency: "PLN",
        budgets: {},
        transactions: [
          { id: "t1", name: "Pensja", amount: 5000, type: "income", category: "Praca", account: "Konto", isoDate: "2026-07-01", currency: "PLN" }
        ],
        payments: [],
        goals: [],
        investments: []
      };
      const noExpRes = calculateRunway(noExpensesProfile);
      expect(noExpRes.liquidAssets).toBe(5000);
      expect(noExpRes.runwayMonths).toBe(Infinity);
      expect(noExpRes.status).toBe("infinite");

      // 3. Healthy runway (6+ months)
      const healthyProfile: Profile = {
        id: "p-healthy",
        name: "Healthy",
        kind: "personal",
        currency: "PLN",
        budgets: {},
        transactions: [
          { id: "t1", name: "Saldo początkowe", amount: 20000, type: "income", category: "Inne", account: "Konto", isoDate: "2026-06-01", currency: "PLN" },
          { id: "t2", name: "Czerwiec wydatki", amount: 2000, type: "expense", category: "Żywność", account: "Konto", isoDate: "2026-06-15", currency: "PLN" },
          { id: "t3", name: "Lipiec wydatki", amount: 2000, type: "expense", category: "Żywność", account: "Konto", isoDate: "2026-07-15", currency: "PLN" }
        ],
        payments: [],
        goals: [
          { id: "g1", name: "Poduszka", target: 10000, saved: 4000, currency: "PLN" }
        ],
        investments: [
          { id: "i1", name: "Obligacje skarbowe", amount: 6000, type: "Poduszka finansowa", isoDate: "2026-01-01", currency: "PLN" }
        ]
      };
      // Liquid assets = (20000 - 4000) + 4000 (goal) + 6000 (cushion) = 26000
      // Avg monthly expense = (2000 + 2000) / 2 = 2000
      // Runway = 26000 / 2000 = 13 months -> healthy
      const healthyRes = calculateRunway(healthyProfile, 3);
      expect(healthyRes.liquidAssets).toBe(26000);
      expect(healthyRes.avgMonthlyExpenses).toBe(2000);
      expect(healthyRes.runwayMonths).toBe(13);
      expect(healthyRes.status).toBe("healthy");

      // 4. Critical runway (< 3 months)
      const criticalProfile: Profile = {
        id: "p-crit",
        name: "Critical",
        kind: "personal",
        currency: "PLN",
        budgets: {},
        transactions: [
          { id: "t1", name: "Stan", amount: 3000, type: "income", category: "Inne", account: "Konto", isoDate: "2026-07-01", currency: "PLN" },
          { id: "t2", name: "Wydatki", amount: 2000, type: "expense", category: "Dom", account: "Konto", isoDate: "2026-07-15", currency: "PLN" }
        ],
        payments: [],
        goals: [],
        investments: []
      };
      // Liquid assets = 1000, avg expense = 2000 -> 0.5 months -> critical
      const critRes = calculateRunway(criticalProfile, 1);
      expect(critRes.liquidAssets).toBe(1000);
      expect(critRes.runwayMonths).toBe(0.5);
      expect(critRes.status).toBe("critical");
    });

    it("calculateMoMTrends — wylicza porównanie miesiąc do miesiąca", () => {
      const transactions: Transaction[] = [
        // Previous month (June 2026)
        { id: "t1", name: "Pensja Czerwiec", amount: 6000, type: "income", category: "Praca", account: "Konto", isoDate: "2026-06-01", currency: "PLN" },
        { id: "t2", name: "Czynsz Czerwiec", amount: 2000, type: "expense", category: "Dom", account: "Konto", isoDate: "2026-06-05", currency: "PLN" },
        // Current month (July 2026)
        { id: "t3", name: "Pensja Lipiec", amount: 6500, type: "income", category: "Praca", account: "Konto", isoDate: "2026-07-01", currency: "PLN" },
        { id: "t4", name: "Czynsz Lipiec", amount: 2500, type: "expense", category: "Dom", account: "Konto", isoDate: "2026-07-05", currency: "PLN" }
      ];

      const refDate = new Date("2026-07-15T12:00:00");
      const trends = calculateMoMTrends(transactions, refDate);

      expect(trends.currentMonthExpenses).toBe(2500);
      expect(trends.previousMonthExpenses).toBe(2000);
      expect(trends.expensesDiffAmount).toBe(500);
      expect(trends.expensesDiffPercent).toBe(25); // +25% expenses

      expect(trends.currentMonthIncome).toBe(6500);
      expect(trends.previousMonthIncome).toBe(6000);
      expect(trends.incomeDiffAmount).toBe(500);
      expect(trends.incomeDiffPercent).toBe(8.33); // +8.33% income
    });

    it("calculate503020 — dzieli wydatki na Needs (50), Wants (30) i Savings (20)", () => {
      const transactions: Transaction[] = [
        // Needs: 500 zł (Żywność) + 1500 zł (Mieszkanie i Rachunki) = 2000 zł
        { id: "t1", name: "Biedronka", amount: 500, type: "expense", category: "Żywność", account: "Konto", isoDate: "2026-08-05", currency: "PLN" },
        { id: "t2", name: "Czynsz", amount: 1500, type: "expense", category: "Dom i rachunki", account: "Konto", isoDate: "2026-08-01", currency: "PLN" },
        // Wants: 600 zł (Rozrywka) + 600 zł (Restauracje) = 1200 zł
        { id: "t3", name: "Kino", amount: 600, type: "expense", category: "Rozrywka", account: "Konto", isoDate: "2026-08-10", currency: "PLN" },
        { id: "t4", name: "Kolacja", amount: 600, type: "expense", category: "Restauracje", account: "Konto", isoDate: "2026-08-12", currency: "PLN" },
        // Savings/Debt: 800 zł (Rata kredytu)
        { id: "t5", name: "Rata", amount: 800, type: "expense", category: "Kredyt hipoteczny", account: "Konto", isoDate: "2026-08-15", currency: "PLN" }
      ];

      // Total = 2000 + 1200 + 800 = 4000 zł
      // Needs % = 2000 / 4000 = 50%
      // Wants % = 1200 / 4000 = 30%
      // Savings % = 800 / 4000 = 20%
      const res = calculate503020(transactions, new Date("2026-08-20T12:00:00"));

      expect(res.totalExpense).toBe(4000);
      expect(res.needs.amount).toBe(2000);
      expect(res.needs.percentage).toBe(50);
      expect(res.wants.amount).toBe(1200);
      expect(res.wants.percentage).toBe(30);
      expect(res.savings.amount).toBe(800);
      expect(res.savings.percentage).toBe(20);
    });
  });
});
