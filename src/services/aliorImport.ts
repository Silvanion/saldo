// Alior Bank — eksport "Historia operacji" (CSV, separator ";").
// Kolumny: Data transakcji;Data księgowania;Nazwa nadawcy;Nazwa odbiorcy;Szczegóły transakcji;
// Kwota operacji;...;Numer rachunku nadawcy;Numer rachunku odbiorcy.
// Logika oparta na prawdziwym eksporcie, nie na dokumentacji banku — jeśli bank zmieni format,
// detectAliorLayout zwróci null i import wróci do zwykłego mapowania kolumn.

export interface AliorLayout {
  sender: number;
  recipient: number;
  details: number;
}

export interface ImportHint {
  /** credit-line: operacja pomocnicza na koncie limitu/kredytu — dubluje inny wiersz i zawyża sumy.
   *  own-transfer: ta sama osoba jako nadawca i odbiorca — przesunięcie własnych środków. */
  kind: "credit-line" | "own-transfer";
  reason: string;
}

const norm = (s: string) => s.trim().toLowerCase();

export function detectAliorLayout(headers: string[]): AliorLayout | null {
  const find = (label: string) => headers.findIndex((h) => norm(h) === label);
  const sender = find("nazwa nadawcy");
  const recipient = find("nazwa odbiorcy");
  const details = find("szczegóły transakcji");
  if (sender === -1 || recipient === -1 || details === -1) return null;
  return { sender, recipient, details };
}

/** Kontrahent to druga strona operacji: przy obciążeniu (minus) odbiorca, przy uznaniu nadawca.
 *  Gdy jej nie ma (opłaty, odsetki), opisem jest pole "Szczegóły transakcji". */
export function aliorName(row: string[], layout: AliorLayout, isNegative: boolean): string {
  const counterparty = (row[isNegative ? layout.recipient : layout.sender] || "").trim();
  return counterparty || (row[layout.details] || "").trim();
}

// NFD nie rozkłada "ł", a bank raz pisze "Pawłowski", raz "Pawlowski".
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/gi, "l")
    .toLowerCase()
    .trim();

function samePerson(a: string, b: string): boolean {
  const ta = fold(a).split(/\s+/).filter(Boolean);
  const tb = fold(b).split(/\s+/).filter(Boolean);
  if (ta.length < 2 || tb.length < 2) return false;
  // Imię i nazwisko wystarczą — drugie imię bywa w jednym zapisie, a w drugim nie.
  return ta[0] === tb[0] && ta[ta.length - 1] === tb[tb.length - 1];
}

export function aliorHintFromFields(sender: string, recipient: string, details: string): ImportHint | null {
  if (/^nr transakcji:/i.test(details.trim()) || /^spłata kredytu$/i.test(details.trim())) {
    return {
      kind: "credit-line",
      reason:
        "Operacja na koncie limitu/kredytu (zwykle 2–3 wiersze na jedno zdarzenie). Prawdopodobnie dubluje inną pozycję, dlatego nie zaznaczono jej domyślnie."
    };
  }
  if (sender.trim() && recipient.trim() && samePerson(sender, recipient)) {
    return {
      kind: "own-transfer",
      reason: "Nadawca i odbiorca to ta sama osoba — prawdopodobnie przelew między własnymi rachunkami, a nie prawdziwy przychód/wydatek."
    };
  }
  return null;
}

export function aliorImportHint(row: string[], layout: AliorLayout): ImportHint | null {
  return aliorHintFromFields(row[layout.sender] || "", row[layout.recipient] || "", row[layout.details] || "");
}

export interface AliorPdfRow {
  /** Data w formacie DD-MM-RRRR (jak w wyciągu). */
  date: string;
  /** Kwota ze znakiem; kwota w walucie rachunku jest w wyciągu identyczna, bierzemy pierwszą. */
  amount: number;
  name: string;
  raw: string;
  hint: ImportHint | null;
}

// Wiersz otwierający transakcję: dwie daty (transakcji i księgowania), potem Nadawca:/Odbiorca:.
const PDF_BLOCK_START = /^(\d{2}-\d{2}-\d{4})\s+\d{2}-\d{2}-\d{4}\s+(?=(?:Nadawca|Odbiorca|Numer rachunku (?:nadawcy|odbiorcy)):)/;
const PDF_NOISE = /^(DANE TRANSAKCJI|Data Data Szczegóły transakcji|transakcji księgowania|Niniejszy dokument|Dokument sporządzony|Strona \d+ z \d+)/;
// (?<!\d): bez tego w "…4000 1274 258,11 PLN" spacja zostałaby wzięta za separator tysięcy i
// wyszłoby 274 258,11 zamiast 258,11.
const PDF_AMOUNT = /(-\s*)?(?<!\d)(\d{1,3}(?:\s\d{3})+|\d+),(\d{2})\s*(?:PLN|EUR|USD|GBP)/;
const PDF_FIELD = /(Numer rachunku nadawcy|Numer rachunku odbiorcy|Nadawca|Odbiorca|Opis transakcji):/g;

/** Rozpoznaje blokowy układ PDF "Historia transakcji" Aliora. Zwraca null, gdy tekst do niego nie pasuje. */
export function parseAliorPdfText(text: string): AliorPdfRow[] | null {
  const blocks: string[][] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (PDF_BLOCK_START.test(line)) {
      blocks.push([line]);
    } else if (blocks.length && !PDF_NOISE.test(line)) {
      blocks[blocks.length - 1].push(line);
    }
  }
  if (blocks.length === 0) return null;

  const rows: AliorPdfRow[] = [];
  for (const block of blocks) {
    const dateMatch = block[0].match(PDF_BLOCK_START)!;
    const joined = block.join(" ").replace(/\s+/g, " ");
    const body = joined.slice(dateMatch[0].length);
    const amountMatch = body.match(PDF_AMOUNT);
    if (!amountMatch) continue;
    const value = Number(`${amountMatch[2].replace(/\s/g, "")}.${amountMatch[3]}`);
    const amount = amountMatch[1] ? -value : value;
    // Bez pierwszej pary kwot (w wyciągu: "Kwota" i "Kwota w walucie rachunku").
    const withoutAmounts = body.replace(new RegExp(PDF_AMOUNT.source, "g"), " ");

    const fields: Record<string, string> = {};
    const parts = withoutAmounts.split(PDF_FIELD);
    for (let i = 1; i < parts.length; i += 2) fields[parts[i]] = (parts[i + 1] || "").replace(/\s+/g, " ").trim();

    const sender = fields["Nadawca"] || "";
    const recipient = fields["Odbiorca"] || "";
    const details = fields["Opis transakcji"] || "";
    const name = (amount < 0 ? recipient : sender) || details;
    rows.push({
      date: dateMatch[1],
      amount,
      name,
      raw: joined.slice(0, 300),
      hint: aliorHintFromFields(sender, recipient, details)
    });
  }
  return rows.length > 0 ? rows : null;
}
