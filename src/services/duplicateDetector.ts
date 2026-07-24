import { Transaction } from "../types";

export interface DuplicateCheckResult {
  isLikelyDuplicate: boolean;
  confidence?: "low" | "medium" | "high";
  matchedTransactionId?: string;
  reason?: string;
}

function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

export function checkDuplicate(
  newTx: Omit<Transaction, "id">,
  existingTransactions: Transaction[]
): DuplicateCheckResult {
  const newAmount = Math.abs(Number(newTx.amount) || 0);
  const newDate = new Date(newTx.isoDate).getTime();
  const newNameNorm = normalizeText(newTx.name);

  for (const existingTx of existingTransactions) {
    if (existingTx.type !== newTx.type) continue;
    
    const existingAmount = Math.abs(Number(existingTx.amount) || 0);
    if (Math.abs(existingAmount - newAmount) > 0.01) continue;

    const existingDate = new Date(existingTx.isoDate).getTime();
    const diffDays = Math.abs(existingDate - newDate) / (1000 * 60 * 60 * 24);
    
    if (diffDays > 1.1) continue; // 1 day tolerance, adding 0.1 for daylight savings / timezone jitter if any

    const existingNameNorm = normalizeText(existingTx.name);

    // Exact match
    if (newNameNorm === existingNameNorm) {
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
    
    let matchCount = 0;
    for (const nw of newWords) {
      if (existingWords.includes(nw)) matchCount++;
    }

    const isPartial = 
      (newNameNorm && existingNameNorm.includes(newNameNorm)) || 
      (existingNameNorm && newNameNorm.includes(existingNameNorm)) ||
      (matchCount > 0 && matchCount >= Math.min(newWords.length, existingWords.length) / 2);

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
