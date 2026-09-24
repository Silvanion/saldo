import { Transaction } from "../types";
import { normalizeText } from "../utils/text";

export interface DuplicateCheckResult {
  isLikelyDuplicate: boolean;
  confidence?: "low" | "medium" | "high";
  matchedTransactionId?: string;
  reason?: string;
}

// Pre-filter candidates by currency, type, amount (within 0.01), and date (within 1.1 days)
// This reduces O(n²) to O(n) for the common case where most transactions don't match
function filterCandidates(
  newTx: Omit<Transaction, "id">,
  existingTransactions: Transaction[]
): Transaction[] {
  const newAmount = Math.abs(Number(newTx.amount) || 0);
  const newDate = new Date(newTx.isoDate).getTime();

  return existingTransactions.filter((tx) => {
    if (tx.type !== newTx.type) return false;
    if (tx.currency !== newTx.currency) return false;
    
    const existingAmount = Math.abs(Number(tx.amount) || 0);
    if (Math.abs(existingAmount - newAmount) > 0.01) return false;
    
    const existingDate = new Date(tx.isoDate).getTime();
    const diffDays = Math.abs(existingDate - newDate) / (1000 * 60 * 60 * 24);
    if (diffDays > 1.1) return false;
    
    return true;
  });
}

export function checkDuplicate(
  newTx: Omit<Transaction, "id">,
  existingTransactions: Transaction[]
): DuplicateCheckResult {
  const newNameNorm = normalizeText(newTx.name);

  // Pre-filter to reduce comparisons
  const candidates = filterCandidates(newTx, existingTransactions);

  for (const existingTx of candidates) {
    const existingNameNorm = normalizeText(existingTx.name);

    // Exact match
    if (newNameNorm === existingNameNorm) {
      const existingDate = new Date(existingTx.isoDate).getTime();
      const newDate = new Date(newTx.isoDate).getTime();
      const diffDays = Math.abs(existingDate - newDate) / (1000 * 60 * 60 * 24);
      return {
        isLikelyDuplicate: true,
        confidence: "high",
        matchedTransactionId: existingTx.id,
        reason: diffDays > 0 
          ? "Znaleziono identyczną transakcję z wczoraj lub jutra." 
          : "Znaleziono identyczną transakcję z tego samego dnia."
      };
    }

    // Partial match (one contains another or strong word overlap)
    const newWords = newNameNorm.split(" ").filter(w => w.length > 2);
    const existingWords = existingNameNorm.split(" ").filter(w => w.length > 2);

    const genericWords = new Set([
      "zakupy", "zakup", "platnosc", "platnosci", "przelew", "przelewy",
      "oplata", "oplaty", "transakcja", "operacja", "rachunek", "faktura",
      "towary", "uslugi", "usluga"
    ]);
    const newDistinctive = newWords.filter(w => !genericWords.has(w));
    const existingDistinctive = existingWords.filter(w => !genericWords.has(w));

    let matchCount = 0;
    for (const nw of newDistinctive) {
      if (existingDistinctive.includes(nw)) matchCount++;
    }

    const isPartial =
      (newNameNorm && existingNameNorm.includes(newNameNorm)) ||
      (existingNameNorm && newNameNorm.includes(existingNameNorm)) ||
      (matchCount > 0 && matchCount >= Math.min(newDistinctive.length, existingDistinctive.length) / 2);

    if (isPartial) {
      return {
        isLikelyDuplicate: true,
        confidence: "medium",
        matchedTransactionId: existingTx.id,
        reason: "Znaleziono podobną transakcję o tej samej kwocie w zbliżonym terminie."
      };
    }
  }

  return { isLikelyDuplicate: false };
}

/**
 * Wyznacza deterministyczny fingerprint transakcji do bezpiecznej idempotencji importu.
 * Ten sam wiersz wyciągu zawsze da ten sam fingerprint.
 * WAŻNE: balanceAfter NIE jest częścią fingerprintu, ponieważ ten sam przelew może mieć
 * inne lub brakujące saldo po operacji przy nachodzących na siebie wyciągach lub różnych źródłach.
 */
export function computeTransactionFingerprint(tx: {
  name: string;
  amount: number;
  type: string;
  isoDate: string;
  currency?: string;
  account?: string;
  balanceAfter?: number;
}): string {
  const normName = normalizeText(tx.name || "").trim();
  const amt = Math.abs(Number(tx.amount) || 0).toFixed(2);
  return `${tx.isoDate}|${tx.account || ""}|${tx.currency || "PLN"}|${tx.type}|${amt}|${normName}`;
}

