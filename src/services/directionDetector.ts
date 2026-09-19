import type { Transaction } from "../types";

export type TransactionDirection = Transaction["type"];

/**
 * Skąd pochodzi decyzja o kierunku transakcji. Import pokazuje to użytkownikowi,
 * żeby wiedział, na jakiej podstawie wiersz został zaklasyfikowany, i mógł
 * poprawić wyłącznie te wpisy, których źródło jest niepewne.
 */
export type DirectionSource =
  | "manual"
  | "debit-credit-columns"
  | "direction-column"
  | "amount-sign"
  | "description";

export interface DirectionSignals {
  /** Wartość z kolumny kierunku, np. "Debit", "Wydatek", "expense", "Uznanie". */
  explicitDirection?: string | null;
  /** Kwota wiersza miała znak ujemny. */
  amountNegative?: boolean;
  /** Wiersz ma wartość w kolumnie obciążeniowej (Obciążenia / Debit / Wydatki). */
  fromDebitColumn?: boolean;
  /** Wiersz ma wartość w kolumnie uznaniowej (Uznania / Credit / Wpływy). */
  fromCreditColumn?: boolean;
  /** Opis lub tytuł transakcji — używany wyłącznie przez heurystykę słownikową. */
  description?: string | null;
}

export interface DirectionContext {
  /**
   * Czy w całym pliku występuje choć jedna kwota ujemna. Gdy nie występuje,
   * znak kwoty nie niesie informacji o kierunku (bank eksportuje same wartości
   * dodatnie), więc dodatnia kwota nie jest cichym dowodem na przychód.
   */
  hasNegativeAmounts: boolean;
}

export interface DirectionDecision {
  type: TransactionDirection;
  source: DirectionSource;
  /** false → decyzja niepewna; wiersz powinien trafić do potwierdzenia w UI. */
  confident: boolean;
}

/** Metadane kierunku zwracane razem z wynikiem importu (poza modelem Transaction). */
export interface ImportDirectionInfo {
  transactionId: string;
  source: DirectionSource;
  confident: boolean;
}

/**
 * "Ł" nie rozkłada się przez NFD (w przeciwieństwie do ą/ę/ó), więc zdejmujemy
 * je ręcznie — inaczej "wpłata" i "wplata" nie trafiają do tego samego wzorca.
 * Po normalizacji tekst jest czysto ASCII, dzięki czemu granice \b działają.
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Słownik wartości kolumny kierunku. Obciążenia sprawdzamy pierwsze, bo
 * "Credit card payment" zawiera jednocześnie "credit" i "payment", a jest
 * wydatkiem — kolejność jest tu częścią logiki, nie stylem.
 */
const DIRECTION_VALUE_RULES: ReadonlyArray<readonly [RegExp, TransactionDirection]> = [
  [
    /\b(expense|wydat\w*|obciaz\w*|wyplat\w*|payment|platn\w*|withdrawal|debit|wychodzac\w*)\b/,
    "expense"
  ],
  [/\bfee\b/, "expense"],
  [
    /\b(income|przychod\w*|wplyw\w*|uznanie|uznania|deposit|credit|przychodzac\w*)\b/,
    "income"
  ],
  [/\btop\s?up\b/, "income"]
];

/** Wskazówki opisowe — wyłącznie dla plików, w których znak kwoty nic nie mówi. */
const DESCRIPTION_RULES: ReadonlyArray<readonly [RegExp, TransactionDirection]> = [
  [
    /\b(zakup\w*|platnosc|prowizja|oplat\w*|abonament|subskrypcj\w*|rachunek|faktura|rata|mandat|paliwo|skladka)\b/,
    "expense"
  ],
  [
    /\b(wynagrodzenie|pensja|premia|zwrot|refund|wplyw|wplata|uznanie|odsetki|dywidenda|stypendium|zasilek|alimenty|sprzedaz|przychod|swiadczenie)\b/,
    "income"
  ]
];

function matchRules(
  rawValue: string,
  rules: ReadonlyArray<readonly [RegExp, TransactionDirection]>
): TransactionDirection | null {
  const normalized = normalize(rawValue);
  if (!normalized) return null;
  for (const [pattern, direction] of rules) {
    if (pattern.test(normalized)) return direction;
  }
  return null;
}

/** Rozpoznaje etykietę kierunku (Typ/Kierunek/Debit/Credit/income/expense...). */
export function matchDirectionValue(rawValue: string): TransactionDirection | null {
  return matchRules(rawValue, DIRECTION_VALUE_RULES);
}

/** Rozpoznaje kierunek na podstawie treści opisu transakcji. */
export function matchDescriptionDirection(description: string): TransactionDirection | null {
  return matchRules(description, DESCRIPTION_RULES);
}

/** Nagłówki kolumn wprost opisujących kierunek operacji. */
export function looksLikeDirectionColumn(header: string): boolean {
  const h = normalize(header).replace(/^#\s*/, "");
  return (
    /^(typ|kierunek|rodzaj|direction|type)( (operacji|transakcji))?$/.test(h) ||
    /^(cr|dr) ?\/ ?(cr|dr)$/.test(h) ||
    /^debit ?\/ ?credit$/.test(h)
  );
}

/** Nagłówki kolumn zawierających wyłącznie obciążenia (wydatki). */
export function looksLikeDebitColumn(header: string): boolean {
  const h = normalize(header).replace(/^#\s*/, "").trim();
  return /^(kwota )?(obciazenia|obciazenie|wydatki|debit|wyplaty)$/.test(h);
}

/** Nagłówki kolumn zawierających wyłącznie uznania (wpływy). */
export function looksLikeCreditColumn(header: string): boolean {
  const h = normalize(header).replace(/^#\s*/, "").trim();
  return /^(kwota )?(uznania|uznanie|wplywy|credit|wplaty)$/.test(h);
}

/**
 * Rozstrzyga kierunek transakcji w jawnej hierarchii reguł.
 *
 * Kolejność jest istotna: jawna kolumna kierunku bije znak kwoty, bo wiele
 * banków eksportuje same wartości dodatnie i trzyma kierunek w osobnej kolumnie.
 * Gdy żaden sygnał nie rozstrzyga, zwracamy confident:false, żeby UI mogło
 * pokazać wiersz do potwierdzenia — sam kierunek zostaje przy dotychczasowym
 * zachowaniu, ale przestaje być cichym domysłem.
 */
export function detectDirection(
  signals: DirectionSignals,
  context: DirectionContext
): DirectionDecision {
  const explicit = typeof signals.explicitDirection === "string" ? signals.explicitDirection : "";
  if (explicit.trim()) {
    const fromColumn = matchDirectionValue(explicit);
    if (fromColumn) {
      return { type: fromColumn, source: "direction-column", confident: true };
    }
  }

  if (signals.fromCreditColumn && !signals.fromDebitColumn) {
    return { type: "income", source: "debit-credit-columns", confident: true };
  }
  if (signals.fromDebitColumn && !signals.fromCreditColumn) {
    return { type: "expense", source: "debit-credit-columns", confident: true };
  }

  if (signals.amountNegative) {
    return { type: "expense", source: "amount-sign", confident: true };
  }

  if (context.hasNegativeAmounts) {
    return { type: "income", source: "amount-sign", confident: true };
  }

  const description = typeof signals.description === "string" ? signals.description : "";
  const fromDescription = matchDescriptionDirection(description);
  if (fromDescription) {
    return { type: fromDescription, source: "description", confident: false };
  }

  // Brak jakiegokolwiek sygnału. Zostajemy przy dotychczasowym rozstrzygnięciu
  // (dodatnia kwota → przychód), ale oznaczamy decyzję jako niepewną, żeby UI
  // mogło pokazać ją do potwierdzenia. Problemem był cichy domysł, nie sam kierunek.
  return { type: "income", source: "amount-sign", confident: false };
}
