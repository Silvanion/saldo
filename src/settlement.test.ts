import { describe, it, expect } from "vitest";
import { calculatePartnerSettlement } from "./services/settlementEngine";
import { Profile } from "./types";

describe("PROMPT A2 - SETTLEMENT: historyNet vs upcomingNet", () => {
  it("1. Zwraca 0 dla profilu personalnego", () => {
    const p: Profile = {
      id: "p1", name: "User1", kind: "personal",
      transactions: [{ id: "tx1", name: "Test", amount: 100, type: "expense", category: "Test", account: "Cash", isoDate: "2026-07-01", splitMode: "equal", paidBy: "me" }],
      payments: [{ id: "pay1", name: "Rachunek", amount: 100, dueDate: "2026-07-15", status: "Do opłacenia", paidBy: "me", splitMode: "equal" }],
      goals: [], investments: [], currency: "PLN", budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.net).toBe(0);
    expect(res.historyNet).toBe(0);
    expect(res.upcomingNet).toBe(0);
  });

  it("2. Transakcje zrealizowane zasilają historyNet, a nie upcomingNet", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [
        { id: "tx1", name: "Kino", amount: 100, type: "expense", category: "Rozrywka", account: "Card", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }
      ],
      payments: [], goals: [], investments: [], currency: "PLN", budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.historyNet).toBe(50); // Partner owes me 50 from history
    expect(res.upcomingNet).toBe(0);
    expect(res.net).toBe(50);
    expect(res.myPaidHistoryExpenses).toBe(100);
    expect(res.myPaidSharedExpenses).toBe(100);
  });

  it("3. Nieopłacone płatności zasilają upcomingNet, a nie historyNet", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [],
      payments: [
        { id: "pay1", name: "Prąd", amount: 200, dueDate: "2026-07-20", status: "Do opłacenia", paidBy: "partner", splitMode: "equal" }
      ],
      goals: [], investments: [], currency: "PLN", budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.historyNet).toBe(0);
    expect(res.upcomingNet).toBe(-100); // Ja winien partnerowi 100 za nadchodzący rachunek
    expect(res.net).toBe(-100);
    expect(res.partnerPaidUpcomingExpenses).toBe(200);
    expect(res.partnerPaidSharedExpenses).toBe(200);
  });

  it("4. Opłacone płatności (status Opłacono) są całkowicie ignorowane w upcomingNet", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [],
      payments: [
        { id: "pay1", name: "Prąd opłacony", amount: 200, dueDate: "2026-07-20", status: "Opłacono", paidBy: "partner", splitMode: "equal" }
      ],
      goals: [], investments: [], currency: "PLN", budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.historyNet).toBe(0);
    expect(res.upcomingNet).toBe(0);
    expect(res.net).toBe(0);
  });

  it("5. Przychody transakcji wpływają na historyNet", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [
        { id: "tx1", name: "Zwrot ze sklepu", amount: 200, type: "income", category: "Inne", account: "Card", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" },
        { id: "tx2", name: "Zwrot 2", amount: 100, type: "income", category: "Inne", account: "Card", isoDate: "2026-07-01", paidBy: "partner", splitMode: "equal" }
      ],
      payments: [], goals: [], investments: [], currency: "PLN", budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    // tx1: ja dostałem 200 -> jestem winien 100 (historyNet -= 100)
    // tx2: partner dostał 100 -> jest mi winien 50 (historyNet += 50)
    expect(res.historyNet).toBe(-50);
    expect(res.upcomingNet).toBe(0);
    expect(res.net).toBe(-50);
  });

  it("6. Joint i splitMode=none nie zmieniają salda historyNet ani upcomingNet", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [
        { id: "tx1", name: "Kino", amount: 100, type: "expense", category: "Rozrywka", account: "Card", isoDate: "2026-07-01", paidBy: "joint", splitMode: "equal" },
        { id: "tx2", name: "Kino2", amount: 100, type: "expense", category: "Rozrywka", account: "Card", isoDate: "2026-07-01", paidBy: "me", splitMode: "none" }
      ],
      payments: [
        { id: "pay1", name: "Czynsz", amount: 1000, dueDate: "2026-07-25", status: "Do opłacenia", paidBy: "joint", splitMode: "equal" },
        { id: "pay2", name: "Media", amount: 200, dueDate: "2026-07-25", status: "Do opłacenia", paidBy: "me", splitMode: "none" }
      ],
      goals: [], investments: [], currency: "PLN", budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.historyNet).toBe(0);
    expect(res.upcomingNet).toBe(0);
    expect(res.net).toBe(0);
  });

  it("7. Rozdzielenie w złożonym przypadku (mixed transactions + payments)", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
      transactions: [
        { id: "t1", name: "W1", amount: 200, type: "expense", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }, // historyNet +100
        { id: "t2", name: "W2", amount: 100, type: "expense", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "partner", splitMode: "equal" }, // historyNet -50
        { id: "t3", name: "P1", amount: 300, type: "income", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" } // historyNet -150
      ],
      payments: [
        { id: "pay1", name: "Rachunek 1", amount: 100, dueDate: "2026-07-15", status: "Do opłacenia", paidBy: "me", splitMode: "equal" }, // upcomingNet +50
        { id: "pay2", name: "Rachunek 2", amount: 200, dueDate: "2026-07-20", status: "Do opłacenia", paidBy: "partner", splitMode: "equal" }, // upcomingNet -100
        { id: "pay3", name: "Ignorowany", amount: 500, dueDate: "2026-07-01", status: "Opłacono", paidBy: "me", splitMode: "equal" } // upcomingNet 0
      ],
      goals: [], investments: [], currency: "PLN", budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.historyNet).toBe(-100); // 100 - 50 - 150 = -100
    expect(res.upcomingNet).toBe(-50); // 50 - 100 = -50
    expect(res.net).toBe(-150);
    expect(res.myPaidSharedExpenses).toBe(300); // 200 tx + 100 pay
    expect(res.partnerPaidSharedExpenses).toBe(300); // 100 tx + 200 pay
  });

  describe("PROMPT B2 - SETTLEMENTS (SettlementEntry)", () => {
    it("8. Settlement z s.amount > 0 (partner oddał mi) redukuje dodatni dług w historyNet", () => {
      const p: Profile = {
        id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
        transactions: [
          { id: "t1", name: "Zakupy", amount: 200, type: "expense", category: "Zakupy", account: "Karta", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }
        ], // historyNet = +100
        payments: [], goals: [], investments: [], currency: "PLN", budgets: {},
        settlements: [
          { id: "s1", amount: 100, isoDate: "2026-07-02", createdAt: "2026-07-02T10:00:00Z" }
        ]
      };

      const res = calculatePartnerSettlement(p);
      expect(res.historyNet).toBe(0); // 100 - 100 = 0
      expect(res.net).toBe(0);
      expect(res.settlementsTotal).toBe(100);
      // Expenses are NOT double-counted or changed by settlements
      expect(res.myPaidHistoryExpenses).toBe(200);
    });

    it("9. Settlement z s.amount < 0 (ja oddałem partnerowi) redukuje ujemny dług w historyNet", () => {
      const p: Profile = {
        id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
        transactions: [
          { id: "t1", name: "Kolacja", amount: 300, type: "expense", category: "Jedzenie", account: "Karta", isoDate: "2026-07-01", paidBy: "partner", splitMode: "equal" }
        ], // historyNet = -150
        payments: [], goals: [], investments: [], currency: "PLN", budgets: {},
        settlements: [
          { id: "s1", amount: -150, isoDate: "2026-07-02", createdAt: "2026-07-02T10:00:00Z" }
        ]
      };

      const res = calculatePartnerSettlement(p);
      expect(res.historyNet).toBe(0); // -150 - (-150) = 0
      expect(res.net).toBe(0);
      expect(res.settlementsTotal).toBe(-150);
      expect(res.partnerPaidHistoryExpenses).toBe(300);
    });

    it("10. Częściowe rozliczenie oraz wielokrotne settlementy", () => {
      const p: Profile = {
        id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
        transactions: [
          { id: "t1", name: "Zakupy", amount: 200, type: "expense", category: "Zakupy", account: "Karta", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }
        ], // historyNet = +100
        payments: [], goals: [], investments: [], currency: "PLN", budgets: {},
        settlements: [
          { id: "s1", amount: 40, isoDate: "2026-07-02", note: "Rata 1", createdAt: "2026-07-02T10:00:00Z" },
          { id: "s2", amount: 30, isoDate: "2026-07-03", note: "Rata 2", createdAt: "2026-07-03T10:00:00Z" }
        ]
      };

      const res = calculatePartnerSettlement(p);
      expect(res.historyNet).toBe(30); // 100 - 40 - 30 = 30
      expect(res.settlementsTotal).toBe(70);
    });
  });
});

describe("R6b - roundCurrency w settlementEngine (precyzja float)", () => {
  it("11. Dwie transakcje 0.1 i 0.2 (splitMode equal, paidBy me) -> historyNet dokładnie 0.15", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
      transactions: [
        { id: "t1", name: "Drobne A", amount: 0.1, type: "expense", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" },
        { id: "t2", name: "Drobne B", amount: 0.2, type: "expense", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }
      ],
      payments: [], goals: [], investments: [], currency: "PLN", budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    // 0.1/2 + 0.2/2 = 0.05 + 0.1 = 0.15 (bez roundCurrency byłoby 0.15000000000000002)
    expect(res.historyNet).toBe(0.15);
    expect(res.myPaidSharedExpenses).toBe(0.3);
  });

  it("12. Transakcja 99.99 (splitMode equal, paidBy me) -> historyNet dokładnie 50", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
      transactions: [
        { id: "t1", name: "Duży zakup", amount: 99.99, type: "expense", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }
      ],
      payments: [], goals: [], investments: [], currency: "PLN", budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    // 99.99 / 2 = 49.995 -> roundCurrency -> 50
    expect(res.historyNet).toBe(50);
  });
});
