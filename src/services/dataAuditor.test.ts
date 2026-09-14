import { describe, it, expect } from "vitest";
import { runDataAudit, repairAuditIssue, autoRepairAllIssues } from "./dataAuditor";
import { Profile } from "../types";

describe("dataAuditor service", () => {
  const cleanProfile: Profile = {
    id: "p-clean",
    name: "Czysty Profil",
    currency: "PLN",
    kind: "personal",
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    accounts: [
      {
        id: "acc-1",
        name: "Konto Główne",
        bankName: "mBank",
        hasCreditLimit: false,
        creditLimit: 0
      }
    ],
    transactions: [
      {
        id: "tx-1",
        name: "Wynagrodzenie",
        amount: 5000,
        type: "income",
        category: "Wynagrodzenie",
        isoDate: "2026-09-01",
        account: "Konto Główne",
        currency: "PLN"
      },
      {
        id: "tx-2",
        name: "Biedronka",
        amount: 250,
        type: "expense",
        category: "Spożywcze",
        isoDate: "2026-09-02",
        account: "Konto Główne",
        currency: "PLN"
      }
    ]
  };

  it("returns 100% healthScore and perfect status for a clean profile", () => {
    const report = runDataAudit(cleanProfile);
    expect(report.healthScore).toBe(100);
    expect(report.status).toBe("perfect");
    expect(report.issuesCount).toBe(0);
    expect(report.issues).toHaveLength(0);
    expect(report.scannedCounts.transactions).toBe(2);
  });

  it("detects and repairs duplicate transactions", () => {
    const profileWithDup: Profile = {
      ...cleanProfile,
      transactions: [
        ...cleanProfile.transactions,
        {
          id: "tx-dup-1",
          name: "Biedronka",
          amount: 250,
          type: "expense",
          category: "Spożywcze",
          isoDate: "2026-09-02",
          account: "Konto Główne",
          currency: "PLN"
        }
      ]
    };

    const audit1 = runDataAudit(profileWithDup);
    expect(audit1.issuesCount).toBeGreaterThan(0);
    const dupIssue = audit1.issues.find((i) => i.type === "duplicate");
    expect(dupIssue).toBeDefined();

    // Repair duplicate
    const repaired = repairAuditIssue(profileWithDup, dupIssue!.id);
    const audit2 = runDataAudit(repaired);
    expect(audit2.issues.filter((i) => i.type === "duplicate")).toHaveLength(0);
    expect(repaired.transactions).toHaveLength(2);
  });

  it("detects and repairs orphaned accounts", () => {
    const profileWithOrphan: Profile = {
      ...cleanProfile,
      transactions: [
        {
          id: "tx-orphan",
          name: "Zakupy",
          amount: 100,
          type: "expense",
          category: "Spożywcze",
          isoDate: "2026-09-05",
          account: "Nieistniejący Bank",
          currency: "PLN"
        }
      ]
    };

    const audit1 = runDataAudit(profileWithOrphan);
    const orphanIssue = audit1.issues.find((i) => i.type === "orphaned_account");
    expect(orphanIssue).toBeDefined();

    const repaired = repairAuditIssue(profileWithOrphan, orphanIssue!.id);
    expect(repaired.transactions[0].account).toBe("Konto Główne");
  });

  it("detects and repairs uncategorized transactions with smart heuristics", () => {
    const profileWithNoCat: Profile = {
      ...cleanProfile,
      transactions: [
        {
          id: "tx-nocat",
          name: "Uber trip",
          amount: 45,
          type: "expense",
          category: "",
          isoDate: "2026-09-06",
          account: "Konto Główne",
          currency: "PLN"
        }
      ]
    };

    const audit1 = runDataAudit(profileWithNoCat);
    const catIssue = audit1.issues.find((i) => i.type === "missing_category");
    expect(catIssue).toBeDefined();

    const repaired = repairAuditIssue(profileWithNoCat, catIssue!.id);
    expect(repaired.transactions[0].category).toBe("Transport");
  });

  it("detects and repairs date anomalies", () => {
    const profileWithBadDate: Profile = {
      ...cleanProfile,
      transactions: [
        {
          id: "tx-baddate",
          name: "Stary wpis",
          amount: 120,
          type: "expense",
          category: "Inne",
          isoDate: "1995-04-12",
          account: "Konto Główne",
          currency: "PLN"
        }
      ]
    };

    const audit1 = runDataAudit(profileWithBadDate);
    const dateIssue = audit1.issues.find((i) => i.type === "date_anomaly");
    expect(dateIssue).toBeDefined();

    const repaired = repairAuditIssue(profileWithBadDate, dateIssue!.id);
    const curYear = new Date().getFullYear();
    expect(repaired.transactions[0].isoDate).toBe(`${curYear}-04-12`);
  });

  it("detects unlinked paid payments and creates matching expense transaction", () => {
    const profileWithPaidBill: Profile = {
      ...cleanProfile,
      payments: [
        {
          id: "p-1",
          name: "Internet Światłowód",
          amount: 80,
          dueDate: "2026-09-10",
          status: "Opłacono",
          category: "Dom i rachunki",
          currency: "PLN"
        }
      ]
    };

    const audit1 = runDataAudit(profileWithPaidBill);
    const unlinkedIssue = audit1.issues.find((i) => i.type === "unlinked_payment");
    expect(unlinkedIssue).toBeDefined();

    const repaired = repairAuditIssue(profileWithPaidBill, unlinkedIssue!.id);
    expect(repaired.transactions).toHaveLength(3); // 2 original + 1 generated
    const generatedTx = repaired.transactions.find((t) => t.sourcePaymentId === "p-1");
    expect(generatedTx).toBeDefined();
    expect(generatedTx?.amount).toBe(80);
  });

  it("detects and repairs goal desynchronization", () => {
    const profileWithDesyncGoal: Profile = {
      ...cleanProfile,
      goals: [
        {
          id: "g-1",
          name: "Wakacje",
          target: 5000,
          saved: 1000,
          transfers: [
            { id: "tr-1", amount: 600, isoDate: "2026-08-01" },
            { id: "tr-2", amount: 900, isoDate: "2026-09-01" }
          ]
        }
      ]
    };

    const audit1 = runDataAudit(profileWithDesyncGoal);
    const goalIssue = audit1.issues.find((i) => i.type === "goal_desync");
    expect(goalIssue).toBeDefined();

    const repaired = repairAuditIssue(profileWithDesyncGoal, goalIssue!.id);
    expect(repaired.goals[0].saved).toBe(1500); // 600 + 900
  });

  it("autoRepairAllIssues repairs all anomalies in one click", () => {
    const messyProfile: Profile = {
      ...cleanProfile,
      transactions: [
        ...cleanProfile.transactions,
        // Dup
        {
          id: "tx-dup-2",
          name: "Biedronka",
          amount: 250,
          type: "expense",
          category: "Spożywcze",
          isoDate: "2026-09-02",
          account: "Konto Główne",
          currency: "PLN"
        },
        // Missing cat
        {
          id: "tx-nocat-2",
          name: "Lidl zakupy",
          amount: 90,
          type: "expense",
          category: "",
          isoDate: "2026-09-04",
          account: "Konto Główne",
          currency: "PLN"
        }
      ]
    };

    const result = autoRepairAllIssues(messyProfile);
    expect(result.repairedCount).toBeGreaterThanOrEqual(2);
    expect(result.messages.length).toBeGreaterThanOrEqual(2);

    const postAudit = runDataAudit(result.updatedProfile);
    expect(postAudit.issues.filter((i) => i.type === "duplicate")).toHaveLength(0);
    expect(postAudit.issues.filter((i) => i.type === "missing_category")).toHaveLength(0);
  });
});
