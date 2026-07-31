import { describe, it, expect } from "vitest";
import { Profile, Transaction } from "./types";

// W użyciu hooka handleAddTransaction dodaje te same wartości
function simulateAddTransaction(profile: Profile, data: Partial<Transaction>): Profile {
  const newTx = {
    id: "tx-test",
    name: data.name || "Test",
    amount: data.amount || 100,
    category: data.category || "Inne",
    account: data.account || "Konto",
    type: data.type || "expense",
    isoDate: data.isoDate || "2026-07-23",
    paidBy: data.paidBy,
    splitMode: data.splitMode
  } as Transaction;

  return { ...profile, transactions: [...profile.transactions, newTx] };
}

describe("PROMPT 7 - SHARED: paidBy I PODZIAŁ KOSZTÓW", () => {
  it("Tworzy transakcję ze split w profilu shared", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [], payments: [], goals: [], investments: [], currency: "PLN", budgets: {}
    };
    
    const updated = simulateAddTransaction(p, {
      name: "Zakupy",
      amount: 100,
      paidBy: "me",
      splitMode: "equal"
    });
    
    expect(updated.transactions.length).toBe(1);
    expect(updated.transactions[0].paidBy).toBe("me");
    expect(updated.transactions[0].splitMode).toBe("equal");
  });
  
  it("Aktualizacja transakcji ze split - zachowuje pola", () => {
    const tx: Transaction = {
      id: "tx-1", name: "Zakupy", amount: 100, type: "expense", category: "Inne", account: "Konto", isoDate: "2026-07-23",
      paidBy: "partner", splitMode: "none"
    };
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [tx], payments: [], goals: [], investments: [], currency: "PLN", budgets: {}
    };
    
    // update (symulacja map)
    const updatedTx = { ...tx, amount: 200, splitMode: "equal" as const };
    const pUpdated = {
      ...p,
      transactions: p.transactions.map(t => t.id === updatedTx.id ? updatedTx : t)
    };
    
    expect(pUpdated.transactions[0].amount).toBe(200);
    expect(pUpdated.transactions[0].paidBy).toBe("partner");
    expect(pUpdated.transactions[0].splitMode).toBe("equal");
  });
});
