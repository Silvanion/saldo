import { describe, it, expect } from "vitest";
import { generateReimportPreview } from "./reimportAuditor";
import type { Profile, Transaction } from "../types";

function createMockProfile(transactions: Transaction[]): Profile {
  return {
    id: "test-profile-1",
    name: "Test Profile",
    currency: "PLN",
    transactions,
    accounts: []
  } as unknown as Profile;
}

describe("Reimport Auditor & Dry-Run Safety Tests", () => {
  describe("NAJWAŻNIEJSZY TEST (Sekcja 6 promptu) — Date-as-amount vs New Source", () => {
    it("nie uznaje automatycznie za MATCH rekordu z inną kwotą i opisem, nawet gdy data się zgadza", () => {
      const oldCorruptedTx: Transaction = {
        id: "tx-old-1",
        isoDate: "2026-09-19",
        name: "2026-09-19",
        amount: 20260919,
        type: "income",
        category: "Różne",
        account: "Konto główne",
        currency: "PLN"
      };

      const newSourceTx: Transaction = {
        id: "tx-new-1",
        isoDate: "2026-09-19",
        name: "Wynagrodzenie",
        amount: 5000,
        type: "income",
        category: "Wynagrodzenie",
        account: "Konto główne",
        currency: "PLN"
      };

      const profile = createMockProfile([oldCorruptedTx]);
      const plan = generateReimportPreview(profile, [newSourceTx]);

      expect(plan.corruptedCount).toBe(1);
      expect(plan.healthyCount).toBe(0);
      expect(plan.items).toHaveLength(1);

      const item = plan.items[0];
      // Bezwzględnie NIE MOŻE być MATCH! Stary rekord ma utracony opis i kwotę.
      expect(item.status).not.toBe("MATCH");
      expect(item.status).toBe("POSSIBLE_MATCH");
      expect(item.oldRecord.amount).toBe(20260919);
      expect(item.matchedSourceRecord?.amount).toBe(5000);
      expect(plan.canAutoExecute).toBe(false);
    });

    it("oznacza jako NEEDS_REVIEW, gdy w tym samym dniu występuje wiele transakcji źródłowych", () => {
      const oldCorruptedTx: Transaction = {
        id: "tx-old-1",
        isoDate: "2026-09-19",
        name: "2026-09-19",
        amount: 20260919,
        type: "income",
        category: "Różne",
        account: "Konto główne",
        currency: "PLN"
      };

      const newSourceTx1: Transaction = {
        id: "tx-new-1",
        isoDate: "2026-09-19",
        name: "Wynagrodzenie",
        amount: 5000,
        type: "income",
        category: "Wynagrodzenie",
        account: "Konto główne",
        currency: "PLN"
      };

      const newSourceTx2: Transaction = {
        id: "tx-new-2",
        isoDate: "2026-09-19",
        name: "Biedronka",
        amount: 150,
        type: "expense",
        category: "Jedzenie",
        account: "Konto główne",
        currency: "PLN"
      };

      const profile = createMockProfile([oldCorruptedTx]);
      const plan = generateReimportPreview(profile, [newSourceTx1, newSourceTx2]);

      expect(plan.items[0].status).toBe("NEEDS_REVIEW");
      expect(plan.items[0].reason).toContain("wykryto 2 transakcji w źródle");
      expect(plan.canAutoExecute).toBe(false);
    });
  });

  describe("DRUGI TEST (Sekcja 7 promptu) — Skrytka Pocztowa vs Rzeczywista Opłata", () => {
    it("nie łączy transakcji na podstawie samej zbieżności tekstu, gdy kwota i kierunek są sprzeczne", () => {
      const oldCorruptedSkrytka: Transaction = {
        id: "tx-old-skrytka",
        isoDate: "2026-09-19",
        name: "Skrytka Pocztowa 2108",
        amount: 2108,
        type: "income",
        category: "Różne",
        account: "Konto główne",
        currency: "PLN"
      };

      const newSourceFee: Transaction = {
        id: "tx-new-fee",
        isoDate: "2026-09-19",
        name: "Skrytka Pocztowa 2108",
        amount: 25.0,
        type: "expense",
        category: "Opłaty",
        account: "Konto główne",
        currency: "PLN"
      };

      const profile = createMockProfile([oldCorruptedSkrytka]);
      const plan = generateReimportPreview(profile, [newSourceFee]);

      expect(plan.items).toHaveLength(1);
      const item = plan.items[0];

      // Kwota 2108 (numer ze skrytki) vs 25.00 (opłata) oraz income vs expense
      expect(item.status).toBe("NEEDS_REVIEW");
      expect(item.reason).toContain("sprzeczność kwoty lub kierunku");
      expect(plan.canAutoExecute).toBe(false);
    });
  });

  describe("Ochrona zdrowych rekordów użytkownika", () => {
    it("nigdy nie oznacza zdrowych rekordów jako uszkodzonych ani do usunięcia", () => {
      const healthyTx: Transaction = {
        id: "tx-healthy-1",
        isoDate: "2026-09-19",
        name: "Restauracja Sphinx",
        amount: 120.5,
        type: "expense",
        category: "Jedzenie",
        account: "Konto główne",
        currency: "PLN"
      };

      const corruptedTx: Transaction = {
        id: "tx-bad-1",
        isoDate: "2026-09-19",
        name: "2026-09-19",
        amount: 20260919,
        type: "income",
        category: "Różne",
        account: "Konto główne",
        currency: "PLN"
      };

      const profile = createMockProfile([healthyTx, corruptedTx]);
      const plan = generateReimportPreview(profile, []);

      expect(plan.healthyCount).toBe(1);
      expect(plan.corruptedCount).toBe(1);
      // Na liście do reimportu/zastąpienia znajduje się WYŁĄCZNIE rekord uszkodzony
      expect(plan.items).toHaveLength(1);
      expect(plan.items[0].oldRecord.id).toBe("tx-bad-1");
    });
  });
});
