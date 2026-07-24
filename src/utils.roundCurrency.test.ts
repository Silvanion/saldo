import { describe, it, expect } from "vitest";
import { roundCurrency } from "./utils";

describe("roundCurrency", () => {
  it("fixes IEEE 754 precision: 0.1 + 0.2 === 0.3", () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });

  it("rounds 99.99 / 2 (49.995) to 50", () => {
    expect(roundCurrency(99.99 / 2)).toBe(50);
  });

  it("preserves integers: 10 === 10", () => {
    expect(roundCurrency(10)).toBe(10);
  });

  it("returns 0 for NaN", () => {
    expect(roundCurrency(NaN)).toBe(0);
  });

  it("returns 0 for Infinity", () => {
    expect(roundCurrency(Infinity)).toBe(0);
  });

  it("handles negative edge case: -5.005 rounds to -5", () => {
    // Math.round((-5.005 + Number.EPSILON) * 100) / 100
    // = Math.round(-500.4999...) / 100 = -500 / 100 = -5
    expect(roundCurrency(-5.005)).toBe(-5);
  });
});
