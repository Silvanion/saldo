import { Profile } from "../types";

export interface SettlementResult {
  net: number; // total net = historyNet + upcomingNet (retained for backward compatibility)
  historyNet: number; // strictly from realized transactions (transactions) adjusted by settlements
  upcomingNet: number; // strictly from unpaid payments (payments with status !== "Opłacono")
  myPaidSharedExpenses: number; // total paid by me (transactions + unpaid payments)
  partnerPaidSharedExpenses: number; // total paid by partner (transactions + unpaid payments)
  myPaidHistoryExpenses: number;
  partnerPaidHistoryExpenses: number;
  myPaidUpcomingExpenses: number;
  partnerPaidUpcomingExpenses: number;
  settlementsTotal: number;
}

/**
 * Oblicza saldo rozliczeń partnerów dla profilu wspólnego (shared).
 * 
 * Zasady rozliczenia (dla pozycji z splitMode === "equal"):
 * 1. Transakcje (zrealizowane wydatek/przychód) -> historyNet:
 *    - Expense paidBy="me": Partner winien połowę (historyNet += amount / 2)
 *    - Expense paidBy="partner": Ja winien połowę (historyNet -= amount / 2)
 *    - Expense paidBy="joint": Saldo netto bez zmian (0)
 *    - Income paidBy="me": Zgarnąłem całość, oddaję 50% partnerowi (historyNet -= amount / 2)
 *    - Income paidBy="partner": Partner zgarnął całość, jest mi winien 50% (historyNet += amount / 2)
 * 
 * 2. Płatności (nadchodzące nieopłacone rachunki) -> upcomingNet:
 *    - Liczone TYLKO wtedy, gdy status !== "Opłacono" ("Do opłacenia").
 *    - PaidBy="me": Partner winien połowę nadchodzącego rachunku (upcomingNet += amount / 2)
 *    - PaidBy="partner": Ja winien połowę nadchodzącego rachunku (upcomingNet -= amount / 2)
 * 
 * 3. Rozliczenia ręczne (SettlementEntry):
 *    - s.amount > 0 ("Partner oddał mi"): redukuje dodatni dług partnera (historyNet -= amount)
 *    - s.amount < 0 ("Ja oddałem partnerowi"): redukuje mój ujemny dług (historyNet -= amount, np. -(-50) = +50)
 */
export function calculatePartnerSettlement(profile: Profile): SettlementResult {
  if (profile.kind !== "shared") {
    return {
      net: 0,
      historyNet: 0,
      upcomingNet: 0,
      myPaidSharedExpenses: 0,
      partnerPaidSharedExpenses: 0,
      myPaidHistoryExpenses: 0,
      partnerPaidHistoryExpenses: 0,
      myPaidUpcomingExpenses: 0,
      partnerPaidUpcomingExpenses: 0,
      settlementsTotal: 0
    };
  }

  let historyNet = 0;
  let upcomingNet = 0;

  let myPaidHistoryExpenses = 0;
  let partnerPaidHistoryExpenses = 0;

  let myPaidUpcomingExpenses = 0;
  let partnerPaidUpcomingExpenses = 0;

  // 1. Transakcje (wydatek i przychód) -> historyNet
  for (const tx of profile.transactions || []) {
    if (tx.splitMode === "equal") {
      const half = tx.amount / 2;

      if (tx.type === "expense") {
        if (tx.paidBy === "me") {
          myPaidHistoryExpenses += tx.amount;
          historyNet += half; // Partner jest mi winien połowę
        } else if (tx.paidBy === "partner") {
          partnerPaidHistoryExpenses += tx.amount;
          historyNet -= half; // Ja jestem winien partnerowi połowę
        }
      } else if (tx.type === "income") {
        if (tx.paidBy === "me") {
          historyNet -= half; // Przychód podział: ja oddaję 50% partnerowi
        } else if (tx.paidBy === "partner") {
          historyNet += half; // Partner oddaje 50% mi
        }
      }
    }
  }

  // 2. Płatności (nadchodzące nieopłacone rachunki) -> upcomingNet
  for (const p of profile.payments || []) {
    if (p.splitMode === "equal" && p.status !== "Opłacono") {
      const half = p.amount / 2;

      if (p.paidBy === "me") {
        myPaidUpcomingExpenses += p.amount;
        upcomingNet += half; // Partner winien połowę nadchodzącego rachunku
      } else if (p.paidBy === "partner") {
        partnerPaidUpcomingExpenses += p.amount;
        upcomingNet -= half; // Ja winien połowę nadchodzącego rachunku
      }
    }
  }

  // 3. Rozliczenia ręczne (SettlementEntry) -> modyfikują historyNet
  let settlementsTotal = 0;
  for (const s of profile.settlements || []) {
    settlementsTotal += s.amount;
  }
  historyNet -= settlementsTotal;

  const net = historyNet + upcomingNet;
  const myPaidSharedExpenses = myPaidHistoryExpenses + myPaidUpcomingExpenses;
  const partnerPaidSharedExpenses = partnerPaidHistoryExpenses + partnerPaidUpcomingExpenses;

  return {
    net,
    historyNet,
    upcomingNet,
    myPaidSharedExpenses,
    partnerPaidSharedExpenses,
    myPaidHistoryExpenses,
    partnerPaidHistoryExpenses,
    myPaidUpcomingExpenses,
    partnerPaidUpcomingExpenses,
    settlementsTotal
  };
}
