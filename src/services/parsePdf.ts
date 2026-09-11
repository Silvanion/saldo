import { SupportedCurrency, Transaction, TransactionRule } from "../types";
import { autoCategorizeTransaction, iconByCategory } from "../utils";
import { checkDuplicate } from "./duplicateDetector";
import { parseCsvAmount, parseCsvDate } from "./parseCsv";

export interface PdfImportResult {
  transactions: Transaction[];
  rejectedRows: Array<{ row: number; reason: string; raw: string }>;
  extractedText: string;
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await file.arrayBuffer());
  const pdfDocument = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false
  }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items
      .map((item) => "str" in item ? item.str : "")
      .filter(Boolean)
      .join(" "));
  }

  return pages.join("\n").trim();
}

export async function renderPdfPages(file: File, maxPages = 10): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfDocument = await pdfjsLib.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useWorkerFetch: false
  }).promise;
  const images: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(pdfDocument.numPages, maxPages); pageNumber++) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
    images.push(canvas.toDataURL("image/png").split(",", 2)[1]);
  }
  return images;
}

function buildTransaction(
  name: string,
  amount: number,
  isNegative: boolean,
  date: string,
  currency: SupportedCurrency,
  account: string,
  rules: TransactionRule[]
): Transaction {
  const categorized = autoCategorizeTransaction(name, rules, "Inne");
  return {
    id: `tx-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    amount,
    type: isNegative ? "expense" : "income",
    isoDate: date,
    category: categorized.category,
    categoryIcon: categorized.categoryIcon || iconByCategory[categorized.category] || "✨",
    account,
    currency
  };
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
  const lines = text.split(/\r?\n/).flatMap((line) => line.split(/(?=\d{1,2}[./-]\d{1,2}[./-]\d{4})/));

  lines.forEach((raw, index) => {
    const row = raw.replace(/\s+/g, " ").trim();
    if (!row) return;
    const dateMatch = row.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b|\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b/);
    if (!dateMatch) return;

    const date = parseCsvDate(dateMatch[0]);
    const rowWithoutDate = row.replace(dateMatch[0], " ");
    const amountMatches = [...rowWithoutDate.matchAll(/(?:-?\(?\d[\d\s]*(?:[.,]\d{2})\)?)(?:\s?(?:PLN|EUR|USD|GBP|zł))?/gi)];
    const amountMatch = amountMatches.at(-1)?.[0];
    const parsedAmount = amountMatch ? parseCsvAmount(amountMatch) : null;
    const name = row
      .replace(dateMatch[0], "")
      .replace(amountMatch || "", "")
      .replace(/\s+/g, " ")
      .replace(/^[\s|;:-]+|[\s|;:-]+$/g, "");

    if (!date || !parsedAmount || name.length < 2) {
      rejectedRows.push({ row: index + 1, reason: "Nie udało się jednoznacznie rozpoznać daty, kwoty lub opisu.", raw: row });
      return;
    }
    transactions.push(buildTransaction(
      name,
      parsedAmount.amount,
      parsedAmount.isNegative,
      date,
      options.currency,
      options.account,
      options.rules
    ));
  });

  return { transactions, rejectedRows, extractedText: text };
}

export function findPdfDuplicates(
  transactions: Transaction[],
  existing: Transaction[]
): Set<string> {
  return new Set(transactions
    .filter((transaction) => checkDuplicate(transaction, existing).isLikelyDuplicate)
    .map((transaction) => transaction.id));
}
