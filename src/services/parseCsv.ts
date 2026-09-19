import Papa from "papaparse";
import { SupportedCurrency, Transaction, TransactionRule } from "../types";
import { autoCategorizeTransaction, iconByCategory } from "../utils";
import {
  detectDirection,
  looksLikeCreditColumn,
  looksLikeDebitColumn,
  looksLikeDirectionColumn,
  type ImportDirectionInfo
} from "./directionDetector";

export type BankPresetId =
  | "generic"
  | "revolut"
  | "mbank"
  | "pko"
  | "ing"
  | "santander"
  | "millennium"
  | "pekao"
  | "alior"
  | "bnp";

export interface BankPreset {
  id: BankPresetId;
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
    id: "revolut",
    name: "Revolut",
    description: "Format wyciągu konta Revolut (obsługa wielu walut)",
    defaultSeparator: ","
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
  },
  {
    id: "santander",
    name: "Santander Bank Polska",
    description: "Format wyciągu Santander (separator ,)",
    defaultSeparator: ","
  },
  {
    id: "millennium",
    name: "Bank Millennium",
    description: "Format wyciągu Banku Millennium (separator ,)",
    defaultSeparator: ","
  },
  {
    id: "pekao",
    name: "Bank Pekao (Pekao24 / PeoPay)",
    description: "Format wyciągu Banku Pekao S.A. (separator ;)",
    defaultSeparator: ";"
  },
  {
    id: "alior",
    name: "Alior Bank",
    description: "Format wyciągu Alior Bank (separator ;)",
    defaultSeparator: ";"
  },
  {
    id: "bnp",
    name: "BNP Paribas (GOonline)",
    description: "Format wyciągu BNP Paribas (separator ;)",
    defaultSeparator: ";"
  }
];

export function cleanCsvBomAndEncoding(text: string): string {
  if (!text) return "";
  // Strip UTF-8 BOM if present
  let cleaned = text.startsWith("\uFEFF") ? text.slice(1) : text;
  return cleaned;
}

// Separatory wewnątrz pól w cudzysłowie nie opisują struktury pliku — opis
// "Opłata, prowizja" nie czyni z pliku CSV rozdzielanego przecinkiem. Tabulator
// jest uwzględniony, bo część eksportów bankowych to de facto TSV.
export function detectCsvSeparator(text: string): string {
  const candidates = [";", ",", "\t", "|"];
  const sampleLines = text.split(/\r?\n/).slice(0, 15).filter((l) => l.trim().length > 0);
  const counts = new Map<string, number>(candidates.map((c) => [c, 0]));

  for (const line of sampleLines) {
    const structural = line.replace(/"[^"]*"/g, "");
    for (const candidate of candidates) {
      counts.set(candidate, (counts.get(candidate) || 0) + structural.split(candidate).length - 1);
    }
  }

  let best = ";";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = counts.get(candidate) || 0;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

export function parseCsvDate(rawDate: string): string | null {
  if (!rawDate) return null;
  const trimmed = rawDate.trim().replace(/^['"]|['"]$/g, "");

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00Z`);
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === trimmed ? trimmed : null;
  }

  // DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    const normalized = `${year}-${month}-${day}`;
    const parsed = new Date(`${normalized}T00:00:00Z`);
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === normalized ? normalized : null;
  }

  // DD.MM.YY lub DD/MM/YY — dwucyfrowy rok, częsty w eksportach bankowych
  const dmyShortMatch = trimmed.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2})$/);
  if (dmyShortMatch) {
    const day = dmyShortMatch[1].padStart(2, "0");
    const month = dmyShortMatch[2].padStart(2, "0");
    // Próg 70: "26" → 2026, "99" → 1999. Wyciągi bankowe nie sięgają roku 2070.
    const shortYear = parseInt(dmyShortMatch[3], 10);
    const year = String(shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear);
    const normalized = `${year}-${month}-${day}`;
    const parsed = new Date(`${normalized}T00:00:00Z`);
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === normalized ? normalized : null;
  }

  // YYYY.MM.DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    const normalized = `${year}-${month}-${day}`;
    const parsed = new Date(`${normalized}T00:00:00Z`);
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === normalized ? normalized : null;
  }

  // ISO string with time: YYYY-MM-DD HH:MM:SS or YYYY-MM-DDTHH:MM:SS
  const isoTimeMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T]/);
  if (isoTimeMatch) {
    return isoTimeMatch[1];
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
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "")
    .replace(/PLN|EUR|USD|GBP|zł|PLZ/gi, "")
    .replace(/^["']|["']$/g, "");

  if (!cleaned) return null;

  // Notacja wykładnicza (np. "1E+300") musi być odrzucona PRZED usunięciem liter niżej —
  // [^\d.-] wycina samo "E"/"+", więc "1E+300" cicho zmieniało się w błędne "1300"
  // zamiast zostać odrzucone jako nieprawidłowa kwota. Arkusze potrafią eksportować duże
  // liczby właśnie w tej notacji, więc to nie jest tylko teoretyczny przypadek.
  if (/\d[eE][-+]?\d/.test(cleaned)) return null;

  let isNegative = false;
  if (cleaned.startsWith("-") || cleaned.endsWith("-") || (cleaned.startsWith("(") && cleaned.endsWith(")"))) {
    isNegative = true;
  }

  cleaned = cleaned.replace(/[()]/g, "").replace(/^-|-$/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    cleaned = cleaned.replaceAll(thousandsSeparator, "").replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    cleaned = cleaned.replaceAll(",", ".");
  } else if ((cleaned.match(/\./g) || []).length > 1) {
    const decimalSeparatorIndex = cleaned.lastIndexOf(".");
    cleaned = `${cleaned.slice(0, decimalSeparatorIndex).replaceAll(".", "")}${cleaned.slice(decimalSeparatorIndex)}`;
  }
  cleaned = cleaned.replace(/[^\d.]/g, "");

  const val = parseFloat(cleaned);
  // Number.isFinite, nie isNaN: isNaN(Infinity) === false, więc arkusze eksportujące
  // bardzo długie ciągi cyfr (bez notacji wykładniczej) też mogą przepełnić się do Infinity.
  // Kwota 0,00 jest legalna (korekty, przewalutowania, zniesione opłaty) —
  // odrzucanie jej gubiło realne wiersze wyciągu jako "nieprawidłową kwotę".
  if (!Number.isFinite(val)) {
    return null;
  }

  return {
    amount: Math.abs(val),
    isNegative: val < 0 || isNegative
  };
}

export function autoDetectBankColumns(
  headers: string[],
  presetId: BankPresetId = "generic"
) {
  let mapName = "";
  let mapAmount = "";
  let mapDate = "";
  let mapCategory = "";
  let mapCurrency = "";
  let mapDirection = "";
  let mapDebit = "";
  let mapCredit = "";

  if (presetId === "revolut") {
    const foundDesc = headers.find((h) => /description|opis/i.test(h.trim()));
    const foundType = headers.find((h) => /^type$|^typ$/i.test(h.trim()));
    mapName = foundDesc || foundType || "";

    const foundAmount = headers.find((h) => /^amount$|^kwota$/i.test(h.trim()));
    mapAmount = foundAmount || "";

    const foundDate = headers.find((h) => /started date|completed date|data rozpoczęcia|data ukończenia|^date$|^data$/i.test(h.trim()));
    mapDate = foundDate || "";

    const foundCurrency = headers.find((h) => /^currency$|^waluta$/i.test(h.trim()));
    mapCurrency = foundCurrency || "";
  } else if (presetId === "mbank") {
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

    const foundWaluta = headers.find((h) => /#?waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";
  } else if (presetId === "pko") {
    const foundTytul = headers.find((h) => /nazwa|odbiorca|nadawca|tytuł/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data operacji|data waluty|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";
  } else if (presetId === "ing") {
    const foundTytul = headers.find((h) => /tytuł|dane kontrahenta/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data transakcji|data rozliczenia|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";
  } else if (presetId === "santander") {
    const foundTytul = headers.find((h) => /opis transakcji|opis|tytuł|dane kontrahenta/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota w walucie rachunku|kwota transakcji|kwota|wartość/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data księgowania|data operacji|data waluty|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";
  } else if (presetId === "millennium") {
    const foundTytul = headers.find((h) => /opis|odbiorca\/nadawca|odbiorca|nadawca|tytuł/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota w walucie rachunku|kwota transakcji|kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data transakcji|data rozliczenia|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";
  } else if (presetId === "pekao") {
    const foundTytul = headers.find((h) => /tytułem|odbiorca\/nadawca|dane kontrahenta|opis/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota operacji|kwota w walucie konta|kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data operacji|data księgowania|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";
  } else if (presetId === "alior") {
    const foundTytul = headers.find((h) => /opis transakcji|tytuł transakcji|nazwa odbiorcy|odbiorca|tytuł/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota transakcji|kwota w walucie konta|kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data transakcji|data księgowania|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";
  } else if (presetId === "bnp") {
    const foundTytul = headers.find((h) => /opis transakcji|tytuł|nadawca\/odbiorca|opis/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota transakcji|kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data transakcji|data rozliczenia|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";
  }

  // Kolumna kierunku oraz kolumny obciążenia/uznania muszą zostać rozpoznane
  // PRZED kolumną "kwota": inaczej "Kwota obciążenia" zostaje wybrana jako
  // jedyna kolumna kwoty, a połowa wierszy trafia do odrzuconych z pustą kwotą.
  for (const h of headers) {
    if (!mapDirection && looksLikeDirectionColumn(h)) mapDirection = h;
    if (!mapDebit && looksLikeDebitColumn(h)) mapDebit = h;
    if (!mapCredit && looksLikeCreditColumn(h)) mapCredit = h;
  }

  for (const h of headers) {
    const lower = h.toLowerCase().trim();

    if (h === mapDebit || h === mapCredit) continue;

    if (!mapName && /#?tytuł|opis|nazwa|odbiorca|nadawca|treść|details|title|description|name|counterparty/.test(lower)) {
      mapName = h;
    }

    if (!mapAmount && /#?kwota|wartość|sum|amount|value/.test(lower)) {
      mapAmount = h;
    }

    if (!mapDate && /#?data|date|czas/.test(lower)) {
      mapDate = h;
    }

    if (!mapCategory && /kategoria|category/.test(lower)) {
      mapCategory = h;
    }

    if (!mapCurrency && /waluta|currency|kod waluty/.test(lower)) {
      mapCurrency = h;
    }
  }

  return { mapName, mapAmount, mapDate, mapCategory, mapCurrency, mapDirection, mapDebit, mapCredit };
}

export interface ProcessCsvParams {
  rawCsvText: string;
  presetId?: BankPresetId;
  mapName?: string;
  mapAmount?: string;
  mapDate?: string;
  mapCategory?: string;
  mapCurrency?: string;
  mapDirection?: string;
  mapDebit?: string;
  mapCredit?: string;
  defaultCategory?: string;
  defaultAccount?: string;
  typeStrategy?: "auto" | "expense" | "income";
  rules?: TransactionRule[];
  currency?: SupportedCurrency;
}

export interface RejectedCsvRow {
  rowIndex: number;
  rawText: string;
  reason: string;
}

export interface ProcessCsvResult {
  headers: string[];
  parsedRows: string[][];
  detectedSeparator: string;
  transactions: Transaction[];
  detectedCurrencies: Record<SupportedCurrency, number>;
  rejectedRows: RejectedCsvRow[];
  /** Skąd wzięła się decyzja o kierunku dla każdej zaimportowanej transakcji. */
  directions: ImportDirectionInfo[];
  /** Ustawione, gdy struktury pliku nie da się rozpoznać — zamiast lawiny odrzuceń. */
  structureError?: string;
  stats: {
    totalRows: number;
    validCount: number;
    invalidAmountCount: number;
    invalidDateCount: number;
    skippedEmptyCount: number;
    truncatedCount: number;
  };
}

// Powyżej tego progu przetwarzanie w jednym renderze (podgląd + wykrywanie duplikatów
// O(n*m) względem istniejących transakcji) zaczyna zauważalnie dławić UI. Zamiast ciszej
// przycinać dane bez śladu, liczba odrzuconych wierszy trafia do stats.truncatedCount,
// żeby UI mógł to pokazać użytkownikowi.
export const MAX_IMPORT_ROWS = 2000;

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
      detectedCurrencies: { PLN: 0, EUR: 0, USD: 0, GBP: 0 },
      rejectedRows: [],
      directions: [],
      stats: { totalRows: 0, validCount: 0, invalidAmountCount: 0, invalidDateCount: 0, skippedEmptyCount: 0, truncatedCount: 0 }
    };
  }

  // Smart detect header row index
  let headerIndex = 0;
  for (let i = 0; i < Math.min(15, rawData.length); i++) {
    const rowStr = rawData[i].join(" ").toLowerCase();
    if (/#?data|#?kwota|#?tytuł|opis|odbiorca|nazwa|amount|date|started date|completed date/.test(rowStr)) {
      headerIndex = i;
      break;
    }
  }

  const headers = rawData[headerIndex] || [];
  const allDataRows = rawData.slice(headerIndex + 1).filter((r) => r.length >= 2);
  const rows = allDataRows.slice(0, MAX_IMPORT_ROWS);
  const truncatedCount = allDataRows.length - rows.length;

  const autoCols = autoDetectBankColumns(headers, params.presetId);
  const nameCol = params.mapName || autoCols.mapName;
  const amountCol = params.mapAmount || autoCols.mapAmount;
  const dateCol = params.mapDate || autoCols.mapDate;
  const catCol = params.mapCategory || autoCols.mapCategory;
  const currCol = params.mapCurrency || autoCols.mapCurrency;

  const nameIdx = headers.indexOf(nameCol);
  const amountIdx = headers.indexOf(amountCol);
  const dateIdx = headers.indexOf(dateCol);
  const catIdx = catCol ? headers.indexOf(catCol) : -1;
  const currIdx = currCol ? headers.indexOf(currCol) : -1;

  const dirCol = params.mapDirection || autoCols.mapDirection;
  const debitCol = params.mapDebit || autoCols.mapDebit;
  const creditCol = params.mapCredit || autoCols.mapCredit;
  const dirIdx = dirCol ? headers.indexOf(dirCol) : -1;
  const debitIdx = debitCol ? headers.indexOf(debitCol) : -1;
  const creditIdx = creditCol ? headers.indexOf(creditCol) : -1;

  const defaultCat = params.defaultCategory || "Inne";
  const defaultAcc = params.defaultAccount || "Konto główne";
  const typeStrat = params.typeStrategy || "auto";
  const rules = params.rules || [];

  // Bez rozpoznanej kolumny kwoty lub daty nie ma czego importować. Wcześniej
  // każdy wiersz leciał do odrzuconych z komunikatem 'Nieprawidłowy format
  // kwoty: "puste"', więc użytkownik widział setki błędów zamiast jednej wskazówki.
  const missingColumns: string[] = [];
  if (amountIdx === -1 && debitIdx === -1 && creditIdx === -1) missingColumns.push("kwoty");
  if (dateIdx === -1) missingColumns.push("daty");

  if (missingColumns.length > 0) {
    return {
      headers,
      parsedRows: rows,
      detectedSeparator,
      transactions: [],
      detectedCurrencies: { PLN: 0, EUR: 0, USD: 0, GBP: 0 },
      rejectedRows: [],
      directions: [],
      structureError: `Nie rozpoznaliśmy kolumny: ${missingColumns.join(" i ")}. Wskaż ją ręcznie w mapowaniu kolumn.`,
      stats: {
        totalRows: rows.length,
        validCount: 0,
        invalidAmountCount: 0,
        invalidDateCount: 0,
        skippedEmptyCount: 0,
        truncatedCount
      }
    };
  }

  const transactions: Transaction[] = [];
  const rejectedRows: RejectedCsvRow[] = [];
  const directions: ImportDirectionInfo[] = [];
  const detectedCurrencies: Record<SupportedCurrency, number> = {
    PLN: 0,
    EUR: 0,
    USD: 0,
    GBP: 0
  };

  let invalidAmountCount = 0;
  let invalidDateCount = 0;
  let skippedEmptyCount = 0;

  // Kolumna kwoty bywa pusta, gdy bank rozdziela obciążenia i uznania na dwie
  // osobne kolumny — wtedy kwota wiersza siedzi w tej, która jest wypełniona.
  const extractRowAmount = (row: string[]) => {
    const debitParsed = debitIdx !== -1 ? parseCsvAmount(row[debitIdx]) : null;
    const creditParsed = creditIdx !== -1 ? parseCsvAmount(row[creditIdx]) : null;
    const hasDebit = debitParsed !== null && debitParsed.amount !== 0;
    const hasCredit = creditParsed !== null && creditParsed.amount !== 0;

    if (hasDebit || hasCredit) {
      return {
        raw: hasDebit ? row[debitIdx] : row[creditIdx],
        fromDebitColumn: hasDebit,
        fromCreditColumn: hasCredit
      };
    }

    return {
      raw: amountIdx !== -1 ? row[amountIdx] : "",
      fromDebitColumn: false,
      fromCreditColumn: false
    };
  };

  // Czy w pliku w ogóle występują minusy. Bez tego znak kwoty nie niesie
  // informacji o kierunku i nie wolno na jego podstawie cicho zakładać przychodu.
  const hasNegativeAmounts = rows.some((row) => {
    const parsed = parseCsvAmount(extractRowAmount(row).raw);
    return parsed !== null && parsed.isNegative;
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowLineNum = headerIndex + 2 + i;
    const rawLineSnippet = row.join(" | ");

    // Ignore comment or footer lines (e.g. mBank summary lines)
    if (row.length < 2 || row[0]?.startsWith("# ") || row[0]?.startsWith("Podsumowanie")) {
      skippedEmptyCount++;
      continue;
    }

    const amountCell = extractRowAmount(row);
    const rawAmountStr = amountCell.raw;
    const parsedAmount = parseCsvAmount(rawAmountStr);
    if (!parsedAmount) {
      invalidAmountCount++;
      rejectedRows.push({
        rowIndex: rowLineNum,
        rawText: rawLineSnippet,
        reason: `Nieprawidłowy format kwoty: "${rawAmountStr || "puste"}"`
      });
      continue;
    }

    const rawDateStr = dateIdx !== -1 ? row[dateIdx] : "";
    const isoDateStr = parseCsvDate(rawDateStr);
    if (!isoDateStr) {
      invalidDateCount++;
      rejectedRows.push({
        rowIndex: rowLineNum,
        rawText: rawLineSnippet,
        reason: `Nieprawidłowy format daty: "${rawDateStr || "puste"}"`
      });
      continue;
    }

    const rawName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : "Transakcja bankowa";

    let type: "income" | "expense";
    let directionSource: ImportDirectionInfo["source"];
    let directionConfident: boolean;

    if (typeStrat === "auto") {
      const direction = detectDirection(
        {
          explicitDirection: dirIdx !== -1 ? row[dirIdx] : "",
          amountNegative: parsedAmount.isNegative,
          fromDebitColumn: amountCell.fromDebitColumn,
          fromCreditColumn: amountCell.fromCreditColumn,
          description: rawName
        },
        { hasNegativeAmounts }
      );
      type = direction.type;
      directionSource = direction.source;
      directionConfident = direction.confident;
    } else {
      type = typeStrat;
      directionSource = "manual";
      directionConfident = true;
    }

    // Rule-based categorization using activeProfile.transactionRules
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

    // Row-level currency detection with fallback
    let rowCurrency: SupportedCurrency = params.currency || "PLN";
    if (currIdx !== -1 && row[currIdx]) {
      const candidateCurr = row[currIdx].trim().toUpperCase();
      if (candidateCurr === "PLN" || candidateCurr === "EUR" || candidateCurr === "USD" || candidateCurr === "GBP") {
        rowCurrency = candidateCurr;
      }
    }

    detectedCurrencies[rowCurrency] = (detectedCurrencies[rowCurrency] || 0) + 1;

    const transactionId = `tx-csv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
    transactions.push({
      id: transactionId,
      name: rawName,
      amount: parsedAmount.amount,
      type,
      isoDate: isoDateStr,
      category,
      categoryIcon,
      account: defaultAcc,
      tags: [],
      currency: rowCurrency
    });
    directions.push({ transactionId, source: directionSource, confident: directionConfident });
  }

  return {
    headers,
    parsedRows: rows,
    detectedSeparator,
    transactions,
    detectedCurrencies,
    rejectedRows,
    directions,
    stats: {
      totalRows: rows.length,
      validCount: transactions.length,
      invalidAmountCount,
      invalidDateCount,
      skippedEmptyCount,
      truncatedCount
    }
  };
}
