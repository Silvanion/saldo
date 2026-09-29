// Wspólne dla importerów konkretnych banków (Alior, Zen, ...).

export interface ImportHint {
  /** credit-line: operacja pomocnicza na koncie limitu/kredytu — dubluje inny wiersz i zawyża sumy.
   *  own-transfer: przesunięcie własnych środków (przelew między własnymi rachunkami, zasilenie
   *  kartą, wymiana walut) — w drugim banku widać je jako wydatek lub wpływ, więc import obu
   *  wyciągów policzyłby je podwójnie. */
  kind: "credit-line" | "own-transfer";
  reason: string;
}

// NFD nie rozkłada "ł", a bank raz pisze "Pawłowski", raz "Pawlowski".
export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/gi, "l")
    .toLowerCase()
    .trim();

export function samePerson(a: string, b: string): boolean {
  const ta = fold(a).split(/\s+/).filter(Boolean);
  const tb = fold(b).split(/\s+/).filter(Boolean);
  if (ta.length < 2 || tb.length < 2) return false;
  // Imię i nazwisko wystarczą — drugie imię bywa w jednym zapisie, a w drugim nie.
  return ta[0] === tb[0] && ta[ta.length - 1] === tb[tb.length - 1];
}
