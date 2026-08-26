import { describe, it, expect } from "vitest";
import { parseAmountInput } from "./format";

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
