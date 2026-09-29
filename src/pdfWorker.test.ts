// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";
import { loadPdfjs } from "./services/parsePdf";

// Regresja: w przeglądarce pdf.js 6 bez workerSrc kończył każdy import PDF błędem
// 'No "GlobalWorkerOptions.workerSrc" specified'. Testy w Node tego nie widziały,
// bo tam pdf.js sam używa zastępczego workera.
describe("loadPdfjs", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ustawia workerSrc, gdy środowisko ma Worker (przeglądarka/Electron)", async () => {
    vi.stubGlobal("Worker", class {});
    const pdfjs = await loadPdfjs();
    expect(typeof pdfjs.GlobalWorkerOptions.workerSrc).toBe("string");
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toMatch(/pdf\.worker/);
  });
});
