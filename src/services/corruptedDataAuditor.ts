import { Profile, Transaction } from "../types";

export interface CorruptedTransactionAudit {
  transaction: Transaction;
  reason: string;
  detectedPattern: "DATE_AS_AMOUNT" | "ADDRESS_AS_AMOUNT" | "NAME_DATE_COLLISION";
  confidence: "CONFIRMED" | "SUSPECTED";
}

export interface DatabaseAuditReport {
  profileId: string;
  profileName: string;
  totalTransactions: number;
  corruptedCount: number;
  validCount: number;
  corruptedTransactions: CorruptedTransactionAudit[];
}

/**
 * Audytuje transakcje pod kątem znanych błędów importu:
 * 1. DATE_AS_AMOUNT: nazwa jest datą (np. "2026-09-19") i kwota odpowiada cyfrom daty (np. 20260919)
 * 2. ADDRESS_AS_AMOUNT: nazwa zawiera numer skrytki/adresu (np. "Skrytka Pocztowa 2108") i kwota wynosi dokładnie ten numer (2108)
 * 3. NAME_DATE_COLLISION: nazwa jest równa dacie ISO i kwota >= 19 000 000
 *
 * WAŻNE: Funkcja jest w 100% BEZPIECZNA i NIEDESTRUKCYJNA — nie modyfikuje bazy ani nie usuwa rekordów.
 */
export function auditProfileTransactions(profile: Profile): DatabaseAuditReport {
  const transactions = profile.transactions || [];
  const corrupted: CorruptedTransactionAudit[] = [];

  for (const tx of transactions) {
    const nameTrimmed = (tx.name || "").trim();
    const isoTrimmed = (tx.isoDate || "").trim();

    // Wzorzec 1: Nazwa to data ISO, a kwota to cyfry daty
    const dateDigits = Number(isoTrimmed.replace(/\D/g, ""));
    const nameDigits = Number(nameTrimmed.replace(/\D/g, ""));
    const isIsoDateName = /^\d{4}-\d{2}-\d{2}$/.test(nameTrimmed);

    if (isIsoDateName && (tx.amount === dateDigits || tx.amount === nameDigits)) {
      corrupted.push({
        transaction: tx,
        reason: `Kwota transakcji (${tx.amount}) powstała z wyciętych myślników z daty "${nameTrimmed}"`,
        detectedPattern: "DATE_AS_AMOUNT",
        confidence: "CONFIRMED"
      });
      continue;
    }

    // Wzorzec 2: Skrytka pocztowa lub adres zamieniony na kwotę
    const skrytkaMatch = nameTrimmed.match(/skrytka\s+pocztowa\s+(\d+)/i);
    if (skrytkaMatch && tx.amount === Number(skrytkaMatch[1])) {
      corrupted.push({
        transaction: tx,
        reason: `Kwota transakcji (${tx.amount}) to numer skrytki pocztowej wycięty z opisu "${nameTrimmed}"`,
        detectedPattern: "ADDRESS_AS_AMOUNT",
        confidence: "CONFIRMED"
      });
      continue;
    }

    // Wzorzec 3: Kolizja kolumny daty z kwotą (wartości rzędu 20 milionów odpowiadające datom YYYYMMDD)
    if (isIsoDateName && tx.amount >= 19000000 && tx.amount <= 20991231) {
      corrupted.push({
        transaction: tx,
        reason: `Podejrzana wartość rzędu roku (${tx.amount}) z nazwą transakcji będącą datą "${nameTrimmed}"`,
        detectedPattern: "NAME_DATE_COLLISION",
        confidence: "CONFIRMED"
      });
      continue;
    }
  }

  return {
    profileId: profile.id,
    profileName: profile.name,
    totalTransactions: transactions.length,
    corruptedCount: corrupted.length,
    validCount: transactions.length - corrupted.length,
    corruptedTransactions: corrupted
  };
}
