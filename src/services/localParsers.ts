import { Payment, SupportedCurrency, TransactionRule } from "../types";
import { autoCategorizeTransaction } from "../utils/categories";
import { getLocalDateIso } from "../utils/date";
import { formatMoney } from "../utils/format";
import { cleanCsvBomAndEncoding, detectCsvSeparator, parseCsvAmount, parseCsvDate } from "./parseCsv";

/**
 * Deterministyczne parsery działające w całości na urządzeniu.
 * Bez sieci, bez limitów zapytań, dostępne offline.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Waliduje datę ISO także semantycznie — "2024-13-45" ma poprawny kształt, ale nie istnieje. */
function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

function shiftDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const shifted = new Date(y, m - 1, d + days);
  return getLocalDateIso(shifted);
}

function normalizeReferenceDate(currentDate?: string): string {
  return currentDate && isRealIsoDate(currentDate) ? currentDate : getLocalDateIso();
}

/**
 * Wyciąga kwotę: "120 zł", "45,99", "1 234,56 PLN", "12.50".
 * Zwraca null, gdy w tekście nie ma liczby.
 */
export function extractAmount(text: string): number | null {
  const withCurrency = text.match(/(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:zł|zl|pln|eur|usd|gbp|€|\$|£)/i);
  const bare = text.match(/(\d[\d\s]*(?:[.,]\d{1,2})?)/);
  const raw = (withCurrency || bare)?.[1];
  if (!raw) return null;

  const amount = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
}

/**
 * Buduje wyrażenie z granicami słowa świadomymi znaków diakrytycznych.
 * Zwykłe \b jest w JS ASCII-owe, więc \bzapłać\b nigdy nie pasuje (granica po "ć" zawodzi).
 */
function polishWordRegex(pattern: string, flags = ""): RegExp {
  return new RegExp(`(?<!\\p{L})(?:${pattern})(?!\\p{L})`, `u${flags}`);
}

/**
 * Wyciąga datę z języka naturalnego: "dziś", "jutro", "pojutrze", "za 5 dni",
 * "2026-03-14", "14.03.2026", "14/03/2026".
 * Zwraca datę odniesienia, gdy nic nie rozpozna.
 */
export function extractDate(text: string, currentDate?: string): string {
  const today = normalizeReferenceDate(currentDate);
  const lower = text.toLowerCase();

  if (polishWordRegex("pojutrze").test(lower)) return shiftDays(today, 2);
  if (polishWordRegex("jutro").test(lower)) return shiftDays(today, 1);
  if (polishWordRegex("dzis|dziś|dzisiaj").test(lower)) return today;

  const inDays = lower.match(polishWordRegex("za\\s+(\\d{1,3})\\s*(?:dni|dzien|dzień)"));
  if (inDays) return shiftDays(today, parseInt(inDays[1], 10));

  const inWeeks = lower.match(polishWordRegex("za\\s+(\\d{1,2})\\s*(?:tydzien|tydzień|tygodnie|tygodni)"));
  if (inWeeks) return shiftDays(today, parseInt(inWeeks[1], 10) * 7);

  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso && isRealIsoDate(iso[1])) return iso[1];

  const dotted = text.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b/);
  if (dotted) {
    const candidate = `${dotted[3]}-${dotted[2].padStart(2, "0")}-${dotted[1].padStart(2, "0")}`;
    if (isRealIsoDate(candidate)) return candidate;
  }

  return today;
}

// Słowa sterujące usuwane z nazwy wpisu. Granice są istotne: bez nich "za"
// wycinało się ze środka "zapłać", a "na" ze środka "Orange".
const CONTROL_WORDS = polishWordRegex(
  "przypomnij|przypomnienie|wydarzenie|spotkanie|kalendarz|platnosc|płatność|zaplac|zapłać|zaplacic|zapłacić|rachunek|faktura|za|na|dnia|dni|dzien|dzień|tydzien|tydzień|tygodnie|tygodni|dzis|dziś|dzisiaj|jutro|pojutrze",
  "gi"
);

const EVENT_WORDS = polishWordRegex("przypomnij|przypomnienie|wydarzenie|spotkanie|kalendarz", "i");

export interface QuickEntryResult {
  /** "event" → przypomnienie w kalendarzu, "payment" → rachunek do zapłaty. */
  kind: "payment" | "event";
  name: string;
  amount: number;
  isoDate: string;
  category: string;
  categoryIcon: string;
}

/**
 * Zamienia zdanie w rodzaju "prąd 340 zł za 3 dni" na gotowy wpis.
 * Zwraca null dla tekstu, z którego nie da się nic sensownego wyciągnąć.
 */
export function parseQuickEntry(
  rawText: string,
  currentDate?: string,
  rules: TransactionRule[] = []
): QuickEntryResult | null {
  const text = (rawText || "").trim();
  if (!text) return null;

  const amount = extractAmount(text);
  const isoDate = extractDate(text, currentDate);
  const kind = EVENT_WORDS.test(text) ? "event" : "payment";

  // Wpis bez kwoty ma sens tylko jako przypomnienie.
  if (amount === null && kind === "payment") return null;

  const name = text
    .replace(/(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:zł|zl|pln|eur|usd|gbp|€|\$|£)/gi, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4}\b/g, " ")
    .replace(/\b\d{1,3}\b/g, " ")
    .replace(CONTROL_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Wiodący przyimek zostaje po wycięciu słów sterujących ("przypomnij o wizycie" → "o wizycie").
    .replace(/^(?:o|w|we|u|z|ze|do|dla|po)\s+/i, "")
    .trim();

  const cleanName = name.length >= 2
    ? name.charAt(0).toUpperCase() + name.slice(1)
    : "Szybki wpis";

  const { category, categoryIcon } = autoCategorizeTransaction(cleanName, rules, "Inne");

  return {
    kind,
    name: cleanName,
    amount: amount ?? 0,
    isoDate,
    category,
    categoryIcon
  };
}

export interface ParsedStatementRow {
  name: string;
  amount: number;
  type: "income" | "expense";
  isoDate: string;
  category: string;
  categoryIcon: string;
  account: string;
  balanceAfter?: number;
}

/** Komórka wygląda na datę tylko wtedy, gdy ma kształt daty — inaczej new Date("2026") zjadłoby kwotę. */
const DATE_CELL = /^\d{1,4}[.\-/]\d{1,2}[.\-/]\d{1,4}([ T]|$)|^\d{4}-\d{2}-\d{2}([ T]|$)/;

/** Komórka wygląda na kwotę: cyfry, opcjonalny znak, separatory i ewentualny symbol waluty. */
const AMOUNT_CELL = /^[-+(]?[\d\s]*[.,]?\d+\s*[)]?\s*(?:zł|zl|pln|eur|usd|gbp)?$/i;

const HEADER_CELL = /^(data|kwota|opis|tytuł|tytul|saldo|nadawca|odbiorca|typ|waluta|konto)$/i;

/**
 * Parsuje wklejony wyciąg bankowy. Separator wykrywany jest tak samo jak przy imporcie
 * pliku CSV, więc przecinek dziesiętny w "-45,99" nie rozbija wiersza.
 * Znak kwoty decyduje o typie: wartość ujemna → wydatek.
 */
export function parseStatementText(
  text: string,
  currentDate?: string,
  rules: TransactionRule[] = [],
  defaultAccount = "Konto główne"
): ParsedStatementRow[] {
  const referenceDate = normalizeReferenceDate(currentDate);
  const cleaned = cleanCsvBomAndEncoding(text || "");
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const separator = detectCsvSeparator(cleaned);
  const rows: ParsedStatementRow[] = [];

  // Wykrycie kolejności kolumn Saldo vs Kwota z ewentualnego wiersza nagłówka
  let saldoBeforeKwota = false;
  for (const line of lines) {
    const lower = line.toLowerCase();
    const kwotaPos = lower.search(/kwota|wartość|amount/i);
    const saldoPos = lower.search(/saldo|stan konta|balance/i);
    if (kwotaPos !== -1 && saldoPos !== -1) {
      saldoBeforeKwota = saldoPos < kwotaPos;
      break;
    }
  }

  for (const line of lines) {
    const parts = line.split(separator).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    let isoDate = referenceDate;
    const nonAmountParts: string[] = [];
    const amountCandidates: Array<{ raw: string; amount: number; isNegative: boolean }> = [];

    for (const part of parts) {
      if (DATE_CELL.test(part)) {
        const parsed = parseCsvDate(part);
        if (parsed && isRealIsoDate(parsed)) {
          isoDate = parsed;
          continue;
        }
      }

      if (HEADER_CELL.test(part)) continue;

      if (AMOUNT_CELL.test(part)) {
        const parsedAmount = parseCsvAmount(part);
        if (parsedAmount && Number.isFinite(parsedAmount.amount) && parsedAmount.amount > 0) {
          amountCandidates.push({ raw: part, amount: parsedAmount.amount, isNegative: parsedAmount.isNegative });
          continue;
        }
      }

      nonAmountParts.push(part);
    }

    if (amountCandidates.length === 0) continue;

    let amount = 0;
    let isNegative = false;
    let balanceAfter: number | undefined = undefined;

    if (amountCandidates.length >= 2) {
      const signedIdx = amountCandidates.findIndex((c) => c.isNegative || c.raw.startsWith("+") || c.raw.startsWith("-"));
      if (signedIdx !== -1) {
        amount = amountCandidates[signedIdx].amount;
        isNegative = amountCandidates[signedIdx].isNegative;
        const otherIdx = signedIdx === 0 ? amountCandidates.length - 1 : 0;
        balanceAfter = amountCandidates[otherIdx].amount;
      } else if (saldoBeforeKwota) {
        balanceAfter = amountCandidates[0].amount;
        amount = amountCandidates[amountCandidates.length - 1].amount;
        isNegative = amountCandidates[amountCandidates.length - 1].isNegative;
      } else {
        amount = amountCandidates[0].amount;
        isNegative = amountCandidates[0].isNegative;
        balanceAfter = amountCandidates[amountCandidates.length - 1].amount;
      }
    } else {
      amount = amountCandidates[0].amount;
      isNegative = amountCandidates[0].isNegative;
    }

    // Wybieramy opis wyłącznie z fragmentów niebędących kwotą, żeby saldo nigdy nie wyciekło do nazwy
    const finalName = nonAmountParts.find((p) => p.length > 2) || "Transakcja";
    const type: "income" | "expense" = isNegative ? "expense" : "income";
    const fallbackCategory = type === "income" ? "Wynagrodzenie" : "Inne";
    const { category, categoryIcon } = autoCategorizeTransaction(finalName, rules, fallbackCategory);

    rows.push({
      name: finalName,
      amount,
      type,
      isoDate,
      category,
      categoryIcon,
      account: defaultAccount,
      balanceAfter
    });
  }

  return rows;
}

export interface CalendarReminderDraft {
  summary: string;
  description: string;
  suggestedTime: string;
  reminders: number[];
}

/**
 * Buduje treść przypomnienia kalendarzowego dla płatności.
 */
export function buildCalendarReminder(
  payment: Pick<Payment, "name" | "amount" | "dueDate"> & { currency?: SupportedCurrency },
  currentDate?: string
): CalendarReminderDraft {
  const name = payment.name?.trim() || "Rachunek";
  const currency = payment.currency || "PLN";
  const hasAmount = typeof payment.amount === "number" && Number.isFinite(payment.amount);
  const amountLabel = hasAmount ? formatMoney(payment.amount, currency) : "nieznaną kwotę";
  const dueDate = payment.dueDate || normalizeReferenceDate(currentDate);

  return {
    summary: `💸 Płatność: ${name} (${amountLabel})`,
    description: [
      "Przypomnienie o uregulowaniu rachunku lub subskrypcji.",
      "",
      `Nazwa: ${name}`,
      `Kwota: ${amountLabel}`,
      `Termin: ${dueDate}`,
      "",
      "[Wygenerowano automatycznie z aplikacji Saldo]"
    ].join("\n"),
    suggestedTime: "10:00:00",
    // 24 godziny i 2 godziny przed terminem.
    reminders: [1440, 120]
  };
}
