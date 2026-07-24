import { describe, it, expect } from "vitest";
import { estimateJsonSizeBytes, FIRESTORE_DOC_HARD_LIMIT_BYTES, FIRESTORE_DOC_WARNING_BYTES } from "./crypto";

describe("estimateJsonSizeBytes", () => {
  it("szacuje rozmiar małego obiektu na > 0 bajtów", () => {
    const size = estimateJsonSizeBytes({ a: 1 });
    expect(size).toBeGreaterThan(0);
    // {"a":1} is exactly 7 bytes
    expect(size).toBe(7);
  });

  it("zwraca poprawne wartości dla null (>= 4 bajty)", () => {
    const size = estimateJsonSizeBytes(null);
    expect(size).toBeGreaterThanOrEqual(4);
    // "null" is 4 bytes
    expect(size).toBe(4);
  });

  it("większy obiekt zwraca większy rozmiar", () => {
    const smallObj = { a: 1 };
    const largeObj = { a: 1, b: "Bardzo długi tekst z polskimi znakami ąćęłńóśźż", c: [1, 2, 3, 4, 5] };
    
    const smallSize = estimateJsonSizeBytes(smallObj);
    const largeSize = estimateJsonSizeBytes(largeObj);
    
    expect(largeSize).toBeGreaterThan(smallSize);
  });

  it("obsługuje błędne obiekty i zwraca 0 (np. zawierające cykle)", () => {
    const cyclicObj: any = {};
    cyclicObj.self = cyclicObj;
    
    const size = estimateJsonSizeBytes(cyclicObj);
    expect(size).toBe(0);
  });

  it("stałe limitów mają dokładnie wymaganą wartość", () => {
    expect(FIRESTORE_DOC_HARD_LIMIT_BYTES).toBe(1048576);
    expect(FIRESTORE_DOC_WARNING_BYTES).toBe(900000);
  });
});
