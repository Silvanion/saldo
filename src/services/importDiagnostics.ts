import { Transaction } from "../types";
import { parseCsvAmount } from "./parseCsv";
import { detectDirection, DirectionSignals } from "./directionDetector";

export interface TransactionDiagnosticTrace {
  rawSource: string;
  extractedRow: string[];
  detectedColumns: {
    nameColumn?: string;
    amountColumn?: string;
    dateColumn?: string;
    directionColumn?: string;
    balanceColumn?: string;
  };
  rawAmount: string;
  parsedAmount: number | null;
  rawBalance?: string;
  parsedBalance?: number | null;
  detectedDirection: "income" | "expense";
  directionSource: string;
  normalizedTransaction: Partial<Transaction>;
  validationIssues: string[];
}

/**
 * Śledzi pełny cykl życia pojedynczego rekordu importu:
 * RAW SOURCE -> EXTRACTED ROW -> DETECTED COLUMNS -> RAW AMOUNT -> PARSED AMOUNT -> DETECTED DIRECTION -> BALANCE AFTER -> NORMALIZED TRANSACTION -> DB RECORD
 */
export function traceRowImport(
  rawLine: string,
  rowParts: string[],
  columnMap: {
    nameIdx: number;
    amountIdx: number;
    dateIdx: number;
    dirIdx?: number;
    balanceIdx?: number;
    debitIdx?: number;
    creditIdx?: number;
  },
  headers: string[],
  hasNegativeAmounts = false
): TransactionDiagnosticTrace {
  const issues: string[] = [];

  const rawName = columnMap.nameIdx >= 0 && columnMap.nameIdx < rowParts.length ? rowParts[columnMap.nameIdx] : "";
  const rawAmount = columnMap.amountIdx >= 0 && columnMap.amountIdx < rowParts.length ? rowParts[columnMap.amountIdx] : "";
  const rawDate = columnMap.dateIdx >= 0 && columnMap.dateIdx < rowParts.length ? rowParts[columnMap.dateIdx] : "";
  const rawDir = columnMap.dirIdx !== undefined && columnMap.dirIdx >= 0 ? rowParts[columnMap.dirIdx] : "";
  const rawBal = columnMap.balanceIdx !== undefined && columnMap.balanceIdx >= 0 ? rowParts[columnMap.balanceIdx] : "";

  const parsedAmtObj = parseCsvAmount(rawAmount);
  if (!parsedAmtObj) {
    issues.push(`Niepoprawny format kwoty transakcji: "${rawAmount}"`);
  }

  let parsedBalObj: { amount: number; isNegative: boolean } | null = null;
  if (rawBal) {
    parsedBalObj = parseCsvAmount(rawBal);
    if (!parsedBalObj) {
      issues.push(`Niepoprawny format salda: "${rawBal}"`);
    }
  }

  const dirSignals: DirectionSignals = {
    explicitDirection: rawDir,
    amountNegative: parsedAmtObj?.isNegative,
    fromDebitColumn: columnMap.debitIdx !== undefined && columnMap.debitIdx >= 0 && !!rowParts[columnMap.debitIdx],
    fromCreditColumn: columnMap.creditIdx !== undefined && columnMap.creditIdx >= 0 && !!rowParts[columnMap.creditIdx],
    description: rawName
  };

  const dirDecision = detectDirection(dirSignals, { hasNegativeAmounts });

  const normalizedTx: Partial<Transaction> = {
    name: rawName || "Transakcja",
    amount: parsedAmtObj ? parsedAmtObj.amount : 0,
    type: dirDecision.type,
    isoDate: rawDate,
    balanceAfter: parsedBalObj ? (parsedBalObj.isNegative ? -parsedBalObj.amount : parsedBalObj.amount) : undefined,
    rawSource: rawLine,
    validationStatus: issues.length > 0 ? "VALIDATION_ERROR" : "VALID"
  };

  return {
    rawSource: rawLine,
    extractedRow: rowParts,
    detectedColumns: {
      nameColumn: columnMap.nameIdx >= 0 ? headers[columnMap.nameIdx] : undefined,
      amountColumn: columnMap.amountIdx >= 0 ? headers[columnMap.amountIdx] : undefined,
      dateColumn: columnMap.dateIdx >= 0 ? headers[columnMap.dateIdx] : undefined,
      directionColumn: columnMap.dirIdx !== undefined && columnMap.dirIdx >= 0 ? headers[columnMap.dirIdx] : undefined,
      balanceColumn: columnMap.balanceIdx !== undefined && columnMap.balanceIdx >= 0 ? headers[columnMap.balanceIdx] : undefined
    },
    rawAmount,
    parsedAmount: parsedAmtObj ? parsedAmtObj.amount : null,
    rawBalance: rawBal || undefined,
    parsedBalance: parsedBalObj ? (parsedBalObj.isNegative ? -parsedBalObj.amount : parsedBalObj.amount) : undefined,
    detectedDirection: dirDecision.type,
    directionSource: dirDecision.source,
    normalizedTransaction: normalizedTx,
    validationIssues: issues
  };
}
