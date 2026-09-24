import { BalanceContinuityStatus, Transaction } from "../types";

export interface BalanceTransitionInput {
  amount: number;
  type: "income" | "expense";
  balanceAfter?: number;
  currency?: string;
}

export interface BalanceTransitionResult {
  status: BalanceContinuityStatus;
  isValid: boolean;
  isError: boolean;
  isWarning: boolean;
  message?: string;
}

/**
 * Sprawdza przejście salda pomiędzy bieżącą a kolejną transakcją.
 *
 * Zasady:
 * 1. Jeśli bieżąca transakcja nie ma salda (balanceAfter === undefined):
 *    status = "UNKNOWN" (transakcja nierozliczona lub brak kolumny salda)
 * 2. Jeśli kolejna transakcja nie ma salda (next.balanceAfter === undefined) lub brak kolejnej transakcji:
 *    status = "CONTINUITY_UNVERIFIABLE"
 * 3. Jeśli oba salda są zdefiniowane i spójne matematycznie:
 *    status = "VALID"
 * 4. Jeśli oba salda są zdefiniowane, ale niespójne matematycznie:
 *    status = "BALANCE_CONTINUITY_ERROR"
 */
export function checkBalanceTransition(
  current: BalanceTransitionInput,
  next?: BalanceTransitionInput
): BalanceTransitionResult {
  if (current.balanceAfter === undefined) {
    return {
      status: "UNKNOWN",
      isValid: false,
      isError: false,
      isWarning: true,
      message: "Brak salda po operacji w dokumencie (np. transakcja nierozliczona)"
    };
  }

  if (!next || next.balanceAfter === undefined) {
    return {
      status: "CONTINUITY_UNVERIFIABLE",
      isValid: false,
      isError: false,
      isWarning: true,
      message: "Ciąg salda nieweryfikowalny (brak salda w sąsiedniej operacji)"
    };
  }

  if (current.currency && next.currency && current.currency !== next.currency) {
    return {
      status: "CONTINUITY_UNVERIFIABLE",
      isValid: false,
      isError: false,
      isWarning: true,
      message: "Różne waluty w kolejnych operacjach"
    };
  }

  const currentDelta = current.type === "income" ? current.amount : -current.amount;
  const nextDelta = next.type === "income" ? next.amount : -next.amount;

  // Kierunek 1: od najnowszego do najstarszego (descending)
  // current.balanceAfter - currentDelta ≈ next.balanceAfter
  const matchDesc = Math.abs((current.balanceAfter - currentDelta) - next.balanceAfter) < 0.05;

  // Kierunek 2: od najstarszego do najnowszego (ascending)
  // current.balanceAfter + nextDelta ≈ next.balanceAfter
  const matchAsc = Math.abs((current.balanceAfter + nextDelta) - next.balanceAfter) < 0.05;

  if (matchDesc || matchAsc) {
    return {
      status: "VALID",
      isValid: true,
      isError: false,
      isWarning: false
    };
  }

  return {
    status: "BALANCE_CONTINUITY_ERROR",
    isValid: false,
    isError: true,
    isWarning: false,
    message: `Niespójność matematyczna salda: ${current.balanceAfter} vs ${next.balanceAfter} (delta ${current.amount})`
  };
}

/**
 * Bezpośrednia ewaluacja ciągłości salda na podstawie zadanych wartości.
 */
export function evaluateBalanceContinuity(params: {
  balanceAfter?: number;
  nextBalanceAfter?: number;
  delta?: number;
  currentType?: "income" | "expense";
  nextType?: "income" | "expense";
}): BalanceContinuityStatus {
  if (params.balanceAfter === undefined) {
    return "UNKNOWN";
  }

  if (params.nextBalanceAfter === undefined) {
    return "CONTINUITY_UNVERIFIABLE";
  }

  const delta = params.delta ?? 0;
  const match1 = Math.abs((params.balanceAfter - delta) - params.nextBalanceAfter) < 0.05;
  const match2 = Math.abs((params.balanceAfter + delta) - params.nextBalanceAfter) < 0.05;

  if (match1 || match2) {
    return "VALID";
  }

  return "BALANCE_CONTINUITY_ERROR";
}

/**
 * Waliduje ciągłość salda dla listy transakcji.
 *
 * KRYTYCZNA ZASADA ARCHITEKTONICZNA:
 * Funkcja ta modyfikuje WYŁĄCZNIE pole `balanceContinuity`.
 * Nigdy nie zmienia `validationStatus` transakcji na VALIDATION_ERROR z powodu salda!
 */
export function validateTransactionsBalanceContinuity<T extends Transaction>(
  transactions: T[]
): {
  transactions: T[];
  stats: {
    validContinuity: number;
    warningContinuity: number;
    errorContinuity: number;
  };
} {
  let validContinuity = 0;
  let warningContinuity = 0;
  let errorContinuity = 0;

  for (let i = 0; i < transactions.length; i++) {
    const current = transactions[i];
    const next = transactions[i + 1];

    const result = checkBalanceTransition(current, next);
    current.balanceContinuity = result.status;

    if (result.status === "VALID") {
      validContinuity++;
    } else if (result.status === "BALANCE_CONTINUITY_ERROR") {
      errorContinuity++;
    } else {
      warningContinuity++;
    }
  }

  return {
    transactions,
    stats: {
      validContinuity,
      warningContinuity,
      errorContinuity
    }
  };
}
