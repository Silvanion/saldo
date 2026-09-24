import type { Transaction, Profile } from "../types";
import { auditProfileTransactions } from "./corruptedDataAuditor";

export type ReimportMatchStatus =
  | "MATCH"
  | "POSSIBLE_MATCH"
  | "UNMATCHED"
  | "NEEDS_REVIEW";

export interface ReimportItemPreview {
  oldRecord: {
    id: string;
    isoDate: string;
    name: string;
    amount: number;
    type: "income" | "expense";
    pattern: string;
  };
  matchedSourceRecord?: {
    id: string;
    isoDate: string;
    name: string;
    amount: number;
    type: "income" | "expense";
    balanceAfter?: number;
  };
  status: ReimportMatchStatus;
  reason: string;
}

export interface ReimportPlan {
  totalExisting: number;
  corruptedCount: number;
  healthyCount: number;
  newSourceCount: number;
  items: ReimportItemPreview[];
  summary: {
    matchCount: number;
    possibleMatchCount: number;
    unmatchedCount: number;
    needsReviewCount: number;
  };
  canAutoExecute: boolean;
}

/**
 * Generuje bezpieczny podgląd (Dry-Run) reimportu uszkodzonych transakcji.
 *
 * ZASADY BEZPIECZEŃSTWA:
 * 1. Zgodność samej daty NIGDY nie daje statusu MATCH.
 * 2. Zgodność opisu przy sprzecznej kwocie/kierunku daje NEEDS_REVIEW.
 * 3. Zdrowe rekordy w profilu nigdy nie są oznaczane do usunięcia.
 * 4. Niejednoznaczność (kilka transakcji w tym samym dniu) zawsze daje NEEDS_REVIEW.
 */
export function generateReimportPreview(
  profile: Profile,
  newSourceTransactions: Transaction[]
): ReimportPlan {
  const audit = auditProfileTransactions(profile);

  // Grupowanie nowych transakcji źródłowych po dacie ISO
  const newByDate = new Map<string, Transaction[]>();
  for (const tx of newSourceTransactions) {
    const list = newByDate.get(tx.isoDate) || [];
    list.push(tx);
    newByDate.set(tx.isoDate, list);
  }

  const items: ReimportItemPreview[] = [];
  let matchCount = 0;
  let possibleMatchCount = 0;
  let unmatchedCount = 0;
  let needsReviewCount = 0;

  for (const corrupted of audit.corruptedTransactions) {
    const oldTx = corrupted.transaction;
    const candidates = newByDate.get(oldTx.isoDate) || [];

    if (candidates.length === 0) {
      unmatchedCount++;
      items.push({
        oldRecord: {
          id: oldTx.id,
          isoDate: oldTx.isoDate,
          name: oldTx.name,
          amount: oldTx.amount,
          type: oldTx.type,
          pattern: corrupted.detectedPattern
        },
        status: "UNMATCHED",
        reason: `Brak transakcji ze źródła w dniu ${oldTx.isoDate}. Stary rekord jest osierocony.`
      });
      continue;
    }

    // Sprawdzenie przypadku sprzeczności (np. Skrytka Pocztowa 2108 z kwotą 2108 vs opłata 25.00)
    const nameCandidate = candidates.find(
      (c) => c.name.toLowerCase().trim() === oldTx.name.toLowerCase().trim()
    );
    if (nameCandidate) {
      if (
        nameCandidate.type !== oldTx.type ||
        Math.abs(nameCandidate.amount - oldTx.amount) > 0.01
      ) {
        needsReviewCount++;
        items.push({
          oldRecord: {
            id: oldTx.id,
            isoDate: oldTx.isoDate,
            name: oldTx.name,
            amount: oldTx.amount,
            type: oldTx.type,
            pattern: corrupted.detectedPattern
          },
          matchedSourceRecord: {
            id: nameCandidate.id,
            isoDate: nameCandidate.isoDate,
            name: nameCandidate.name,
            amount: nameCandidate.amount,
            type: nameCandidate.type,
            balanceAfter: nameCandidate.balanceAfter
          },
          status: "NEEDS_REVIEW",
          reason: `Zgodność opisu ("${oldTx.name}"), ale sprzeczność kwoty lub kierunku (${oldTx.amount} ${oldTx.type} vs ${nameCandidate.amount} ${nameCandidate.type}). Wymaga decyzji użytkownika.`
        });
        continue;
      }
    }

    // Jeśli w danym dniu jest dokładnie jedna transakcja w nowym źródle,
    // a stary rekord to DATE_AS_AMOUNT (zniekształcona nazwa i kwota)
    if (candidates.length === 1) {
      const single = candidates[0];
      // Zgodność samej daty NIE JEST MATCHEM — stary rekord utracił opis i kwotę!
      // To jest POSSIBLE_MATCH z koniecznością weryfikacji.
      possibleMatchCount++;
      items.push({
        oldRecord: {
          id: oldTx.id,
          isoDate: oldTx.isoDate,
          name: oldTx.name,
          amount: oldTx.amount,
          type: oldTx.type,
          pattern: corrupted.detectedPattern
        },
        matchedSourceRecord: {
          id: single.id,
          isoDate: single.isoDate,
          name: single.name,
          amount: single.amount,
          type: single.type,
          balanceAfter: single.balanceAfter
        },
        status: "POSSIBLE_MATCH",
        reason: `Pojedyncza transakcja źródłowa w dniu ${oldTx.isoDate}. Stary rekord ma zniekształcony opis/kwotę. Sugerowane zastąpienie.`
      });
      continue;
    }

    // W danym dniu jest wiele transakcji w źródle — pełna niejednoznaczność
    needsReviewCount++;
    items.push({
      oldRecord: {
        id: oldTx.id,
        isoDate: oldTx.isoDate,
        name: oldTx.name,
        amount: oldTx.amount,
        type: oldTx.type,
        pattern: corrupted.detectedPattern
      },
      status: "NEEDS_REVIEW",
      reason: `W dniu ${oldTx.isoDate} wykryto ${candidates.length} transakcji w źródle. Brak jednoznacznego powiązania ze starym uszkodzonym rekordem.`
    });
  }

  return {
    totalExisting: profile.transactions?.length || 0,
    corruptedCount: audit.corruptedCount,
    healthyCount: audit.validCount,
    newSourceCount: newSourceTransactions.length,
    items,
    summary: {
      matchCount,
      possibleMatchCount,
      unmatchedCount,
      needsReviewCount
    },
    // Automatyczne wykonanie jest zablokowane, jeśli są jakiekolwiek pozycje NEEDS_REVIEW lub brak MATCH
    canAutoExecute: false
  };
}
