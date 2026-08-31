import { describe, it, expect } from "vitest";
import { parseAmountInput, getScheduledOverpaymentBadgeLabel } from "./format";

describe("parseAmountInput", () => {
  it("parsuje liczby z przecinkiem i kropką jako separator dziesiętny", () => {
    expect(parseAmountInput("120,50")).toBe(120.5);
    expect(parseAmountInput("120.50")).toBe(120.5);
    expect(parseAmountInput("1000")).toBe(1000);
  });

  it("obsługuje separator tysięcy niezależnie od użytego znaku dziesiętnego", () => {
    expect(parseAmountInput("1.234,56")).toBe(1234.56);
    expect(parseAmountInput("1,234.56")).toBe(1234.56);
  });

  it("obsługuje symbole waluty i spacje", () => {
    expect(parseAmountInput("120,50 zł")).toBe(120.5);
    expect(parseAmountInput(" 99 PLN")).toBe(99);
  });

  it("zwraca null dla pustego lub brakującego wejścia", () => {
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput(undefined)).toBeNull();
    expect(parseAmountInput(null)).toBeNull();
    expect(parseAmountInput("   ")).toBeNull();
  });

  it("zwraca null dla śmieci bez cyfr", () => {
    expect(parseAmountInput("abc")).toBeNull();
    expect(parseAmountInput("zł")).toBeNull();
  });

  /**
   * Regresja: isNaN(parseFloat(x)) nie łapie Infinity — isNaN(Infinity) === false.
   * "1e999" i długie ciągi cyfr przechodziły przez walidację formularzy niezauważone
   * (fuzzing znalazł 92 takie przypadki w silnikach finansowych).
   */
  it("odrzuca wartości nieskończone jako null, nie jako Infinity", () => {
    expect(parseAmountInput("1e999")).toBeNull();
    expect(parseAmountInput("9".repeat(400))).toBeNull();
    expect(parseAmountInput("-1e999")).toBeNull();
  });

  /**
   * Regresja: pierwsza wersja usuwała literę "e" razem z innymi śmieciami PRZED
   * sprawdzeniem Infinity — "1e999" stawało się cichym, błędnym "1999" zamiast
   * zostać odrzucone. Gorsze niż oryginalny błąd: Infinity było chociaż widoczne.
   */
  it("nie zamienia notacji wykładniczej w błędną skończoną liczbę", () => {
    expect(parseAmountInput("1e999")).not.toBe(1999);
    expect(parseAmountInput("5e3")).not.toBe(53);
  });

  it("nie odrzuca kodu waluty bez cyfry przy literze e/E", () => {
    expect(parseAmountInput("100 EUR")).toBe(100);
  });

  it("parsuje liczby ujemne (dla przypadków, gdzie wywołujący na to pozwala)", () => {
    expect(parseAmountInput("-50")).toBe(-50);
  });

  it("parsuje zero jawnie, nie myli go z brakiem wartości", () => {
    expect(parseAmountInput("0")).toBe(0);
  });
});

describe("getScheduledOverpaymentBadgeLabel", () => {
  it("zwraca null dla undefined", () => {
    expect(getScheduledOverpaymentBadgeLabel(undefined)).toBeNull();
  });

  it("zwraca null dla pustej tablicy", () => {
    expect(getScheduledOverpaymentBadgeLabel([])).toBeNull();
  });

  it("ignoruje nieprawidłowe wpisy i zwraca null, jeśli brak poprawnych", () => {
    expect(
      getScheduledOverpaymentBadgeLabel([
        { month: 0, amount: 1000 },
        { month: 1, amount: 0 },
        { month: 1, amount: -500 },
        { month: NaN, amount: 1000 },
        { month: 1, amount: Infinity },
      ])
    ).toBeNull();
  });

  it("poprawnie wyświetla dla 1 prawidłowej nadpłaty", () => {
    expect(
      getScheduledOverpaymentBadgeLabel([{ month: 3, amount: 5000 }])
    ).toBe("1 nadpłata · od mies. 3");
  });

  it("poprawnie wyświetla dla wielu prawidłowych nadpłat z najwcześniejszym miesiącem", () => {
    expect(
      getScheduledOverpaymentBadgeLabel([
        { month: 12, amount: 10000 },
        { month: 3, amount: 5000 },
        { month: 24, amount: 3000 },
      ])
    ).toBe("3 nadpłaty · od mies. 3");
  });

  it("obsługuje pluralizację w języku polskim", () => {
    // 1 -> nadpłata
    expect(
      getScheduledOverpaymentBadgeLabel([{ month: 1, amount: 100 }])
    ).toMatch(/1 nadpłata/);

    // 2-4 -> nadpłaty
    expect(
      getScheduledOverpaymentBadgeLabel(
        Array(3).fill({ month: 1, amount: 100 })
      )
    ).toMatch(/3 nadpłaty/);

    // 5+ -> nadpłat
    expect(
      getScheduledOverpaymentBadgeLabel(
        Array(5).fill({ month: 1, amount: 100 })
      )
    ).toMatch(/5 nadpłat/);

    // 22 -> nadpłaty
    expect(
      getScheduledOverpaymentBadgeLabel(
        Array(22).fill({ month: 1, amount: 100 })
      )
    ).toMatch(/22 nadpłaty/);
  });
});
