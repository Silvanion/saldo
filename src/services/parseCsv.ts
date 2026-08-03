import Papa from "papaparse";
import { Transaction, TransactionRule } from "../types";
import { autoCategorizeTransaction, iconByCategory } from "../utils";

export interface BankPreset {
  id: "generic" | "mbank" | "pko" | "ing";
  name: string;
  description: string;
  defaultSeparator?: string;
}

export const BANK_PRESETS: BankPreset[] = [
  {
    id: "generic",
    name: "Generyczny CSV (Auto-detekcja)",
    description: "Automatyczne rozpoznawanie separatora (;, ,) oraz nagłówków"
  },
  {
    id: "mbank",
    name: "mBank",
    description: "Format wyciągu mBank (separator ;)",
    defaultSeparator: ";"
  },
  {
    id: "pko",
    name: "PKO BP (iPKO)",
    description: "Format wyciągu PKO Bank Polski (.csv)",
    defaultSeparator: ","
  },
  {
    id: "ing",
    name: "ING Bank Śląski",
    description: "Format wyciągu Moje ING (separator ;)",
    defaultSeparator: ";"
  }
];

export function cleanCsvBomAndEncoding(text: string): string {
  if (!text) return "";
  // Strip UTF-8 BOM if present
  let cleaned = text.startsWith("\uFEFF") ? text.slice(1) : text;
  return cleaned;
}

export function detectCsvSeparator(text: string): string {
  const sampleLines = text.split(/\r?\n/).slice(0, 15).filter((l) => l.trim().length > 0);
  let semicolonCount = 0;
  let commaCount = 0;

  for (const line of sampleLines) {
    semicolonCount += (line.match(/;/g) || []).length;
    commaCount += (line.match(/,/g) || []).length;
  }

  return semicolonCount >= commaCount ? ";" : ",";
}

export function parseCsvDate(rawDate: string): string | null {
  if (!rawDate) return null;
  const trimmed = rawDate.trim().replace(/^['"]|['"]$/g, "");

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY.MM.DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // JS Date parse fallback
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

export function parseCsvAmount(rawAmount: string): { amount: number; isNegative: boolean } | null {
  if (!rawAmount) return null;
  let cleaned = rawAmount
    .replace(/\s+/g, "")
    .replace(/PLN|EUR|USD|zł|PLZ/gi, "")
    .replace(/^["']|["']$/g, "");

  if (!cleaned) return null;

  let isNegative = false;
  if (cleaned.startsWith("-") || cleaned.includes("-")) {
    isNegative = true;
  }

  // Replace comma with dot
  cleaned = cleaned.replace(/,/g, ".").replace(/[^\d.-]/g, "");

  const val = parseFloat(cleaned);
  if (isNaN(val) || val === 0) {
    return null;
  }

  return {
    amount: Math.abs(val),
    isNegative: val < 0 || isNegative
  };
}

export function autoDetectBankColumns(
  headers: string[],
  presetId: "generic" | "mbank" | "pko" | "ing" = "generic"
) {
  let mapName = "";
  let mapAmount = "";
  let mapDate = "";
  let mapCategory = "";

  if (presetId === "mbank") {
    const foundTytul = headers.find((h) => /#?tytuł/i.test(h.trim()));
    const foundNadawca = headers.find((h) => /#?nadawca|#?odbiorca/i.test(h.trim()));
    const foundOpis = headers.find((h) => /#?opis/i.test(h.trim()));
    mapName = foundTytul || foundNadawca || foundOpis || "";

    const foundKwota = headers.find((h) => /#?kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundDataOper = headers.find((h) => /#?data operacji/i.test(h.trim()));
    const foundDataKsieg = headers.find((h) => /#?data księgowania/i.test(h.trim()));
    const foundDataAny = headers.find((h) => /#?data/i.test(h.trim()));
    mapDate = foundDataOper || foundDataKsieg || foundDataAny || "";
  } else if (presetId === "pko") {
    const foundTytul = headers.find((h) => /nazwa|odbiorca|nadawca|tytuł/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data operacji|data waluty|data/i.test(h.trim()));
    mapDate = foundData || "";
  } else if (presetId === "ing") {
    const foundTytul = headers.find((h) => /tytuł|dane kontrahenta/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data transakcji|data rozliczenia|data/i.test(h.trim()));
    mapDate = foundData || "";
  }

  for (const h of headers) {
    const lower = h.toLowerCase().trim();

    if (!mapName && /#?tytuł|opis|nazwa|odbiorca|nadawca|treść|details|title|description|name/.test(lower)) {
      mapName = h;
    }

    if (!mapAmount && /#?kwota|wartość|sum|amount/.test(lower)) {
      mapAmount = h;
    }

    if (!mapDate && /#?data|date/.test(lower)) {
      mapDate = h;
    }

    if (!mapCategory && /kategoria|category/.test(lower)) {
      mapCategory = h;
    }
  }

  return { mapName, mapAmount, mapDate, mapCategory };
}

export interface ProcessCsvParams {
  rawCsvText: string;
  presetId?: "generic" | "mbank" | "pko" | "ing";
  mapName?: string;
  mapAmount?: string;
  mapDate?: string;
  mapCategory?: string;
  defaultCategory?: string;
  defaultAccount?: string;
  typeStrategy?: "auto" | "expense" | "income";
  rules?: TransactionRule[];
  currency?: import("../types").SupportedCurrency;
}

export interface ProcessCsvResult {
  headers: string[];
  parsedRows: string[][];
  detectedSeparator: string;
  transactions: Transaction[];
  stats: {
    totalRows: number;
    validCount: number;
    invalidAmountCount: number;
    invalidDateCount: number;
    skippedEmptyCount: number;
  };
}

export function parseAndMapCsv(params: ProcessCsvParams): ProcessCsvResult {
  const cleanedText = cleanCsvBomAndEncoding(params.rawCsvText);
  const detectedSeparator = params.presetId && params.presetId !== "generic"
    ? (BANK_PRESETS.find((p) => p.id === params.presetId)?.defaultSeparator || detectCsvSeparator(cleanedText))
    : detectCsvSeparator(cleanedText);

  const parseRes = Papa.parse(cleanedText, {
    delimiter: detectedSeparator,
    header: false,
    skipEmptyLines: true
  });

  const rawData = (parseRes.data as string[][]).map((row) => row.map((cell) => cell?.trim() || ""));

  if (rawData.length === 0) {
    return {
      headers: [],
      parsedRows: [],
      detectedSeparator,
      transactions: [],
      stats: { totalRows: 0, validCount: 0, invalidAmountCount: 0, invalidDateCount: 0, skippedEmptyCount: 0 }
    };
  }

  // Smart detect header row index
  let headerIndex = 0;
  for (let i = 0; i < Math.min(15, rawData.length); i++) {
    const rowStr = rawData[i].join(" ").toLowerCase();
    if (/#?data|#?kwota|#?tytuł|opis|odbiorca|nazwa|amount|date/.test(rowStr)) {
      headerIndex = i;
      break;
    }
  }

  const headers = rawData[headerIndex] || [];
  const rows = rawData.slice(headerIndex + 1).filter((r) => r.length >= 2);

  const autoCols = autoDetectBankColumns(headers, params.presetId);
  const nameCol = params.mapName || autoCols.mapName;
  const amountCol = params.mapAmount || autoCols.mapAmount;
  const dateCol = params.mapDate || autoCols.mapDate;
  const catCol = params.mapCategory || autoCols.mapCategory;

  const nameIdx = headers.indexOf(nameCol);
  const amountIdx = headers.indexOf(amountCol);
  const dateIdx = headers.indexOf(dateCol);
  const catIdx = catCol ? headers.indexOf(catCol) : -1;

  const defaultCat = params.defaultCategory || "Inne";
  const defaultAcc = params.defaultAccount || "Konto główne";
  const typeStrat = params.typeStrategy || "auto";
  const rules = params.rules || [];

  const transactions: Transaction[] = [];
  let invalidAmountCount = 0;
  let invalidDateCount = 0;
  let skippedEmptyCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Ignore comment or footer lines (e.g. mBank summary lines)
    if (row.length < 2 || row[0]?.startsWith("# ") || row[0]?.startsWith("Podsumowanie")) {
      skippedEmptyCount++;
      continue;
    }

    const rawAmountStr = amountIdx !== -1 ? row[amountIdx] : "";
    const parsedAmount = parseCsvAmount(rawAmountStr);
    if (!parsedAmount) {
      invalidAmountCount++;
      continue;
    }

    const rawDateStr = dateIdx !== -1 ? row[dateIdx] : "";
    const isoDateStr = parseCsvDate(rawDateStr);
    if (!isoDateStr) {
      invalidDateCount++;
      continue;
    }

    let type: "income" | "expense" = "expense";
    if (typeStrat === "auto") {
      type = parsedAmount.isNegative ? "expense" : "income";
    } else {
      type = typeStrat;
    }

    const rawName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : "Transakcja bankowa";

    // Rule-based categorization using activeProfile.transactionRules (Requirement 5)
    let category = defaultCat;
    let categoryIcon = "✨";

    if (catIdx !== -1 && row[catIdx]) {
      category = row[catIdx];
      categoryIcon = iconByCategory[category] || "✨";
    } else {
      const autoCat = autoCategorizeTransaction(rawName, rules, defaultCat);
      category = autoCat.category;
      categoryIcon = autoCat.categoryIcon;
    }

    transactions.push({
      id: `tx-csv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: rawName,
      amount: parsedAmount.amount,
      type,
      isoDate: isoDateStr,
      category,
      categoryIcon,
      account: defaultAcc,
      tags: [],
      currency: params.currency || "PLN"
    });
  }

  return {
    headers,
    parsedRows: rows,
    detectedSeparator,
    transactions,
    stats: {
      totalRows: rows.length,
      validCount: transactions.length,
      invalidAmountCount,
      invalidDateCount,
      skippedEmptyCount
    }
  };
}
