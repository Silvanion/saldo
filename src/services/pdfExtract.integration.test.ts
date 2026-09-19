import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { extractPdfText, parsePdfTransactions } from "./parsePdf";

/**
 * Test integracyjny: prawdziwy plik PDF przechodzi przez extractPdfText.
 * Poprzednio wszystkie fragmenty strony były sklejane spacją w jeden ciąg, więc
 * z całej strony powstawała JEDNA transakcja o nazwie zawierającej resztę wyciągu.
 * Testy jednostkowe tego nie łapały, bo podawały tekst z ręcznie wstawionymi \n.
 */
async function buildPdfFile(lines: string[]): Promise<File> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFontSize(10);
  lines.forEach((line, index) => doc.text(line, 14, 20 + index * 6));
  const buffer = doc.output("arraybuffer");
  return new File([buffer], "wyciag.pdf", { type: "application/pdf" });
}

const options = {
  currency: "PLN" as const,
  account: "Konto główne",
  rules: []
};

describe("Odczyt tekstu z prawdziwego PDF", () => {
  it("1. wiele operacji na jednej stronie daje wiele transakcji, nie jedną", async () => {
    const file = await buildPdfFile([
      "2026-09-11 PIEKARNIA PRZYKLADOWA -14,97 PLN",
      "2026-09-10 PRZELEW NA CELE -6,20 PLN",
      "2026-09-08 OSOBA TESTOWA 30,00 PLN"
    ]);

    const text = await extractPdfText(file);
    const result = parsePdfTransactions(text, options);

    expect(result.transactions).toHaveLength(3);
    expect(result.transactions.map((t) => [t.amount, t.type])).toEqual([
      [14.97, "expense"],
      [6.2, "expense"],
      [30, "income"]
    ]);
  });

  it("2. każdy wiersz zachowuje własną nazwę i datę", async () => {
    const file = await buildPdfFile([
      "2026-09-11 PIEKARNIA PRZYKLADOWA -14,97 PLN",
      "2026-09-10 PRZELEW NA CELE -6,20 PLN"
    ]);

    const text = await extractPdfText(file);
    const result = parsePdfTransactions(text, options);

    expect(result.transactions[0]).toMatchObject({
      name: "PIEKARNIA PRZYKLADOWA",
      isoDate: "2026-09-11"
    });
    expect(result.transactions[1]).toMatchObject({
      name: "PRZELEW NA CELE",
      isoDate: "2026-09-10"
    });
  });

  it("3. suma kwot zgadza się z treścią wyciągu (brak gubienia wierszy)", async () => {
    const file = await buildPdfFile([
      "2026-09-01 Sklep A -100,00 PLN",
      "2026-09-02 Sklep B -200,00 PLN",
      "2026-09-03 Wplata 500,00 PLN"
    ]);

    const text = await extractPdfText(file);
    const result = parsePdfTransactions(text, options);

    const totals = result.transactions.reduce(
      (acc, t) => {
        acc[t.type] += t.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );

    expect(totals).toEqual({ income: 500, expense: 300 });
  });
});
