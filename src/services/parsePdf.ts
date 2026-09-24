import { SupportedCurrency, Transaction, TransactionRule } from "../types";
import { autoCategorizeTransaction, iconByCategory } from "../utils";
import { checkDuplicate } from "./duplicateDetector";
import { parseCsvAmount, parseCsvDate } from "./parseCsv";
import { detectDirection, matchDirectionValue, type ImportDirectionInfo } from "./directionDetector";
import { generateEntityId } from "../utils/id";
import { validateTransactionsBalanceContinuity } from "./balanceValidator";

// A too-large or too-long PDF (an adversarial file, or a merged multi-year
// statement) could otherwise hang the import UI indefinitely with no
// progress indicator or cancel button.
const MAX_PDF_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_TEXT_EXTRACTION_PAGES = 100;

function assertPdfFileSizeOk(file: File): void {
  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    throw new Error(`Plik PDF jest za duży (maks. ${MAX_PDF_FILE_SIZE_BYTES / (1024 * 1024)}MB). Podziel wyciąg na mniejsze części.`);
  }
}

const DATE_IN_ROW = /\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b|\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b/;
const DATE_IN_ROW_GLOBAL = /\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b|\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b/g;

/** Zakresy dat: np. "01.10-04.11.2025", "01.10–04.11", "01.10 - 04.11.2025", "od 01.10 do 04.11" */
const DATE_RANGE_REGEX = /(?:\bod\s+)?\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\s*(?:[-–—]|(?:\bdo\b))\s*\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/gi;

/** Okresy miesięczne: np. "za 08.2025", "10.2025" */
const MONTH_YEAR_REGEX = /(?:\bza\s+)?\b(?:0?[1-9]|1[0-2])[./]\d{4}\b/gi;

/** Pozostałości po zakresach dat ze znakiem myślnika: np. "01.10-", "-04.11" */
const DANGLING_DATE_HYPHEN_REGEX = /\b\d{1,2}[./]\d{1,2}\s*[-–—]|[-–—]\s*\d{1,2}[./]\d{1,2}\b/g;

/**
 * Regex kwoty transakcji w wierszu wyciągu.
 * Wymaga granicy liczbowej/datowej przed i po kwocie:
 * - Nie dopasowuje fragmentu 4-cyfrowego roku (np. 2025 nie staje się 20,25)
 * - Wymaga (?!\d) po groszach, aby nie dopasować daty jako kwoty z uciętą końcówką
 */
const AMOUNT_IN_ROW = /(?<![\d./-])(?:[-−]?\(?\d[\d\s]*(?:[.,]\d{3})*(?:[.,]\d{2})\)?)(?:\s?(?:PLN|EUR|USD|GBP|zł))?(?:\s?[-−](?!\d))?(?![./\d])/gi;


export interface PdfImportResult {
  transactions: Transaction[];
  rejectedRows: Array<{ row: number; reason: string; raw: string }>;
  extractedText: string;
  /** Skąd wzięła się decyzja o kierunku dla każdej zaimportowanej transakcji. */
  directions: ImportDirectionInfo[];
  balanceStats?: {
    validContinuity: number;
    warningContinuity: number;
    errorContinuity: number;
  };
}

export interface AiPdfTransaction {
  name?: unknown;
  amount?: unknown;
  type?: unknown;
  isoDate?: unknown;
  category?: unknown;
  account?: unknown;
}

/**
 * Odtwarza wiersze strony z fragmentów tekstu zwracanych przez pdfjs.
 *
 * Wcześniej wszystkie fragmenty strony były sklejane spacją w jeden ciąg, więc
 * podział na wiersze ginął — z całej strony powstawała JEDNA transakcja o nazwie
 * zawierającej resztę wyciągu. Wiersz wyznaczamy po współrzędnej Y fragmentu,
 * a hasEOL domyka go tam, gdzie PDF wprost kończy linię.
 */
function reconstructPageLines(items: unknown[]): string {
  const chunks: Array<{ str: string; x: number; y: number; hasEOL: boolean }> = [];

  for (const item of items) {
    const candidate = item as { str?: unknown; transform?: unknown; hasEOL?: unknown };
    if (typeof candidate.str !== "string") continue;
    const transform = Array.isArray(candidate.transform) ? candidate.transform : [];
    chunks.push({
      str: candidate.str,
      x: typeof transform[4] === "number" ? transform[4] : 0,
      y: typeof transform[5] === "number" ? transform[5] : 0,
      hasEOL: candidate.hasEOL === true
    });
  }

  // Grupujemy wiersze według współrzędnej pionowej Y (tolerancja ~3px)
  const lineGroups: Array<{ y: number; chunks: typeof chunks }> = [];
  for (const chunk of chunks) {
    let group = lineGroups.find((g) => Math.abs(g.y - chunk.y) <= 3);
    if (!group) {
      group = { y: chunk.y, chunks: [] };
      lineGroups.push(group);
    }
    group.chunks.push(chunk);
  }

  // Sortujemy linie z góry na dół (Y malejąco w układzie współrzędnych PDF)
  lineGroups.sort((a, b) => b.y - a.y);

  const lines: string[] = [];
  for (const group of lineGroups) {
    // W ramach jednego wiersza sortujemy kolumny ściśle od lewej do prawej (X rosnąco),
    // co eliminuje przesunięcia kolumn spowodowane kolejnością renderowania w PDF.
    group.chunks.sort((a, b) => a.x - b.x);
    const lineText = group.chunks
      .map((c) => c.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (lineText) {
      lines.push(lineText);
    }
  }

  return lines.join("\n");
}

export async function extractPdfText(file: File): Promise<string> {
  assertPdfFileSizeOk(file);
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await file.arrayBuffer());
  // Cleanup lives on the loading task (task.destroy()), not on the resolved
  // PDFDocumentProxy — it has no destroy() of its own.
  const loadingTask = pdfjsLib.getDocument({ data, useWorkerFetch: false });
  const pdfDocument = await loadingTask.promise;

  try {
    const pages: string[] = [];
    const pageCount = Math.min(pdfDocument.numPages, MAX_TEXT_EXTRACTION_PAGES);

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        pages.push(reconstructPageLines(content.items));
      } finally {
        page.cleanup();
      }
    }

    return pages.join("\n").trim();
  } finally {
    // pdf.js keeps the document's internal font/image caches and worker-side
    // buffers alive until explicitly destroyed — without this, importing
    // several PDF statements in one session (e.g. splitting a big statement
    // into monthly files) grows memory usage across the session instead of
    // releasing it promptly.
    await loadingTask.destroy();
  }
}

export async function renderPdfPages(file: File, maxPages = 10): Promise<string[]> {
  assertPdfFileSizeOk(file);
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useWorkerFetch: false
  });
  const pdfDocument = await loadingTask.promise;
  try {
    const images: string[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(pdfDocument.numPages, maxPages); pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        images.push(canvas.toDataURL("image/png").split(",", 2)[1]);
      } finally {
        page.cleanup();
      }
    }
    return images;
  } finally {
    await loadingTask.destroy();
  }
}

function buildTransaction(
  name: string,
  amount: number,
  type: Transaction["type"],
  date: string,
  currency: SupportedCurrency,
  account: string,
  rules: TransactionRule[],
  balanceAfter?: number,
  rawSource?: string,
  validationStatus: "VALID" | "NEEDS_REVIEW" | "VALIDATION_ERROR" = "VALID"
): Transaction {
  const categorized = autoCategorizeTransaction(name, rules, "Inne");
  return {
    id: generateEntityId('pdf'),
    name: name.trim(),
    amount,
    type,
    isoDate: date,
    category: categorized.category,
    categoryIcon: categorized.categoryIcon || iconByCategory[categorized.category] || "✨",
    account,
    currency,
    balanceAfter,
    rawSource,
    validationStatus
  };
}

export function normalizeAiPdfTransactions(
  rawTransactions: unknown[],
  options: {
    currency: SupportedCurrency;
    account: string;
    rules: TransactionRule[];
  }
): Pick<PdfImportResult, "transactions" | "rejectedRows" | "directions"> {
  const transactions: Transaction[] = [];
  const rejectedRows: PdfImportResult["rejectedRows"] = [];
  const directions: ImportDirectionInfo[] = [];
  const seen = new Set<string>();

  rawTransactions.forEach((raw, index) => {
    const candidate = raw && typeof raw === "object" ? raw as AiPdfTransaction : {};
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const amount = typeof candidate.amount === "number" ? candidate.amount : Number(candidate.amount);
    const date = typeof candidate.isoDate === "string" ? parseCsvDate(candidate.isoDate) : null;

    if (!name || name.length < 2 || !Number.isFinite(amount) || amount === 0 || !date) {
      rejectedRows.push({
        row: index + 1,
        reason: "AI zwróciło niepełną lub nieprawidłową transakcję. Sprawdź opis, datę i kwotę.",
        raw: JSON.stringify(raw)
      });
      return;
    }

    // Model potrafi pominąć "type" albo nazwać go po polsku ("Wydatek", "Debit").
    // Brak typu nie jest powodem do wyrzucenia całego wiersza — kierunek da się
    // wywnioskować, a gdy się nie da, rekord trafia do potwierdzenia, nie do kosza.
    const explicitDirection = typeof candidate.type === "string" ? candidate.type : "";
    const amountMagnitude = Math.abs(amount);
    const decision = matchDirectionValue(explicitDirection)
      ? { type: matchDirectionValue(explicitDirection)!, source: "direction-column" as const, confident: true }
      : detectDirection(
          { amountNegative: amount < 0, description: name },
          { hasNegativeAmounts: false }
        );
    const type = decision.type;

    const categorized = autoCategorizeTransaction(
      name,
      options.rules,
      typeof candidate.category === "string" ? candidate.category : "Inne"
    );
    const duplicateKey = [
      name.toLocaleLowerCase(),
      amountMagnitude.toFixed(2),
      type,
      date
    ].join("|");
    if (seen.has(duplicateKey)) {
      rejectedRows.push({
        row: index + 1,
        reason: "Powielony rekord OCR — pominięto go przed importem.",
        raw: JSON.stringify(raw)
      });
      return;
    }
    seen.add(duplicateKey);
    const transaction = {
      ...buildTransaction(name, amountMagnitude, type, date, options.currency, options.account, options.rules),
      category: categorized.category,
      categoryIcon: categorized.categoryIcon
    };
    transactions.push(transaction);
    directions.push({ transactionId: transaction.id, source: decision.source, confident: decision.confident });
  });

  return { transactions, rejectedRows, directions };
}

export type PdfTableLayout =
  | "KWOTA_THEN_SALDO"
  | "SALDO_THEN_KWOTA"
  | "DEBIT_CREDIT_SALDO"
  | "CREDIT_DEBIT_SALDO"
  | "KWOTA_ONLY"
  | "UNKNOWN";

/**
 * Rozpoznaje układ kolumn w tabeli wyciągu PDF na podstawie wiersza nagłówka.
 * Eliminuje zgadywanie kolejności kolumn (Kwota vs Saldo).
 */
export function detectPdfTableLayout(text: string): {
  layout: PdfTableLayout;
  headerLine?: string;
} {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const lower = line.toLowerCase();
    const hasDate = /data|date/i.test(lower);
    const hasKwota = /kwota|wartość|amount/i.test(lower);
    const hasSaldo = /saldo|stan konta|balance/i.test(lower);
    const hasDebit = /obciążen|wydatek|wydatki|debit/i.test(lower);
    const hasCredit = /uznan|wpływ|wpływy|credit/i.test(lower);
    const hasDesc = /opis|tytuł|szczegóły|treść|details|description/i.test(lower);

    if ((hasDate || hasDesc) && (hasKwota || hasSaldo || (hasDebit && hasCredit))) {
      // 1. Osobne kolumny obciążeń i uznań
      if (hasDebit && hasCredit) {
        const debitPos = lower.search(/obciążen|wydatek|wydatki|debit/i);
        const creditPos = lower.search(/uznan|wpływ|wpływy|credit/i);
        if (debitPos !== -1 && creditPos !== -1) {
          return {
            layout: debitPos < creditPos ? "DEBIT_CREDIT_SALDO" : "CREDIT_DEBIT_SALDO",
            headerLine: line
          };
        }
      }

      // 2. Kolumny Kwota oraz Saldo
      if (hasKwota && hasSaldo) {
        const kwotaPos = lower.search(/kwota|wartość|amount/i);
        const saldoPos = lower.search(/saldo|stan konta|balance/i);
        if (kwotaPos !== -1 && saldoPos !== -1) {
          return {
            layout: kwotaPos < saldoPos ? "KWOTA_THEN_SALDO" : "SALDO_THEN_KWOTA",
            headerLine: line
          };
        }
      }

      // 3. Tylko kwota
      if (hasKwota && !hasSaldo) {
        return { layout: "KWOTA_ONLY", headerLine: line };
      }
    }
  }

  return { layout: "UNKNOWN" };
}

export function parsePdfTransactions(
  text: string,
  options: {
    currency: SupportedCurrency;
    account: string;
    rules: TransactionRule[];
  }
): PdfImportResult {
  const transactions: Transaction[] = [];
  const rejectedRows: PdfImportResult["rejectedRows"] = [];
  const directions: ImportDirectionInfo[] = [];
  const operationsIndex = text.search(/\bOperacje\b/i);
  const statementText = operationsIndex >= 0 ? text.slice(operationsIndex) : text;
  
  // Rozpoznanie układu tabeli (pozycja kolumn Kwota vs Saldo w nagłówku)
  let detectedLayout = detectPdfTableLayout(statementText);
  if (detectedLayout.layout === "UNKNOWN" && operationsIndex >= 0) {
    detectedLayout = detectPdfTableLayout(text);
  }
  const isLayoutKnown = detectedLayout.layout !== "UNKNOWN";

  const dateAtLineStart = /^\s*(?:\d{1,2}[./-]\d{1,2}[./-]\d{4}\b|\d{4}[./-]\d{1,2}[./-]\d{1,2}\b)/;
  const lines: string[] = [];
  let currentLine = "";
  statementText.split(/\r?\n/).forEach((line) => {
    if (dateAtLineStart.test(line) && currentLine.trim()) {
      lines.push(currentLine);
      currentLine = "";
    }
    currentLine += `${currentLine ? " " : ""}${line.trim()}`;
  });
  if (currentLine.trim()) lines.push(currentLine);

  const candidates = lines
    .map((raw, index) => {
      const row = raw.replace(/\s+/g, " ").trim();
      if (!row) return null;
      const dateMatch = row.match(DATE_IN_ROW);
      if (!dateMatch) return null;

      const date = parseCsvDate(dateMatch[0]);
      const amountSearchRow = row
        .replace(DATE_RANGE_REGEX, " ")
        .replace(MONTH_YEAR_REGEX, " ")
        .replace(DANGLING_DATE_HYPHEN_REGEX, " ")
        .replace(dateMatch[0], " ")
        .replace(DATE_IN_ROW_GLOBAL, " ");
      const amountMatches = [...amountSearchRow.matchAll(AMOUNT_IN_ROW)]
        .map((m) => m[0].trim())
        .filter((m) => parseCsvAmount(m) !== null);

      let amountMatch: string | undefined = undefined;
      let balanceMatch: string | undefined = undefined;
      let rowStatus: "VALID" | "NEEDS_REVIEW" | "VALIDATION_ERROR" = isLayoutKnown ? "VALID" : "NEEDS_REVIEW";

      const currencyMatches = amountMatches.filter((m) => /(?:PLN|EUR|USD|GBP|zł)/i.test(m));

      if (detectedLayout.layout === "KWOTA_ONLY") {
        // Tabela BEZ kolumny saldo: Nigdy nie twórz balanceAfter!
        balanceMatch = undefined;
        if (currencyMatches.length === 1) {
          amountMatch = currencyMatches[0];
          rowStatus = "VALID";
        } else if (amountMatches.length === 1) {
          amountMatch = amountMatches[0];
          rowStatus = "VALID";
        } else if (currencyMatches.length > 1) {
          // Więcej niż jedno dopasowanie z walutą w KWOTA_ONLY: bierzemy pierwsze, ale oznaczamy do weryfikacji
          amountMatch = currencyMatches[0];
          rowStatus = "NEEDS_REVIEW";
        } else if (amountMatches.length > 1) {
          // Brak waluty, wiele liczb: niejednoznaczne
          amountMatch = amountMatches[0];
          rowStatus = "NEEDS_REVIEW";
        }
      } else if (amountMatches.length >= 2) {
        if (detectedLayout.layout === "SALDO_THEN_KWOTA") {
          // Układ: Saldo znajduje się PRZED kwotą transakcji
          balanceMatch = amountMatches[0];
          amountMatch = amountMatches[amountMatches.length - 1];
          rowStatus = "VALID";
        } else if (detectedLayout.layout === "KWOTA_THEN_SALDO") {
          // Układ standardowy: Kwota transakcji znajduje się PRZED saldem
          amountMatch = amountMatches[0];
          balanceMatch = amountMatches[amountMatches.length - 1];
          rowStatus = "VALID";
        } else {
          // Układ nieznany (UNKNOWN):
          // Jeśli dokładnie jedno dopasowanie ma walutę, to jest to kwota
          if (currencyMatches.length === 1) {
            amountMatch = currencyMatches[0];
            const other = amountMatches.find((m) => m !== amountMatch);
            balanceMatch = other;
          } else {
            amountMatch = amountMatches[0];
            balanceMatch = amountMatches[amountMatches.length - 1];
          }
          rowStatus = "NEEDS_REVIEW";
        }
      } else if (amountMatches.length === 1) {
        amountMatch = amountMatches[0];
        rowStatus = isLayoutKnown ? "VALID" : "NEEDS_REVIEW";
      }

      const parsedAmount = amountMatch ? parseCsvAmount(amountMatch) : null;
      const parsedBalance = balanceMatch ? parseCsvAmount(balanceMatch) : null;
      const balanceAfter = parsedBalance ? (parsedBalance.isNegative ? -parsedBalance.amount : parsedBalance.amount) : undefined;

      // Usuwamy datę oraz WSZYSTKIE dopasowane kwoty/salda z nazwy transakcji
      let name = row.replace(dateMatch[0], "");
      for (const m of amountMatches) {
        name = name.replace(m, " ");
      }
      name = name
        .replace(/\s+/g, " ")
        .replace(/^[\s|;:-]+|[\s|;:-]+$/g, "");

      return { index, row, date, parsedAmount, balanceAfter, name, rowStatus };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const hasNegativeAmounts = candidates.some(
    (candidate) => candidate.parsedAmount !== null && candidate.parsedAmount.isNegative
  );

  candidates.forEach(({ index, row, date, parsedAmount, balanceAfter, name, rowStatus }) => {
    if (!date || !parsedAmount || name.length < 2) {
      rejectedRows.push({
        row: index + 1,
        reason: "Nie udało się jednoznacznie rozpoznać daty, kwoty lub opisu.",
        raw: row
      });
      return;
    }

    const decision = detectDirection(
      { amountNegative: parsedAmount.isNegative, description: name },
      { hasNegativeAmounts }
    );
    const transaction = buildTransaction(
      name,
      parsedAmount.amount,
      decision.type,
      date,
      options.currency,
      options.account,
      options.rules,
      balanceAfter,
      row,
      rowStatus
    );
    transactions.push(transaction);
    directions.push({
      transactionId: transaction.id,
      source: decision.source,
      confident: decision.confident && rowStatus === "VALID"
    });
  });

  // Walidacja ciągłości salda (Balance Continuity)
  // WAŻNE: Nie modyfikuje validationStatus (kwota, data i typ pozostają VALID).
  // Status ciągłości salda zapisywany jest w odrębnym polu balanceContinuity.
  const { stats: balanceStats } = validateTransactionsBalanceContinuity(transactions);

  return { transactions, rejectedRows, extractedText: text, directions, balanceStats };
}

export function findPdfDuplicates(
  transactions: Transaction[],
  existing: Transaction[]
): Set<string> {
  return new Set(transactions
    .filter((transaction) => checkDuplicate(transaction, existing).isLikelyDuplicate)
    .map((transaction) => transaction.id));
}