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
import { generateEntityId } from "../utils/id";
import { validateTransactionsBalanceContinuity } from "./balanceValidator";

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
  if (!rawAmount || typeof rawAmount !== "string") return null;
  let str = rawAmount.trim();
  if (!str) return null;

  // Unifikacja wariantów minusa/pauzy oraz zdjęcie cudzysłowów
  str = str
    .replace(/[−–—]/g, "-")
    .replace(/^["']|["']$/g, "")
    .trim();

  if (!str) return null;

  // Notacja wykładnicza (np. "1E+300")
  if (/\d[eE][-+]?\d/.test(str)) return null;

  // 1. Odrzucenie jawnych wzorców dat przed jakąkolwiek modyfikacją tekstu
  // np. YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY, DD-MM-YYYY, DD/MM/YYYY
  if (/^\s*\d{1,4}[.\-/]\d{1,2}[.\-/]\d{1,4}(\s+[0-9:]+)?\s*$/.test(str)) {
    return null;
  }

  // 1b. Odrzucenie zakresów dat (np. "01.10-04.11.2025", "01.10–04.11", "01.10 - 04.11")
  if (/\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\s*[-–—]\s*\d{1,2}[./-]\d{1,2}/.test(str)) {
    return null;
  }

  // 1c. Odrzucenie wzorców miesiąc-rok (np. "08.2025", "10.2025", "za 08.2025")
  if (/^\s*(?:za\s+)?(?:0?[1-9]|1[0-2])[./]\d{4}\s*$/i.test(str)) {
    return null;
  }

  // 1d. Odrzucenie fragmentów dat dzień.miesiąc z kropką i wiodącym zerem (np. "01.10", "04.11", "01.10-")
  // bez jawnej waluty (PLN, EUR, etc.)
  const hasExplicitCurrency = /(?:\b(?:PLN|EUR|USD|GBP|CHF|zł|zl|€|\$|£)\b|[zł|zl|€|\$|£])/i.test(str);
  if (!hasExplicitCurrency && /^\s*[-+]?0[1-9]\.(?:0[1-9]|[12]\d|3[01])[-+]?\s*$/.test(str)) {
    return null;
  }

  // 2. Odrzucenie wewnętrznych myślników lub ukośników między cyframi (np. "2026-09-19", "12/34", "FV/2026/123")
  // Znak minus jest dozwolony WYŁĄCZNIE na samym początku ("-100") lub końcu ("100-")
  if (/\d\s*-\s*\d/.test(str) || /\//.test(str)) {
    return null;
  }

  // 3. Odrzucenie struktur numerów kont bankowych (NRB/IBAN: 26 cyfr) i kart płatniczych (16 cyfr)
  // E.g. "61 1090 1014 0000 0712 1981 2874", "4111 2222 3333 4444"
  // W kwotach finansowych grupowanie spacji to 3 cyfry (tysiące), nigdy 4 cyfry w blokach!
  if (/\b\d{4}\s+\d{4}\s+\d{4}\b/.test(str) || /^\s*\d{2}(\s+\d{4}){6}\s*$/.test(str)) {
    return null;
  }

  // 4. Usunięcie poprawnych kodów/symboli walut
  const withoutCurrency = str
    .replace(/(?:\b(?:PLN|EUR|USD|GBP|CHF|SEK|NOK|CZK|CAD|AUD|PLZ|złotych|euro)\b|[zł|zl|€|\$|£])/gi, "")
    .trim();

  if (!withoutCurrency) return null;

  // 5. KRYTYCZNE: Odrzucenie jakiegokolwiek ciągu, który nadal zawiera litery (Unicode \p{L})
  // np. "Skrytka Pocztowa 2108", "Przelew 100", "Faktura 123", "Konto 1020", "PL611090..."
  if (/\p{L}/u.test(withoutCurrency)) {
    return null;
  }

  // 6. Rozpoznanie znaku kwoty
  let isNegative = false;
  let work = withoutCurrency;
  if (
    work.startsWith("-") ||
    work.endsWith("-") ||
    (work.startsWith("(") && work.endsWith(")"))
  ) {
    isNegative = true;
  }

  // Usunięcie nawiasów oraz wiodącego/końcowego znaku plus/minus
  work = work
    .replace(/[()]/g, "")
    .replace(/^[-+]|[-+]$/g, "")
    .trim();

  // Usunięcie spacji (separatory tysięcy np. "1 234,56", "20 260 919,00")
  work = work.replace(/\s+/g, "");

  // 7. Dozwolone są teraz WYŁĄCZNIE cyfry, kropki i przecinki
  if (!work || !/^[\d.,]+$/.test(work)) {
    return null;
  }

  // 8. Sprawdzenie, czy kropki nie tworzą daty (np. "19.09.2026")
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(work)) {
    return null;
  }

  // 9. Odrzucenie 8-cyfrowego ciągu bez separatorów pasującego do daty YYYYMMDD (np. "20260919")
  if (/^(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])$/.test(work)) {
    if (!work.includes(",") && !work.includes(".")) {
      return null;
    }
  }

  const hasComma = work.includes(",");
  const hasDot = work.includes(".");

  // 10. Odrzucenie numerów kont (26 cyfr), kart (16 cyfr) i identyfikatorów bez części ułamkowej
  // Kwoty bez groszy powyżej 10 cyfr (od miliarda w górę bez separatora dziesiętnego) nie są transakcjami
  if (!hasComma && !hasDot) {
    if (work.length >= 10) {
      return null;
    }
  }

  // 11. Odrzucenie ciągów z wieloma kropkami/przecinkami, które nie są poprawnymi separatorami tysięcy
  // np. "12.34.56" (czas/IP) lub "1.2.3"
  if ((work.match(/\./g) || []).length >= 2) {
    const parts = work.split(".");
    // Wszystkie grupy wewnętrzne w zapisie tysięcznym muszą mieć dokładnie 3 cyfry (np. 1.000.000)
    for (let i = 1; i < parts.length - (hasComma ? 0 : 1); i++) {
      if (parts[i].length !== 3) return null;
    }
  }
  if ((work.match(/,/g) || []).length >= 2) {
    const parts = work.split(",");
    for (let i = 1; i < parts.length - (hasDot ? 0 : 1); i++) {
      if (parts[i].length !== 3) return null;
    }
  }

  // 12. Rozstrzygnięcie separatora dziesiętnego i tysięcy
  const lastComma = work.lastIndexOf(",");
  const lastDot = work.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    work = work.replaceAll(thousandsSeparator, "").replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    const commaCount = (work.match(/,/g) || []).length;
    if (commaCount === 1) {
      work = work.replace(",", ".");
    } else {
      const afterLast = work.slice(lastComma + 1);
      if (afterLast.length === 2) {
        work = work.slice(0, lastComma).replaceAll(",", "") + "." + afterLast;
      } else {
        work = work.replaceAll(",", "");
      }
    }
  } else if (lastDot >= 0) {
    const dotCount = (work.match(/\./g) || []).length;
    if (dotCount > 1) {
      const afterLast = work.slice(lastDot + 1);
      if (afterLast.length === 2) {
        work = work.slice(0, lastDot).replaceAll(".", "") + "." + afterLast;
      } else {
        work = work.replaceAll(".", "");
      }
    }
  }

  const val = parseFloat(work);
  if (!Number.isFinite(val) || Number.isNaN(val)) {
    return null;
  }

  return {
    amount: Math.abs(val),
    isNegative: val < 0 || isNegative
  };
}

export function looksLikeBalanceColumn(header: string): boolean {
  const h = header.toLowerCase().replace(/^#\s*/, "").trim();
  return (
    /^(saldo( (po operacji|ko[ńn]cowe|pocz[ąa]tkowe|dost[ęe]pne|ksi[ęe]gowe))?|stan konta|balance( (after|end|start|available))?)$/i.test(h) ||
    /saldo po operacji|saldo końcowe|saldo księgowe|stan konta po transakcji|balance after/i.test(h) ||
    /^saldo$/i.test(h) ||
    /^balance$/i.test(h)
  );
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
  let mapBalance = "";

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

    const foundBalance = headers.find((h) => /balance|saldo/i.test(h.trim()));
    mapBalance = foundBalance || "";
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

    const foundBalance = headers.find((h) => /#?saldo po operacji|#?saldo/i.test(h.trim()));
    mapBalance = foundBalance || "";
  } else if (presetId === "pko") {
    const foundTytul = headers.find((h) => /nazwa|odbiorca|nadawca|tytuł/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data operacji|data waluty|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";

    const foundBalance = headers.find((h) => /saldo po operacji|saldo/i.test(h.trim()));
    mapBalance = foundBalance || "";
  } else if (presetId === "ing") {
    const foundTytul = headers.find((h) => /tytuł|dane kontrahenta/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data transakcji|data rozliczenia|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";

    const foundBalance = headers.find((h) => /saldo po transakcji|saldo/i.test(h.trim()));
    mapBalance = foundBalance || "";
  } else if (presetId === "santander") {
    const foundTytul = headers.find((h) => /opis transakcji|opis|tytuł|dane kontrahenta/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota w walucie rachunku|kwota transakcji|kwota|wartość/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data księgowania|data operacji|data waluty|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";

    const foundBalance = headers.find((h) => /saldo po operacji|saldo/i.test(h.trim()));
    mapBalance = foundBalance || "";
  } else if (presetId === "millennium") {
    const foundTytul = headers.find((h) => /opis|odbiorca\/nadawca|odbiorca|nadawca|tytuł/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota w walucie rachunku|kwota transakcji|kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data transakcji|data rozliczenia|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";

    const foundBalance = headers.find((h) => /saldo po transakcji|saldo/i.test(h.trim()));
    mapBalance = foundBalance || "";
  } else if (presetId === "pekao") {
    const foundTytul = headers.find((h) => /tytułem|odbiorca\/nadawca|dane kontrahenta|opis/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota operacji|kwota w walucie konta|kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data operacji|data księgowania|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";

    const foundBalance = headers.find((h) => /saldo po operacji|saldo/i.test(h.trim()));
    mapBalance = foundBalance || "";
  } else if (presetId === "alior") {
    const foundTytul = headers.find((h) => /opis transakcji|tytuł transakcji|nazwa odbiorcy|odbiorca|tytuł/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota transakcji|kwota w walucie konta|kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data transakcji|data księgowania|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";

    const foundBalance = headers.find((h) => /saldo po operacji|saldo/i.test(h.trim()));
    mapBalance = foundBalance || "";
  } else if (presetId === "bnp") {
    const foundTytul = headers.find((h) => /opis transakcji|tytuł|nadawca\/odbiorca|opis/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota transakcji|kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data transakcji|data rozliczenia|data/i.test(h.trim()));
    mapDate = foundData || "";

    const foundWaluta = headers.find((h) => /waluta/i.test(h.trim()));
    mapCurrency = foundWaluta || "";

    const foundBalance = headers.find((h) => /saldo po operacji|saldo/i.test(h.trim()));
    mapBalance = foundBalance || "";
  }

  // Kolumna kierunku oraz kolumny obciążenia/uznania i salda muszą zostać rozpoznane
  // PRZED kolumną "kwota": inaczej "Kwota obciążenia" lub "Kwota salda" zostaje wybrana jako
  // jedyna kolumna kwoty.
  for (const h of headers) {
    if (!mapDirection && looksLikeDirectionColumn(h)) mapDirection = h;
    if (!mapDebit && looksLikeDebitColumn(h)) mapDebit = h;
    if (!mapCredit && looksLikeCreditColumn(h)) mapCredit = h;
    if (!mapBalance && looksLikeBalanceColumn(h)) mapBalance = h;
  }

  for (const h of headers) {
    const lower = h.toLowerCase().trim();

    if (h === mapDebit || h === mapCredit || h === mapBalance) continue;

    // Tytuł / opis nie może być kolumną daty ani salda
    if (!mapName && !looksLikeBalanceColumn(h) && !/#?data|date|czas/.test(lower) && /#?tytuł|opis|nazwa|odbiorca|nadawca|treść|details|title|description|name|counterparty/.test(lower)) {
      mapName = h;
    }

    // Kwota: KRYTYCZNE — nagłówki zawierające datę (np. "Data wartości") ani salda (np. "Kwota salda")
    // NIE MOGĄ zostać zakwalifikowane jako kolumna kwoty!
    if (!mapAmount && !looksLikeBalanceColumn(h) && !/#?data|date|czas/.test(lower) && /#?kwota|wartość|sum|amount|value/.test(lower)) {
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

  return { mapName, mapAmount, mapDate, mapCategory, mapCurrency, mapDirection, mapDebit, mapCredit, mapBalance };
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
  mapBalance?: string;
  sourceFileName?: string;
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

  // Smart detect header row index (obsługuje preambuły bankowe mBank/PKO do 50 wierszy)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(50, rawData.length); i++) {
    const rowStr = rawData[i].join(" ").toLowerCase();
    const hasDate = /#?data|date|czas/i.test(rowStr);
    const hasAmount = /#?kwota|amount|wartość|obciążen|uznan|saldo/i.test(rowStr);
    const hasDesc = /#?opis|tytuł|nazwa|odbiorca|nadawca|details|title/i.test(rowStr);
    if ((hasDate && (hasAmount || hasDesc)) || (hasAmount && hasDesc)) {
      headerIndex = i;
      break;
    }
  }

  // Fallback do pojedynczego dopasowania jeśli nie znaleziono złożonego nagłówka
  if (headerIndex === -1) {
    headerIndex = 0;
    for (let i = 0; i < Math.min(15, rawData.length); i++) {
      const rowStr = rawData[i].join(" ").toLowerCase();
      if (/#?data|#?kwota|#?tytuł|opis|odbiorca|nazwa|amount|date|started date|completed date/.test(rowStr)) {
        headerIndex = i;
        break;
      }
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
  const balanceCol = params.mapBalance || autoCols.mapBalance;

  const nameIdx = headers.indexOf(nameCol);
  const amountIdx = headers.indexOf(amountCol);
  const dateIdx = headers.indexOf(dateCol);
  const catIdx = catCol ? headers.indexOf(catCol) : -1;
  const currIdx = currCol ? headers.indexOf(currCol) : -1;
  const balanceIdx = balanceCol ? headers.indexOf(balanceCol) : -1;

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

  // Walidacja kolizji kolumn — nie wolno mapować kwoty i daty lub kwoty i salda do tej samej kolumny
  if (amountIdx !== -1 && dateIdx !== -1 && amountIdx === dateIdx) {
    return {
      headers,
      parsedRows: rows,
      detectedSeparator,
      transactions: [],
      detectedCurrencies: { PLN: 0, EUR: 0, USD: 0, GBP: 0 },
      rejectedRows: [],
      directions: [],
      structureError: `Kolumna kwoty i kolumna daty wskazują na tę samą kolumnę ("${headers[amountIdx]}"). Wskaż właściwe kolumny w mapowaniu.`,
      stats: { totalRows: rows.length, validCount: 0, invalidAmountCount: 0, invalidDateCount: 0, skippedEmptyCount: 0, truncatedCount }
    };
  }

  if (amountIdx !== -1 && nameIdx !== -1 && amountIdx === nameIdx) {
    return {
      headers,
      parsedRows: rows,
      detectedSeparator,
      transactions: [],
      detectedCurrencies: { PLN: 0, EUR: 0, USD: 0, GBP: 0 },
      rejectedRows: [],
      directions: [],
      structureError: `Kolumna kwoty i kolumna opisu/nazwy wskazują na tę samą kolumnę ("${headers[amountIdx]}"). Wskaż właściwe kolumny w mapowaniu.`,
      stats: { totalRows: rows.length, validCount: 0, invalidAmountCount: 0, invalidDateCount: 0, skippedEmptyCount: 0, truncatedCount }
    };
  }

  if (amountIdx !== -1 && balanceIdx !== -1 && amountIdx === balanceIdx) {
    return {
      headers,
      parsedRows: rows,
      detectedSeparator,
      transactions: [],
      detectedCurrencies: { PLN: 0, EUR: 0, USD: 0, GBP: 0 },
      rejectedRows: [],
      directions: [],
      structureError: `Kolumna kwoty i kolumna salda wskazują na tę samą kolumnę ("${headers[amountIdx]}"). Saldo po operacji nie może być kwotą transakcji.`,
      stats: { totalRows: rows.length, validCount: 0, invalidAmountCount: 0, invalidDateCount: 0, skippedEmptyCount: 0, truncatedCount }
    };
  }

  // Bez rozpoznanej kolumny kwoty lub daty nie ma czego importować.
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

    // Wyodrębnienie salda po operacji (jeśli kolumna salda jest dostępna)
    let balanceAfter: number | undefined = undefined;
    if (balanceIdx !== -1 && row[balanceIdx]) {
      const parsedBalance = parseCsvAmount(row[balanceIdx]);
      if (parsedBalance) {
        balanceAfter = parsedBalance.isNegative ? -parsedBalance.amount : parsedBalance.amount;
      }
    }

    const transactionId = generateEntityId('csv');
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
      currency: rowCurrency,
      balanceAfter,
      rawSource: rawLineSnippet,
      sourceFile: params.sourceFileName || "import.csv",
      sourceRow: rowLineNum,
      validationStatus: "VALID"
    });
    directions.push({ transactionId, source: directionSource, confident: directionConfident });
  }

  // Walidacja ciągłości salda (Balance Continuity)
  // WAŻNE: Nie modyfikuje validationStatus (kwota, data i typ pozostają VALID).
  // Status ciągłości salda zapisywany jest w odrębnym polu balanceContinuity.
  validateTransactionsBalanceContinuity(transactions);

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
