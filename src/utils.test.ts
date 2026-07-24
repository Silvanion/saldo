import { describe, it, expect } from "vitest";
import { addMonthsClamped, parseAmount, hashPin, getLocalDateIso } from "./utils";

describe("Utils tests", () => {
  
  describe("getLocalDateIso", () => {
    it("should return the local date correctly formatted", () => {
      // Mocking a local date
      const testDate = new Date(2023, 5, 15, 23, 59, 59); // June 15, 2023 local time
      expect(getLocalDateIso(testDate)).toBe("2023-06-15");
    });
  });

  describe("addMonthsClamped", () => {
    it("should add months normally", () => {
      expect(addMonthsClamped("2023-01-15", 1)).toBe("2023-02-15");
    });
    
    it("should clamp 31st of Jan to 28th of Feb", () => {
      expect(addMonthsClamped("2023-01-31", 1)).toBe("2023-02-28");
    });

    it("should clamp 31st of Jan to 29th of Feb in leap year", () => {
      expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29");
    });
    
    it("should clamp 31st of Oct to 30th of Nov", () => {
      expect(addMonthsClamped("2023-10-31", 1)).toBe("2023-11-30");
    });
  });

  describe("parseAmount", () => {
    it("should parse 1 234,56", () => {
      expect(parseAmount("1 234,56")).toBe(1234.56);
    });

    it("should parse 1,234.56", () => {
      expect(parseAmount("1,234.56")).toBe(1234.56);
    });

    it("should parse 1234", () => {
      expect(parseAmount("1234")).toBe(1234);
    });

    it("should return 0 on invalid input", () => {
      expect(parseAmount("abc")).toBe(0);
    });
  });

  describe("hashPin", () => {
    it("should produce a stable hex hash", async () => {
      const hash = await hashPin("1234", "salt123");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
