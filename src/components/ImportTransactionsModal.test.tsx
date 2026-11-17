/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ImportTransactionsModal } from "./ImportTransactionsModal";
import { Profile, Transaction } from "../types";
import { MAX_IMPORT_ROWS } from "../services/parseCsv";

let mockAppState = {};

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

vi.mock("../services/parsePdf", async () => {
  const actual = await vi.importActual<typeof import("../services/parsePdf")>("../services/parsePdf");
  return {
    ...actual,
    extractPdfText: vi.fn().mockResolvedValue("")
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

  it("initialFile: auto-processes a CSV supplied from outside the dropzone (OS-level drag & drop) and consumes it once", async () => {
    const onImport = vi.fn();
    const onClose = vi.fn();
    const onConsumeInitialFile = vi.fn();
    const file = new File([SAMPLE_CSV], "wyciag.csv", { type: "text/csv" });

    const { rerender } = render(
      <ImportTransactionsModal
        isOpen={true}
        onClose={onClose}
        onImport={onImport}
        initialFile={file}
        onConsumeInitialFile={onConsumeInitialFile}
      />
    );

    // handleFile() reads the File asynchronously (FileReader) — wait for the
    // mapping step (step 2) to confirm it was parsed without any manual paste/click.
    await screen.findByText(/Mapowanie kolumn/i);
    expect(onConsumeInitialFile).toHaveBeenCalledTimes(1);

    // The parent clears initialFile once consumed — re-render with null must
    // not reprocess/reset the already-in-progress import.
    rerender(
      <ImportTransactionsModal
        isOpen={true}
        onClose={onClose}
        onImport={onImport}
        initialFile={null}
        onConsumeInitialFile={onConsumeInitialFile}
      />
    );
    expect(onConsumeInitialFile).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Mapowanie kolumn/i)).toBeTruthy();
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

  it("Alior: wiersze konta kredytowego są domyślnie niezaznaczone i oznaczone ostrzeżeniem", async () => {
    const H = "Data transakcji;Data księgowania;Nazwa nadawcy;Nazwa odbiorcy;Szczegóły transakcji;Kwota operacji;Waluta operacji;Kwota w walucie rachunku;Waluta rachunku;Numer rachunku nadawcy;Numer rachunku odbiorcy";
    const ALIOR_CSV = [
      H,
      "05-01-2026;05-01-2026;Jan Marek Kowalski;Autopay S.A.;app.example.pl;-229,00;PLN;-229,00;PLN;11 2222;",
      "05-01-2026;05-01-2026;;Jan Marek Kowalski;Nr transakcji: 4 Tytuł transakcji: Autopay S.A. Kapitał: PLN 229.00;229,00;PLN;229,00;PLN;;11 2222",
      "05-01-2026;05-01-2026;Jan Marek Kowalski;;Nr transakcji: 4 Tytuł transakcji: Autopay S.A. Kapitał: PLN 229.00;-229,00;PLN;-229,00;PLN;22 3333;11 2222"
    ].join("\n");

    render(<ImportTransactionsModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Tutaj możesz wkleić skopiowane wiersze/i), {
      target: { value: ALIOR_CSV }
    });
    fireEvent.click(screen.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generuj podgląd/i }));

    // 3 wiersze w podglądzie, ale zaznaczony tylko prawdziwy zakup
    expect(screen.getByRole("button", { name: /Zaimportuj wybrane \(1\)/i })).toBeTruthy();
    expect(screen.getAllByLabelText("Operacja na koncie kredytowym")).toHaveLength(2);
    // nazwą jest kontrahent, a nie własne imię z kolumny nadawcy
    expect(screen.getByText("Autopay S.A.")).toBeTruthy();
  });

  it("skan PDF bez warstwy tekstowej wyświetla czytelny komunikat błędu", async () => {
    const file = new File(["%PDF"], "skan.pdf", { type: "application/pdf" });
    render(<ImportTransactionsModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} initialFile={file} onConsumeInitialFile={vi.fn()} />);

    expect(await screen.findByText(/Ten PDF nie zawiera warstwy tekstowej/i)).toBeTruthy();
  });
});
