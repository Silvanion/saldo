import { extractAmount, extractDate } from "./localParsers";

export interface ParsedInvoiceData {
  name: string;
  amount: number | null;
  dueDate: string | null;
  iban?: string;
}

const KNOWN_VENDORS = [
  "PGE Obrót", "PGE Dystrybucja", "PGE", "Tauron", "Enea", "Energa", "PGNiG",
  "Orange Polska", "Orange", "Play", "P4", "T-Mobile", "Plus", "Polkomtel",
  "UPC", "Vectra", "Netia", "Toya", "Multimedia Polska",
  "Spotify", "Netflix", "Allegro", "Amazon", "Apple", "Google",
  "Spółdzielnia Mieszkaniowa", "Wspólnota Mieszkaniowa", "Czynsz"
];

/**
 * Deterministyczny parser tekstu faktury, rachunku lub potwierdzenia przelewu.
 * Pozwala w ułamku sekundy uzupełnić dane płatności z wklejonego tekstu e-maila, PDF-a lub SMS-a,
 * bez konieczności korzystania z modeli wizyjnych AI czy wysyłania danych do chmury.
 */
export function parseInvoiceText(rawText: string, referenceDate?: string): ParsedInvoiceData {
  const text = (rawText || "").trim();
  if (!text) {
    return { name: "", amount: null, dueDate: null };
  }

  // 1. Ekstrakcja kwoty
  let amount: number | null = null;
  const amountPattern = /(?:do\s*zapłaty|do\s*zaplaty|razem(?:\s*brutto)?|suma|kwota(?:\s*do\s*zapłaty)?|wartość(?:\s*brutto)?|należność)\s*[:=]?\s*([0-9\s]+(?:[.,][0-9]{2}))/i;
  const amountMatch = text.match(amountPattern);

  if (amountMatch && amountMatch[1]) {
    const rawVal = amountMatch[1].replace(/\s/g, "").replace(",", ".");
    const parsed = parseFloat(rawVal);
    if (Number.isFinite(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  if (amount === null) {
    amount = extractAmount(text);
  }

  // 2. Ekstrakcja terminu płatności
  let dueDate: string | null = null;
  const dueDatePattern = /(?:termin(?:\s*płatności|\s*platnosci|\s*zapłaty)?|płatne\s*do|platne\s*do)\s*[:=]?\s*(\d{4}[.\-/]\d{2}[.\-/]\d{2}|\d{2}[.\-/]\d{2}[.\-/]\d{4})/i;
  const dateMatch = text.match(dueDatePattern);

  if (dateMatch && dateMatch[1]) {
    const rawDate = dateMatch[1].trim();
    if (/^\d{4}[.\-/]\d{2}[.\-/]\d{2}$/.test(rawDate)) {
      dueDate = rawDate.replace(/[./]/g, "-");
    } else if (/^\d{2}[.\-/]\d{2}[.\-/]\d{4}$/.test(rawDate)) {
      const parts = rawDate.split(/[.\-/]/);
      dueDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  if (!dueDate) {
    const fallbackDate = extractDate(text, referenceDate);
    if (fallbackDate && fallbackDate !== referenceDate) {
      dueDate = fallbackDate;
    }
  }

  // 3. Ekstrakcja numeru konta (IBAN)
  let iban: string | undefined = undefined;
  const ibanMatch = text.match(/(?:PL\s*)?(\d{2}[ \t]?\d{4}[ \t]?\d{4}[ \t]?\d{4}[ \t]?\d{4}[ \t]?\d{4}[ \t]?\d{4})/i);
  if (ibanMatch) {
    iban = ibanMatch[1].replace(/[\s\t]/g, "");
  }

  // 4. Ekstrakcja nazwy / wystawcy
  let name = "";
  for (const vendor of KNOWN_VENDORS) {
    const regex = new RegExp(`\\b${vendor}\\b`, "i");
    if (regex.test(text)) {
      name = vendor;
      break;
    }
  }

  if (!name) {
    const vendorPattern = /(?:sprzedawca|wystawca|odbiorca|dostawca|beneficjent)\s*[:=]?\s*([^\n\r]+)/i;
    const vMatch = text.match(vendorPattern);
    if (vMatch && vMatch[1]) {
      name = vMatch[1].trim().replace(/[;,]+$/, "");
    }
  }

  if (!name) {
    const invoicePattern = /(?:faktura(?:\s*vat)?|rachunek|nota)\s*(?:nr|numer)?\s*[:=]?\s*([^\n\r]+)/i;
    const invMatch = text.match(invoicePattern);
    if (invMatch && invMatch[1]) {
      name = `Faktura ${invMatch[1].trim()}`;
    }
  }

  if (!name) {
    const firstLine = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)[0] || "";
    name = firstLine.slice(0, 50).trim() || "Rachunek";
  }

  return {
    name,
    amount,
    dueDate,
    iban
  };
}
