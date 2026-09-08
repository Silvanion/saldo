import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  Check,
  FileText,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import { DebtItem, DebtType, SupportedCurrency } from "../../types";
import { formatMoney, parseAmountInput } from "../../utils/format";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface DebtImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (debts: Omit<DebtItem, "id" | "createdAt">[]) => void;
  currency?: SupportedCurrency;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export interface ParsedDebtRow {
  rawIndex: number;
  status: "valid" | "warning" | "invalid";
  errors: string[];
  warnings: string[];
  data?: Omit<DebtItem, "id" | "createdAt">;
  raw: Record<string, string>;
}

export interface DebtCsvParseResult {
  rows: ParsedDebtRow[];
  totalParsed: number;
  validCount: number;
  warningCount: number;
  invalidCount: number;
  importableCount: number;
}

export function cleanString(val: string | undefined): string {
  if (!val) return "";
  return val.replace(/^["']|["']$/g, "").trim();
}

export function parseDebtNumber(val: string | undefined): number | undefined {
  // Deleguje do parseAmountInput, żeby dane z importu CSV (nieufne, zewnętrzne)
  // przechodziły przez tę samą ochronę przed Infinity/NaN co formularze ręczne —
  // arkusze potrafią eksportować duże liczby w notacji wykładniczej (np. "1E+300").
  return parseAmountInput(val) ?? undefined;
}

export function mapDebtType(rawType: string | undefined): { type: DebtType; isMappedFallback: boolean } {
  if (!rawType) return { type: "other", isMappedFallback: true };
  const clean = rawType.trim().toLowerCase();

  if (clean.includes("hipote") || clean.includes("mortgage")) {
    return { type: "mortgage", isMappedFallback: false };
  }
  if (clean.includes("gotów") || clean.includes("gotow") || clean.includes("cash") || clean === "cash_loan") {
    return { type: "cash_loan", isMappedFallback: false };
  }
  if (clean.includes("kart") || clean.includes("card") || clean === "credit_card") {
    return { type: "credit_card", isMappedFallback: false };
  }
  if (clean.includes("odnawialn") || clean.includes("limit") || clean.includes("revolv") || clean === "revolving") {
    return { type: "revolving", isMappedFallback: false };
  }
  if (
    clean.includes("bnpl") ||
    clean.includes("raty") ||
    clean.includes("0%") ||
    clean.includes("paypo") ||
    clean.includes("allegro pay") ||
    clean.includes("klarna") ||
    clean.includes("twisto")
  ) {
    return { type: "bnpl", isMappedFallback: false };
  }
  if (clean === "other" || clean.includes("inn") || clean.includes("pożycz") || clean.includes("pozycz")) {
    return { type: "other", isMappedFallback: false };
  }

  return { type: "other", isMappedFallback: true };
}

export function detectCsvSeparator(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;

  if (tabs > semicolons && tabs > commas) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

export function parseCsvLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === sep && !inQuotes) {
      result.push(cleanString(current));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(cleanString(current));
  return result;
}

export function normalizeHeaderKey(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function parseDebtCsv(csvText: string, defaultCurrency: SupportedCurrency = "PLN"): DebtCsvParseResult {
  const rawLines = csvText.split(/\r\n|\n/).filter((l) => l.trim().length > 0);

  if (rawLines.length === 0) {
    return {
      rows: [],
      totalParsed: 0,
      validCount: 0,
      warningCount: 0,
      invalidCount: 0,
      importableCount: 0
    };
  }

  const separator = detectCsvSeparator(rawLines[0]);
  const headersRaw = parseCsvLine(rawLines[0], separator);
  const normalizedHeaders = headersRaw.map(normalizeHeaderKey);

  // Column index mapper
  const findIdx = (keywords: string[]): number => {
    return normalizedHeaders.findIndex((h) =>
      keywords.some((k) => h.includes(k) || k.includes(h))
    );
  };

  const nameIdx = findIdx(["nazwa", "name", "tytul", "zobowiazanie", "kredyt", "opis"]);
  const institutionIdx = findIdx(["bank", "instytucja", "institution", "kredytodawca", "firma"]);
  const typeIdx = findIdx(["typ", "type", "kategoria", "rodzaj"]);
  const balanceIdx = findIdx(["saldo", "balance", "pozostalo", "zadluzenie", "kwotadosplaty", "aktualnesaldo"]);
  const originalAmountIdx = findIdx(["kwotapoczatkowa", "originalamount", "kwotakredytu", "kwotapierwotna", "limit", "kwota"]);
  const paymentIdx = findIdx(["rata", "monthlypayment", "ratamiesieczna", "wysokoscrata", "kwotaraty"]);
  const rateIdx = findIdx(["oprocentowanie", "interestrate", "stopa", "apr", "odsetki"]);
  const currencyIdx = findIdx(["waluta", "currency"]);
  const endDateIdx = findIdx(["datakoncowa", "enddate", "terminsplaty", "koniec"]);
  const notesIdx = findIdx(["notatki", "notes", "uwagi"]);

  const rows: ParsedDebtRow[] = [];

  for (let r = 1; r < rawLines.length; r++) {
    const rawCells = parseCsvLine(rawLines[r], separator);
    if (rawCells.every((c) => c.length === 0)) continue;

    const rawMap: Record<string, string> = {};
    headersRaw.forEach((hdr, i) => {
      rawMap[hdr || `Kolumna ${i + 1}`] = rawCells[i] || "";
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Name
    const rawName = nameIdx >= 0 ? rawCells[nameIdx] : rawCells[0];
    const cleanName = cleanString(rawName);
    if (!cleanName) {
      errors.push("Brak nazwy zobowiązania (kolumna Nazwa jest wymagana).");
    }

    // 2. Institution
    const rawInst = institutionIdx >= 0 ? rawCells[institutionIdx] : rawCells[1];
    let cleanInst = cleanString(rawInst);
    if (!cleanInst) {
      cleanInst = "Własna";
      warnings.push("Brak nazwy banku/instytucji (użyto domyślnej: 'Własna').");
    }

    // 3. Balance
    const rawBalance = balanceIdx >= 0 ? rawCells[balanceIdx] : rawCells[2];
    const numBalance = parseDebtNumber(rawBalance);
    if (numBalance === undefined || isNaN(numBalance) || numBalance < 0) {
      errors.push("Nieprawidłowa lub ujemna kwota aktualnego salda.");
    }

    // 4. Type
    const rawType = typeIdx >= 0 ? rawCells[typeIdx] : undefined;
    const { type, isMappedFallback } = mapDebtType(rawType);
    if (isMappedFallback && rawType) {
      warnings.push(`Nierozpoznany typ '${rawType}' (przypisano 'Inne').`);
    }

    // 5. Monthly payment
    const rawPayment = paymentIdx >= 0 ? rawCells[paymentIdx] : undefined;
    const numPayment = parseDebtNumber(rawPayment) ?? 0;
    if (numPayment < 0) {
      errors.push("Wysokość raty miesięcznej nie może być ujemna.");
    }

    // 6. Interest rate
    const rawRate = rateIdx >= 0 ? rawCells[rateIdx] : undefined;
    const numRate = parseDebtNumber(rawRate) ?? 0;
    if (numRate < 0) {
      errors.push("Oprocentowanie nie może być ujemne.");
    }

    // 7. Original amount / credit limit
    const rawOrig = originalAmountIdx >= 0 ? rawCells[originalAmountIdx] : undefined;
    const numOrig = parseDebtNumber(rawOrig);

    // 8. Currency
    const rawCurrency = currencyIdx >= 0 ? rawCells[currencyIdx] : undefined;
    let finalCurrency: SupportedCurrency = defaultCurrency;
    if (rawCurrency) {
      const cUpper = rawCurrency.toUpperCase().trim();
      if (["PLN", "EUR", "USD", "GBP", "CHF"].includes(cUpper)) {
        finalCurrency = cUpper as SupportedCurrency;
      }
    }

    // 9. End Date & Notes
    const cleanEndDate = endDateIdx >= 0 ? cleanString(rawCells[endDateIdx]) : undefined;
    const cleanNotes = notesIdx >= 0 ? cleanString(rawCells[notesIdx]) : undefined;

    const isInvalid = errors.length > 0;
    const isWarning = !isInvalid && warnings.length > 0;
    const status = isInvalid ? "invalid" : isWarning ? "warning" : "valid";

    let data: Omit<DebtItem, "id" | "createdAt"> | undefined = undefined;
    if (!isInvalid) {
      data = {
        name: cleanName,
        institution: cleanInst,
        type,
        currency: finalCurrency,
        balance: numBalance ?? 0,
        originalAmount: numOrig && numOrig > 0 ? numOrig : undefined,
        monthlyPayment: numPayment,
        interestRate: numRate,
        rateType: type === "mortgage" ? "fixed" : undefined,
        endDate: cleanEndDate || undefined,
        status: "active",
        notes: cleanNotes || undefined
      };
    }

    rows.push({
      rawIndex: r,
      status,
      errors,
      warnings,
      data,
      raw: rawMap
    });
  }

  const validCount = rows.filter((r) => r.status === "valid").length;
  const warningCount = rows.filter((r) => r.status === "warning").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;
  const importableCount = validCount + warningCount;

  return {
    rows,
    totalParsed: rows.length,
    validCount,
    warningCount,
    invalidCount,
    importableCount
  };
}

export function DebtImportModal({
  isOpen,
  onClose,
  onImport,
  currency = "PLN",
  showToast
}: DebtImportModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<DebtCsvParseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Clean state reset whenever modal is reopened
  useEffect(() => {
    if (isOpen) {
      setFileName(null);
      setParseResult(null);
      setErrorMessage(null);
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setErrorMessage("Wybierz poprawny plik w formacie CSV (.csv).");
      return;
    }

    setFileName(file.name);
    setErrorMessage(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.trim().length === 0) {
          setErrorMessage("Wybrany plik CSV jest pusty.");
          setParseResult(null);
          setIsProcessing(false);
          return;
        }

        const result = parseDebtCsv(text, currency);
        if (result.totalParsed === 0) {
          setErrorMessage("Nie udało się odczytać żadnych wierszy z pliku CSV. Sprawdź format nagłówków.");
        }
        setParseResult(result);
      } catch {
        setErrorMessage("Wystąpił błąd podczas odczytu pliku CSV.");
        setParseResult(null);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage("Błąd odczytu pliku z dysku.");
      setIsProcessing(false);
    };

    reader.readAsText(file, "UTF-8");
  };

  const handleResetFile = () => {
    setFileName(null);
    setParseResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.importableCount === 0) return;

    const importableDebts = parseResult.rows
      .filter((r) => (r.status === "valid" || r.status === "warning") && r.data)
      .map((r) => r.data!);

    onImport(importableDebts);

    if (showToast) {
      const skipped = parseResult.invalidCount;
      if (skipped > 0) {
        showToast(
          `Zaimportowano ${importableDebts.length} zobowiązań (pominięto ${skipped} niepoprawnych wierszy).`,
          "success"
        );
      } else {
        showToast(
          `Zaimportowano pomyślnie ${importableDebts.length} ${
            importableDebts.length === 1 ? "zobowiązanie" : "zobowiązań"
          }.`,
          "success"
        );
      }
    }

    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-debts-modal-title"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between shrink-0 bg-surface-2/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 id="import-debts-modal-title" className="text-base sm:text-lg font-bold text-text-main">
                  Import zobowiązań z pliku CSV
                </h2>
                <p className="text-xs text-text-muted">
                  Wczytaj plik CSV z listą kredytów, pożyczek lub kart, aby dodać je do portfela
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-full transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
            {/* Step 1: File Selection */}
            {!parseResult ? (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-brand/50 bg-surface-2/30 hover:bg-surface-2/60 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none outline-none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="Wybierz plik CSV z dysku"
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-text-main block">
                      Kliknij, aby wybrać plik CSV
                    </span>
                    <span className="text-xs text-text-muted mt-1 block">
                      Obsługiwane kodowanie UTF-8, separator przecinek (,) lub średnik (;)
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-hidden="true"
                    id="debt-csv-file-input"
                  />
                </div>

                {isProcessing && (
                  <div className="text-center py-2 text-xs font-semibold text-text-muted animate-pulse">
                    Analizowanie pliku CSV...
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-2.5 text-danger text-xs font-bold animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Sample format helper */}
                <div className="bg-surface-2/50 border border-border/80 rounded-2xl p-4 space-y-2 text-xs">
                  <span className="font-bold text-text-main flex items-center gap-1.5 text-xs">
                    <FileText className="w-4 h-4 text-brand" />
                    Przykładowa struktura nagłówków CSV:
                  </span>
                  <div className="bg-surface border border-border rounded-xl p-2.5 font-mono text-xs text-text-muted overflow-x-auto">
                    <code>Nazwa, Bank, Typ, Saldo, Rata, Oprocentowanie</code>
                    <br />
                    <code>Kredyt Hipoteczny, PKO BP, Hipoteka, 350000, 2450, 6.85</code>
                    <br />
                    <code>Karta Kredytowa, mBank, Karta, 4500, 250, 18.5</code>
                  </div>
                  <p className="text-xs text-text-faint">
                    Wymagane kolumny: <strong>Nazwa</strong> oraz <strong>Saldo</strong>. Pozostałe pola są opcjonalne (zostaną uzupełnione wartościami domyślnymi).
                  </p>
                </div>

                {/* Privacy note */}
                <div className="flex items-center gap-2 text-xs text-text-muted bg-surface p-3 rounded-xl border border-border/60">
                  <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                  <span>
                    Pełna prywatność: Plik CSV jest analizowany w 100% lokalnie w Twojej przeglądarce. Żadne dane nie są wysyłane na serwer.
                  </span>
                </div>
              </div>
            ) : (
              /* Step 2: Parse Preview & Row Validation */
              <div className="space-y-4">
                {/* Summary badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-surface-2/50 rounded-2xl border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 text-brand shrink-0" />
                    <span className="text-xs font-bold text-text-main truncate" title={fileName || ""}>
                      {fileName}
                    </span>
                  </div>
                  <button
                    onClick={handleResetFile}
                    className="inline-flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text-main transition cursor-pointer px-2 py-1 rounded-lg focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Zmień plik</span>
                  </button>
                </div>

                {/* Counts bar */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-success block">
                      Gotowe do importu
                    </span>
                    <span className="text-lg font-black text-success tabular-nums">
                      {parseResult.importableCount}
                    </span>
                  </div>

                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-warning block">
                      Z ostrzeżeniem
                    </span>
                    <span className="text-lg font-black text-warning tabular-nums">
                      {parseResult.warningCount}
                    </span>
                  </div>

                  <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-danger block">
                      Błędne (pominięte)
                    </span>
                    <span className="text-lg font-black text-danger tabular-nums">
                      {parseResult.invalidCount}
                    </span>
                  </div>
                </div>

                {/* Rows preview list */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-faint block">
                    Podgląd wierszy ({parseResult.rows.length})
                  </span>

                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {parseResult.rows.map((row) => {
                      const isInvalid = row.status === "invalid";
                      const isWarning = row.status === "warning";

                      return (
                        <div
                          key={row.rawIndex}
                          className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                            isInvalid
                              ? "bg-danger/5 border-danger/30 text-text-muted"
                              : isWarning
                              ? "bg-warning/5 border-warning/30"
                              : "bg-surface border-border"
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-mono text-text-faint">
                                #{row.rawIndex}
                              </span>
                              <strong className="text-text-main font-bold truncate">
                                {row.data?.name || row.raw.Nazwa || row.raw.Name || "Brak nazwy"}
                              </strong>
                              {row.data && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-text-muted border border-border">
                                  {row.data.institution} • {row.data.type}
                                </span>
                              )}
                            </div>

                            {row.errors.length > 0 && (
                              <p className="text-xs text-danger font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                {row.errors.join(", ")}
                              </p>
                            )}

                            {row.warnings.length > 0 && (
                              <p className="text-xs text-warning font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {row.warnings.join(", ")}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-right sm:text-right">
                            {row.data ? (
                              <div>
                                <span className="text-xs font-black text-text-main tabular-nums block">
                                  {formatMoney(row.data.balance, row.data.currency)}
                                </span>
                                <span className="text-xs text-text-muted block">
                                  Rata: {formatMoney(row.data.monthlyPayment, row.data.currency)} • {row.data.interestRate}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-danger uppercase">
                                Niepoprawny
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 sm:p-6 border-t border-border flex items-center justify-between shrink-0 bg-surface-2/30">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
            >
              Anuluj
            </button>

            {parseResult && (
              <button
                onClick={handleConfirmImport}
                disabled={parseResult.importableCount === 0}
                className="px-4 py-2.5 bg-brand text-text-inverse text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
                aria-label={`Zaimportuj ${parseResult.importableCount} zobowiązań`}
              >
                <Check className="w-4 h-4" />
                <span>
                  Zaimportuj {parseResult.importableCount}{" "}
                  {parseResult.importableCount === 1 ? "zobowiązanie" : "zobowiązań"}
                </span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
