/**
 * Wyłapuje błąd modelu w rodzaju "7 200,00" -> 720 (zgubiona cyfra przy spacji jako
 * separatorze tysięcy). Skanuje surowy tekst źródłowy pod kątem wszystkich liczb, które
 * mogłyby być kwotą, i sprawdza, czy kwota zwrócona przez model odpowiada którejś z nich.
 */

const SPACE_CLASS = "[ \\u00A0]"; // spacja zwykła i twarda (NBSP) — obie pojawiają się w tekście kopiowanym z PDF

/** Usuwa daty (ISO i DD.MM.YYYY) oraz godziny, żeby nie zostały pomylone z liczbami kwot. */
function stripDates(text: string): string {
  return text
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4}\b/g, " ")
    .replace(/\b\d{2}:\d{2}(:\d{2})?\b/g, " "); // godziny, np. 14:22:07
}

/** Wyciąga wszystkie liczby wyglądające na kwotę: "1 850,00", "7200", "43.00", "89,90". */
export function findAllAmountsInText(text: string): number[] {
  const cleaned = stripDates(text);
  const numberPattern = new RegExp(`\\d{1,3}(?:${SPACE_CLASS}\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?`, "g");
  const stripSpaces = new RegExp(SPACE_CLASS, "g");
  const matches = cleaned.match(numberPattern) || [];

  const amounts: number[] = [];
  for (const raw of matches) {
    const normalized = raw.replace(stripSpaces, "").replace(",", ".");
    const value = parseFloat(normalized);
    if (Number.isFinite(value) && value > 0) amounts.push(value);
  }
  return amounts;
}

/**
 * Sprawdza, czy kwota zwrócona przez model faktycznie występuje w tekście źródłowym.
 * Tolerancja 0.01 na błędy zaokrągleń zmiennoprzecinkowych.
 */
export function isAmountConsistentWithSource(claimedAmount: number, sourceText: string): boolean {
  if (!Number.isFinite(claimedAmount)) return false;
  const found = findAllAmountsInText(sourceText);
  return found.some((a) => Math.abs(a - claimedAmount) < 0.01);
}
