import { SupportedCurrency, Transaction, TransactionRule } from "../types";
import { autoCategorizeTransaction, iconByCategory } from "../utils";
import { checkDuplicate } from "./duplicateDetector";
import { parseCsvAmount, parseCsvDate } from "./parseCsv";
import { detectDirection, matchDirectionValue, type ImportDirectionInfo } from "./directionDetector";
import { generateEntityId } from "../utils/id";

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
const AMOUNT_IN_ROW = /(?<![\d-])(?:[-−]?\(?\d[\d\s]*(?:[.,]\d{3})*(?:[.,]\d{2})\)?)(?:\s?(?:PLN|EUR|USD|GBP|zł))?\s?[-−]?/gi;

export interface PdfImportResult {
  transactions: Transaction[];
  rejectedRows: Array<{ row: number; reason: string; raw: string }>;
  extractedText: string;
  /** Skąd wzięła się decyzja o kierunku dla każdej zaimportowanej transakcji. */
  directions: ImportDirectionInfo[];
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
  const chunks: Array<{ str: string; y: number; hasEOL: boolean }> = [];

  for (const item of items) {
    const candidate = item as { str?: unknown; transform?: unknown; hasEOL?: unknown };
    if (typeof candidate.str !== "string") continue;
    const transform = Array.isArray(candidate.transform) ? candidate.transform : [];
    chunks.push({
      str: candidate.str,
      y: typeof transform[5] === "number" ? transform[5] : 0,
      hasEOL: candidate.hasEOL === true
    });
  }

  const lines: string[] = [];
  let currentY: number | null = null;
  let currentLine = "";

  const flush = () => {
    const line = currentLine.replace(/\s+/g, " ").trim();
    if (line) lines.push(line);
    currentLine = "";
  };

  for (const chunk of chunks) {
    if (currentY === null || Math.abs(chunk.y - currentY) > 2) {
      flush();
      currentY = chunk.y;
    }
    currentLine += `${currentLine ? " " : ""}${chunk.str}`;
    if (chunk.hasEOL) {
      flush();
      currentY = null;
    }
  }

  flush();
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
  rules: TransactionRule[]
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
    currency
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

  // Rozpoznanie wiersza rozdzielamy od decyzji o kierunku: najpierw zbieramy
  // wszystkich kandydatów, żeby wiedzieć, czy w dokumencie w ogóle występują
  // kwoty ujemne. Bez tego znak kwoty nie mówi nic o kierunku i nie wolno na
  // jego podstawie po cichu zakładać przychodu.
  const candidates = lines
    .map((raw, index) => {
      const row = raw.replace(/\s+/g, " ").trim();
      if (!row) return null;
      const dateMatch = row.match(DATE_IN_ROW);
      if (!dateMatch) return null;

      const date = parseCsvDate(dateMatch[0]);
      const amountSearchRow = row
        .replace(dateMatch[0], " ")
        .replace(DATE_IN_ROW_GLOBAL, " ");
      const amountMatches = [...amountSearchRow.matchAll(AMOUNT_IN_ROW)];
      const amountMatch = amountMatches[0]?.[0];
      const parsedAmount = amountMatch ? parseCsvAmount(amountMatch) : null;
      const name = row
        .replace(dateMatch[0], "")
        .replace(amountMatch || "", "")
        .replace(/\s+/g, " ")
        .replace(/^[\s|;:-]+|[\s|;:-]+$/g, "");

      return { index, row, date, parsedAmount, name };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const hasNegativeAmounts = candidates.some(
    (candidate) => candidate.parsedAmount !== null && candidate.parsedAmount.isNegative
  );

  candidates.forEach(({ index, row, date, parsedAmount, name }) => {
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
      options.rules
    );
    transactions.push(transaction);
    directions.push({
      transactionId: transaction.id,
      source: decision.source,
      confident: decision.confident
    });
  });

  return { transactions, rejectedRows, extractedText: text, directions };
}

export function findPdfDuplicates(
  transactions: Transaction[],
  existing: Transaction[]
): Set<string> {
  return new Set(transactions
    .filter((transaction) => checkDuplicate(transaction, existing).isLikelyDuplicate)
    .map((transaction) => transaction.id));
}