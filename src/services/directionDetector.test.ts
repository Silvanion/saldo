import { describe, expect, it } from "vitest";
import {
  detectDirection,
  looksLikeCreditColumn,
  looksLikeDebitColumn,
  looksLikeDirectionColumn,
  matchDescriptionDirection,
  matchDirectionValue
} from "./directionDetector";

const withNegatives = { hasNegativeAmounts: true };
const withoutNegatives = { hasNegativeAmounts: false };

describe("detectDirection — hierarchia rozstrzygania kierunku", () => {
  it("1. jawna kolumna kierunku bije znak kwoty", () => {
    // Kwota dodatnia, ale kolumna mówi wprost "Obciążenie" — to wydatek.
    const decision = detectDirection(
      { explicitDirection: "Obciążenie", amountNegative: false },
      withNegatives
    );

    expect(decision).toEqual({
      type: "expense",
      source: "direction-column",
      confident: true
    });
  });

  it("2. rozpoznaje kolumnę kierunku z eksportu Saldo (round-trip)", () => {
    expect(detectDirection({ explicitDirection: "expense" }, withNegatives)).toMatchObject({
      type: "expense",
      source: "direction-column"
    });
    expect(detectDirection({ explicitDirection: "income", amountNegative: false }, withNegatives)).toMatchObject({
      type: "income",
      source: "direction-column"
    });
  });

  it("3. rozpoznaje polskie i angielskie etykiety kierunku", () => {
    expect(matchDirectionValue("Debit")).toBe("expense");
    expect(matchDirectionValue("Credit")).toBe("income");
    expect(matchDirectionValue("Wydatek")).toBe("expense");
    expect(matchDirectionValue("Wpływ")).toBe("income");
    expect(matchDirectionValue("Uznanie")).toBe("income");
    expect(matchDirectionValue("PRZELEW PRZYCHODZĄCY")).toBe("income");
    expect(matchDirectionValue("PRZELEW WYCHODZĄCY")).toBe("expense");
    expect(matchDirectionValue("Płatność kartą")).toBe("expense");
    expect(matchDirectionValue("CARD_PAYMENT")).toBe("expense");
    expect(matchDirectionValue("TOPUP")).toBe("income");
    expect(matchDirectionValue("TRANSFER")).toBeNull();
  });

  it("4. rozdzielone kolumny obciążenia/uznania rozstrzygają kierunek", () => {
    expect(detectDirection({ fromDebitColumn: true, amountNegative: false }, withNegatives)).toEqual({
      type: "expense",
      source: "debit-credit-columns",
      confident: true
    });
    expect(detectDirection({ fromCreditColumn: true, amountNegative: false }, withNegatives)).toEqual({
      type: "income",
      source: "debit-credit-columns",
      confident: true
    });
  });

  it("5. znak kwoty działa, gdy w pliku w ogóle są minusy", () => {
    expect(detectDirection({ amountNegative: true }, withNegatives)).toMatchObject({
      type: "expense",
      source: "amount-sign",
      confident: true
    });
    expect(detectDirection({ amountNegative: false }, withNegatives)).toMatchObject({
      type: "income",
      source: "amount-sign",
      confident: true
    });
  });

  it("6. plik bez minusów: znak nie jest dowodem, decyduje opis i pewność spada", () => {
    const decision = detectDirection(
      { amountNegative: false, description: "Wynagrodzenie za wrzesień" },
      withoutNegatives
    );

    expect(decision).toEqual({
      type: "income",
      source: "description",
      confident: false
    });
  });

  it("7. brak jakiegokolwiek sygnału jest oznaczony jako niepewny, nie cichy", () => {
    const decision = detectDirection({ amountNegative: false, description: "XYZ 123" }, withoutNegatives);

    expect(decision.type).toBe("income");
    expect(decision.confident).toBe(false);
  });

  it("8. heurystyka opisowa nie odwraca jednoznacznego znaku kwoty (zwrot to nie zakup)", () => {
    // "+200,00 Zwrot za zakupy" — opis sugeruje zakup, ale dodatnia kwota to wpływ.
    const decision = detectDirection(
      { amountNegative: false, description: "Zwrot za zakupy" },
      withNegatives
    );

    expect(decision).toMatchObject({ type: "income", source: "amount-sign" });
  });

  it("9. nie rozpoznaje kierunku z etykiety, której nie zna", () => {
    expect(matchDirectionValue("Karta")).toBeNull();
    expect(matchDirectionValue("")).toBeNull();
  });

  it("10. opis: rozpoznaje typowe wpływy i wydatki", () => {
    expect(matchDescriptionDirection("Prowizja za prowadzenie konta")).toBe("expense");
    expect(matchDescriptionDirection("Odsetki od lokaty")).toBe("income");
    expect(matchDescriptionDirection("Zakupy spożywcze")).toBe("expense");
    expect(matchDescriptionDirection("ZUS świadczenie za okres")).toBe("income");
    expect(matchDescriptionDirection("Brak charakterystycznych słów")).toBeNull();
  });

  it("11. rozpoznaje nagłówki kolumn kierunku i kolumn rozdzielonych", () => {
    expect(looksLikeDirectionColumn("Typ")).toBe(true);
    expect(looksLikeDirectionColumn("Typ transakcji")).toBe(true);
    expect(looksLikeDirectionColumn("Kierunek")).toBe(true);
    expect(looksLikeDirectionColumn("Odcienie")).toBe(false);
    expect(looksLikeDirectionColumn("Tytuł")).toBe(false);

    expect(looksLikeDebitColumn("Obciążenia")).toBe(true);
    expect(looksLikeDebitColumn("Kwota obciążenia")).toBe(true);
    expect(looksLikeDebitColumn("Kwota")).toBe(false);

    expect(looksLikeCreditColumn("Uznania")).toBe(true);
    expect(looksLikeCreditColumn("Wpływy")).toBe(true);
    expect(looksLikeCreditColumn("Waluta")).toBe(false);
  });
});
