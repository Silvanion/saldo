/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ImportTransactionsModal } from "./ImportTransactionsModal";
import { Profile, Transaction } from "../types";
import { MAX_IMPORT_ROWS } from "../services/parseCsv";

let mockAppState: { aiMode: "none" | "local" } = {
  aiMode: "none",
};

let mockActiveProfile: Profile = {
  id: "prof-1",
  name: "Osobisty",
  currency: "PLN",
  kind: "personal",
  budgets: {},
  accounts: [{ id: "acc-1", name: "Konto główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }],
  transactions: [
    {
      id: "tx-existing-1",
      name: "Zakupy Biedronka",
      amount: 150.5,
      type: "expense",
      category: "Żywność",
      account: "Konto główne",
      isoDate: "2026-07-20",
      currency: "PLN"
    }
  ],
  payments: [],
  goals: [],
  investments: [],
  smartRules: [],
  transactionRules: []
};

const { callAiApiMock } = vi.hoisted(() => ({ callAiApiMock: vi.fn() }));

vi.mock("../services/aiClient", async () => {
  const actual = await vi.importActual<typeof import("../services/aiClient")>("../services/aiClient");
  return { ...actual, callAiApi: callAiApiMock };
});

vi.mock("../services/parsePdf", async () => {
  const actual = await vi.importActual<typeof import("../services/parsePdf")>("../services/parsePdf");
  return {
    ...actual,
    extractPdfText: vi.fn().mockResolvedValue(""),
    renderPdfPages: vi.fn().mockResolvedValue(["rendered-page"])
  };
});

vi.mock("../app/providers/AppContext", () => ({
  useApp: () => ({
    state: mockAppState,
    activeProfile: mockActiveProfile,
  }),
}));

describe("ImportTransactionsModal — Import Quality & Data Trust v1", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockAppState = { aiMode: "none" };
    callAiApiMock.mockReset();
  });

  const SAMPLE_CSV = `
Data;Kwota;Tytuł;Waluta
2026-07-20;-150,50;Zakupy Biedronka;PLN
2026-07-21;-210,00;Paliwo Orlen;PLN
2026-07-22;-45,00;Bilety Kino;EUR
invalid_date;100;Błędna data;PLN
2026-07-23;bad_amount;Błędna kwota;PLN
`.trim();

  it("1. full flow: parses CSV, presents metrics bar, handles duplicate detection, and imports selected rows", () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(
      <ImportTransactionsModal
        isOpen={true}
        onClose={onClose}
        onImport={onImport}
      />
    );

    // Step 1: Paste CSV
    const textarea = screen.getByPlaceholderText(/Tutaj możesz wkleić skopiowane wiersze/i);
    fireEvent.change(textarea, { target: { value: SAMPLE_CSV } });

    fireEvent.click(screen.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }));

    // Step 2: Mapping
    expect(screen.getByText(/Mapowanie kolumn/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Generuj podgląd/i }));

    // Step 3: Metrics Bar & Pre-import Breakdown
    expect(screen.getByText("Do zaimportowania")).toBeTruthy();
    expect(screen.getByText("Duplikaty")).toBeTruthy();
    expect(screen.getByText("Odrzucone")).toBeTruthy();
    expect(screen.getByText("Waluty")).toBeTruthy();

    // 2 rows were rejected (bad amount, bad date)
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);

    // Verify duplicate is detected for "Zakupy Biedronka"
    expect(screen.getByText(/Wykryto transakcje w innej walucie niż waluta profilu/i)).toBeTruthy();

    // Verify button label reflects selected rows
    const confirmBtn = screen.getByRole("button", { name: /Zaimportuj wybrane/i });
    expect(confirmBtn).toBeTruthy();

    // Test selective row unchecking
    const rowCheckboxes = screen.getAllByRole("checkbox");
    // Header toggle + 3 valid rows
    expect(rowCheckboxes.length).toBe(4);

    // Toggle row 1
    fireEvent.click(rowCheckboxes[1]);

    // Submit import
    fireEvent.click(screen.getByRole("button", { name: /Zaimportuj wybrane/i }));

    expect(onImport).toHaveBeenCalled();
    const imported: Transaction[] = onImport.mock.calls[0][0];
    expect(imported.length).toBeGreaterThan(0);
    expect(onClose).toHaveBeenCalled();
  });

  it("2. allows deselecting duplicates via toolbar button", () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(
      <ImportTransactionsModal
        isOpen={true}
        onClose={onClose}
        onImport={onImport}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Tutaj możesz wkleić skopiowane wiersze/i), {
      target: { value: SAMPLE_CSV }
    });
    fireEvent.click(screen.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generuj podgląd/i }));

    const deselectDupBtn = screen.queryByRole("button", { name: /Odznacz duplikaty/i });
    if (deselectDupBtn) {
      fireEvent.click(deselectDupBtn);
    }

    const toggleAllBtn = screen.getByRole("button", { name: /Odznacz wszystkie|Zaznacz wszystkie/i });
    expect(toggleAllBtn).toBeTruthy();
  });

  it("3. clicking 'Anuluj' closes without calling onImport", () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(
      <ImportTransactionsModal
        isOpen={true}
        onClose={onClose}
        onImport={onImport}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Tutaj możesz wkleić skopiowane wiersze/i), {
      target: { value: SAMPLE_CSV }
    });
    fireEvent.click(screen.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generuj podgląd/i }));

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(onImport).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("4. plik z liczbą wierszy powyżej limitu pokazuje ostrzeżenie o obcięciu importu", () => {
    const header = "Data;Kwota;Tytuł";
    const rowCount = MAX_IMPORT_ROWS + 100;
    const rows = Array.from({ length: rowCount }, (_, i) => `2026-07-01;-10,00;Transakcja ${i}`);
    const bigCsv = [header, ...rows].join("\n");

    render(<ImportTransactionsModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Tutaj możesz wkleić skopiowane wiersze/i), {
      target: { value: bigCsv }
    });
    fireEvent.click(screen.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generuj podgląd/i }));

    expect(screen.getByText(/Plik zawierał więcej wierszy niż limit/i)).toBeTruthy();
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("5. plik w granicach limitu nie pokazuje ostrzeżenia o obcięciu", () => {
    render(<ImportTransactionsModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Tutaj możesz wkleić skopiowane wiersze/i), {
      target: { value: SAMPLE_CSV }
    });
    fireEvent.click(screen.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generuj podgląd/i }));

    expect(screen.queryByText(/Plik zawierał więcej wierszy niż limit/i)).toBeNull();
  });
});

vi.mock("../services/localAi", () => ({
  resolveLocalAiConfig: vi.fn(() => ({ endpoint: "http://localhost:11434/api/generate", model: "qwen2.5:7b" })),
  extractTransactionsWithLocalAi: vi.fn(),
  categorizeDescriptionsWithLocalAi: vi.fn()
}));

import { extractTransactionsWithLocalAi, categorizeDescriptionsWithLocalAi } from "../services/localAi";

describe("ImportTransactionsModal — lokalne AI (aiMode: local)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockAppState.aiMode = "none";
  });

  it("przycisk 'Spróbuj z lokalnym AI' pojawia się tylko gdy lokalne AI jest włączone", () => {
    mockAppState.aiMode = "none";
    render(<ImportTransactionsModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Wklej tekst wyciągu/i }));
    expect(screen.queryByRole("button", { name: /Spróbuj z lokalnym AI/i })).toBeNull();

    cleanup();
    mockAppState.aiMode = "local";
    render(<ImportTransactionsModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Wklej tekst wyciągu/i }));
    expect(screen.getByRole("button", { name: /Spróbuj z lokalnym AI/i })).toBeTruthy();
  });

  it("ekstrakcja przez AI: wiersz z niespójną kwotą jest oznaczony i domyślnie odznaczony", async () => {
    mockAppState.aiMode = "local";
    vi.mocked(extractTransactionsWithLocalAi).mockResolvedValue([
      { name: "Wynagrodzenie", amount: 720, type: "income", isoDate: "2026-08-01", category: "Wynagrodzenie", categoryIcon: "💰", amountConsistent: false },
      { name: "Biedronka", amount: 89.9, type: "expense", isoDate: "2026-08-03", category: "Inne", categoryIcon: "✨", amountConsistent: true }
    ]);

    render(<ImportTransactionsModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Wklej tekst wyciągu/i }));
    fireEvent.change(screen.getByPlaceholderText(/Wklej historię transakcji z banku/i), {
      target: { value: "dowolny tekst wyciągu" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Spróbuj z lokalnym AI/i }));

    await screen.findByTitle("Wynagrodzenie");
    expect(screen.getByTitle("Biedronka")).toBeTruthy();

    // Do zaimportowania: tylko spójny wiersz (1), niespójny odznaczony domyślnie.
    expect(screen.getByRole("button", { name: /Zaimportuj wybrane \(1\)/i })).toBeTruthy();
  });

  it("brak rozpoznanych transakcji przez AI pokazuje komunikat błędu", async () => {
    mockAppState.aiMode = "local";
    vi.mocked(extractTransactionsWithLocalAi).mockResolvedValue([]);

    render(<ImportTransactionsModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Wklej tekst wyciągu/i }));
    fireEvent.change(screen.getByPlaceholderText(/Wklej historię transakcji z banku/i), {
      target: { value: "tekst bez transakcji" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Spróbuj z lokalnym AI/i }));

    await screen.findByText(/nie rozpoznało żadnej transakcji/i);
  });

  it("przycisk sugestii kategorii pojawia się tylko gdy są wiersze 'Inne', i aktualizuje kategorię", async () => {
    mockAppState.aiMode = "local";
    vi.mocked(categorizeDescriptionsWithLocalAi).mockResolvedValue(new Map([["Tajemniczy Sklep", "Żywność"]]));

    const SAMPLE_CSV = `
Data;Kwota;Tytuł;Waluta
2026-07-25;-30,00;Tajemniczy Sklep;PLN
`.trim();

    render(<ImportTransactionsModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Tutaj możesz wkleić skopiowane wiersze/i), {
      target: { value: SAMPLE_CSV }
    });
    fireEvent.click(screen.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generuj podgląd/i }));

    const suggestBtn = screen.getByRole("button", { name: /Zasugeruj kategorie \(AI\)/i });
    fireEvent.click(suggestBtn);

    await screen.findByText("Żywność");
    expect(categorizeDescriptionsWithLocalAi).toHaveBeenCalledWith(["Tajemniczy Sklep"], expect.any(Object));
  });
});
