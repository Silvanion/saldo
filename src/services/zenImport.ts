// Zen (ZEN.COM UAB) — wyciąg "PLN – Account Statement" (CSV z angielską preambułą i PDF).
// Oparte na prawdziwym eksporcie; przy zmianie formatu detectZenLayout zwróci null i import
// wróci do zwykłego mapowania kolumn.
import { samePerson, type ImportHint } from "./importHints";

export interface ZenLayout {
  type: number;
  description: number;
}

const norm = (s: string) => s.trim().toLowerCase();

export function detectZenLayout(headers: string[]): ZenLayout | null {
  const find = (label: string) => headers.findIndex((h) => norm(h) === label);
  const type = find("transaction type");
  const description = find("description");
  if (type === -1 || description === -1) return null;
  // "Settlement amount" odróżnia ten format od innych eksportów z kolumną "Description".
  if (find("settlement amount") === -1 || find("settlement currency") === -1) return null;
  return { type, description };
}

/** Właściciel konta z preambuły: wiersz "Account owner", a w następnym imię i nazwisko. */
export function zenOwnerFromPreamble(preambleRows: string[][]): string {
  const i = preambleRows.findIndex((r) => norm(r[0] || "") === "account owner");
  return i !== -1 ? (preambleRows[i + 1]?.[0] || "").trim() : "";
}

const isTransfer = (type: string) => /\b(incoming|outgoing) transfer\b/i.test(type);

/** Czytelna nazwa: bez końcówki karty, kodu kraju i (przy przelewach) adresu nadawcy. */
export function zenName(description: string, type: string): string {
  const clean = description.replace(/\s+/g, " ").trim();
  if (/zen account top-up/i.test(clean)) return "ZEN.COM UAB, ZEN account top-up";
  // W PDF do opisu wymiany dochodzą jeszcze kwota oryginalna i kurs z kolejnych linii.
  if (/^currency exchange transaction/i.test(clean)) return "Currency exchange transaction";
  if (isTransfer(type)) return clean.split(",")[0].trim() || clean;
  return clean
    .replace(/\s*CARD:.*$/i, "")
    .replace(/,\s*[A-Z]{3}$/, "")
    .trim();
}

export function zenImportHint(type: string, description: string, owner: string): ImportHint | null {
  const clean = description.replace(/\s+/g, " ").trim();
  if (/zen account top-up/i.test(clean)) {
    return {
      kind: "own-transfer",
      reason:
        "Zasilenie konta Zen Twoją kartą — to Twoje własne środki. W banku źródłowym widać to jako wydatek na ZEN.COM UAB, więc import obu wyciągów policzyłby to podwójnie."
    };
  }
  if (/^exchange money$/i.test(type.trim())) {
    return { kind: "own-transfer", reason: "Wymiana walut między Twoimi kieszeniami — nie jest przychodem ani wydatkiem." };
  }
  if (isTransfer(type) && owner && samePerson(clean.split(",")[0], owner)) {
    return {
      kind: "own-transfer",
      reason: "Nadawca to właściciel konta — prawdopodobnie przelew z Twojego innego rachunku, a nie prawdziwy przychód."
    };
  }
  return null;
}

export interface ZenPdfRow {
  /** Data księgowania, np. "3 Sep 2026" (w CSV jest ta sama data). */
  date: string;
  type: string;
  currency: string;
  /** Kwota rozliczeniowa (settlement) ze znakiem. */
  amount: number;
  balance: number;
  description: string;
  raw: string;
}

// "1 Sep 2026 Incoming transfer PLN 50.00 PLN 84.01" — data, typ, kwota rozliczeniowa, saldo.
const PDF_ROW = /^(\d{1,2} [A-Z][a-z]{2} \d{4})\s+(.+?)\s+([A-Z]{3})\s+(-?[\d,]+\.\d{2})\s+[A-Z]{3}\s+(-?[\d,]+\.\d{2})$/;
const PDF_NOISE = /^(UAB ZEN\.COM|Registered address|\d+ of \d+$|BOOKING DATE|TRANSACTION DATE|Transactions:)/i;
const PDF_DATE_PREFIX = /^\d{1,2} [A-Z][a-z]{2} \d{4}\s+/;

const money = (s: string) => Number(s.replace(/,/g, ""));

export function zenOwnerFromText(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const i = lines.findIndex((l) => /^account owner$/i.test(l));
  return i !== -1 ? lines[i + 1] || "" : "";
}

/** Rozpoznaje PDF "Account Statement" Zen. Zwraca null, gdy tekst do niego nie pasuje. */
export function parseZenPdfText(text: string): ZenPdfRow[] | null {
  if (!/account statement/i.test(text)) return null;
  const blocks: { head: RegExpMatchArray; rest: string[] }[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const head = line.match(PDF_ROW);
    if (head) {
      blocks.push({ head, rest: [] });
    } else if (blocks.length && !PDF_NOISE.test(line)) {
      blocks[blocks.length - 1].rest.push(line);
    }
  }
  if (blocks.length === 0) return null;

  return blocks.map(({ head, rest }) => {
    // Pierwsza linia opisu zaczyna się datą transakcji — ta różni się od daty księgowania.
    const description = rest.join(" ").replace(PDF_DATE_PREFIX, "").replace(/\s+/g, " ").trim();
    return {
      date: head[1],
      type: head[2].trim(),
      currency: head[3],
      amount: money(head[4]),
      balance: money(head[5]),
      description,
      raw: `${head[0]} ${description}`.slice(0, 300)
    };
  });
}
