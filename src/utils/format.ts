import { AppLanguage, SupportedCurrency } from "../types";
import { cleanPolishChars } from "./text";

export { cleanPolishChars };

/**
 * Parsuje kwotę wpisaną przez użytkownika (przecinek lub kropka jako separator
 * dziesiętny, opcjonalne symbole waluty/spacje). Zwraca null dla pustego pola,
 * śmieci lub wartości nieskończonej — zwykłe `isNaN(parseFloat(...))` NIE łapie
 * Infinity (isNaN(Infinity) === false), więc "1e999" albo ciąg samych cyfr
 * przechodził wcześniej przez walidację formularzy niezauważony.
 * Rozstrzyganie >0 / >=0 / ujemne dozwolone zostaje po stronie wywołującego —
 * to tylko parsowanie, nie reguła biznesowa.
 */
export function parseAmountInput(raw: string | undefined | null): number | null {
  if (!raw) return null;
  // Cyfra-e-cyfra to notacja wykładnicza (1e999 = Infinity) — nikt tak ręcznie nie
  // wpisuje kwoty. Odrzucamy PRZED usunięciem symboli walut, bo naiwne wycięcie liter
  // zamieniłoby "1e999" po cichu w błędne "1999" zamiast to odrzucić. Dopasowanie
  // wymaga cyfry po obu stronach "e", żeby nie odrzucać np. "100 EUR".
  if (/\d[eE][-+]?\d/.test(raw)) return null;

  // usuń spacje, symbole walut itp., zostaw cyfry, separator dziesiętny i minus
  let clean = raw.replace(/[^0-9,.\-]/g, "");
  if (!clean) return null;

  // ostatni separator w ciągu decyduje, który jest dziesiętny (obsługuje "1.234,56" i "1,234.56")
  const commaIndex = clean.lastIndexOf(",");
  const dotIndex = clean.lastIndexOf(".");
  if (commaIndex > dotIndex) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (dotIndex > commaIndex) {
    clean = clean.replace(/,/g, "");
  }

  const num = parseFloat(clean);
  return Number.isFinite(num) ? num : null;
}




export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function resolveCurrency(
  itemCurrency?: SupportedCurrency,
  profileCurrency?: SupportedCurrency,
  appCurrency?: SupportedCurrency
): SupportedCurrency {
  return itemCurrency ?? profileCurrency ?? appCurrency ?? "PLN";
}

export function formatMoney(value: number, currency: string) {
  // Map currency to appropriate locale for formatting (thousands separator, decimal point)
  const localeMap: Record<string, string> = {
    "PLN": "pl-PL",
    "EUR": "de-DE", // Europe-style formatting
    "USD": "en-US",
    "GBP": "en-GB"
  };
  const locale = localeMap[currency] || "pl-PL";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Zwraca czytelną etykietę badge'a dla nadpłat jednorazowych.
 * Zwraca null, jeśli brakuje prawidłowych zdarzeń.
 */
export function getScheduledOverpaymentBadgeLabel(
  oneTimeOverpayments?: { month: number; amount: number }[]
): string | null {
  if (!oneTimeOverpayments || !Array.isArray(oneTimeOverpayments) || oneTimeOverpayments.length === 0) {
    return null;
  }

  const validEvents = oneTimeOverpayments.filter(
    (e) =>
      e &&
      Number.isFinite(e.month) &&
      e.month >= 1 &&
      Number.isFinite(e.amount) &&
      e.amount > 0
  );

  if (validEvents.length === 0) {
    return null;
  }

  const count = validEvents.length;

  let plural = "nadpłat";
  if (count === 1) {
    plural = "nadpłata";
  } else {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      plural = "nadpłaty";
    }
  }

  const earliestMonth = Math.min(...validEvents.map((e) => e.month));
  
  return `${count} ${plural} · od mies. ${earliestMonth}`;
}
