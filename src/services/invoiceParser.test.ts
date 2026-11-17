import { describe, it, expect } from "vitest";
import { parseInvoiceText } from "./invoiceParser";

describe("invoiceParser — Deterministic Bill & Invoice Parsing", () => {
  it("wyciąga dane z typowej faktury za prąd (PGE)", () => {
    const text = `
      PGE Obrót S.A.
      Faktura VAT nr: 123/2026
      Kwota do zapłaty: 245,80 zł
      Termin płatności: 2026-05-15
      Rachunek bankowy: PL 12 1020 1026 0000 1234 5678 9012
    `;

    const result = parseInvoiceText(text);
    expect(result.name).toBe("PGE Obrót");
    expect(result.amount).toBe(245.8);
    expect(result.dueDate).toBe("2026-05-15");
    expect(result.iban).toBe("12102010260000123456789012");
  });

  it("wyciąga dane z powiadomienia e-mail od operatora telekomunikacyjnego (Orange)", () => {
    const text = `
      Cześć! Twoja faktura za usługi Orange jest gotowa.
      Do zapłaty: 89,90 PLN
      Płatne do: 28.04.2026
    `;

    const result = parseInvoiceText(text);
    expect(result.name).toBe("Orange");
    expect(result.amount).toBe(89.9);
    expect(result.dueDate).toBe("2026-04-28");
  });

  it("radzi sobie z prostym SMS-em o płatności", () => {
    const text = "Spółdzielnia Mieszkaniowa: czynsz za maj 650,00 zł termin 2026-05-10";
    const result = parseInvoiceText(text);
    expect(result.name).toBe("Spółdzielnia Mieszkaniowa");
    expect(result.amount).toBe(650);
    expect(result.dueDate).toBe("2026-05-10");
  });

  it("zwraca puste pola dla pustego tekstu", () => {
    const result = parseInvoiceText("");
    expect(result.name).toBe("");
    expect(result.amount).toBeNull();
    expect(result.dueDate).toBeNull();
  });
});
