import { AppLanguage, SupportedCurrency } from "../types";
export const parseAmount = (val: string): number => {
  if (!val) return 0;
  // strip spaces, currency symbols like PLN, zł, $, €
  let clean = val.replace(/[^0-9,\.\-]/g, "");
  
  // Find the last separator to treat it as decimal delimiter
  const commaIndex = clean.lastIndexOf(",");
  const dotIndex = clean.lastIndexOf(".");
  
  if (commaIndex > dotIndex) {
    // comma is decimal separator: replace dots (thousands) with empty, and comma with dot
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (dotIndex > commaIndex) {
    // dot is decimal separator: replace commas with empty
    clean = clean.replace(/,/g, "");
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};




export function cleanPolishChars(text: string): string {
  if (!text) return "";
  const map: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
  };
  return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, match => map[match] || match);
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
