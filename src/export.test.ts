import { describe, it, expect } from "vitest";
import { generateCsvContent } from "./utils";

describe("KROK 8G - Bezpieczny eksport CSV", () => {
  it("generuje poprawny CSV z polskimi znakami i ucieczkami", () => {
    const txs = [
      { id: "1", name: 'Zakupy "Biedronka"', amount: 150.50, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-20",
          currency: "PLN"
    },
      { id: "2", name: "Opłata, prowizja", amount: 10, category: "Opłaty", account: "Główne", type: "expense", isoDate: "2026-07-21",
          currency: "PLN"
    },
      { id: "3", name: "Opis z\nnową linią", amount: 10, category: "Opłaty", account: "Główne", type: "expense", isoDate: "2026-07-22",
          currency: "PLN"
    },
    ];
    
    const csv = generateCsvContent(txs as any);
    expect(csv.startsWith('\uFEFF')).toBe(true); // BOM
    expect(csv).toContain('"Zakupy ""Biedronka"""'); // escaped quotes
    expect(csv).toContain('"Opłata, prowizja"'); // escaped comma
    expect(csv).toContain('"Opis z\nnową linią"'); // escaped newline
  });
});
