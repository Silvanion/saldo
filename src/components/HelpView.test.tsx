/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { HelpView } from "./HelpView";

describe("HelpView Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders header banner, quick summary cards, and FAQ", () => {
    render(<HelpView />);

    expect(screen.getByText("Centrum Pomocy")).toBeTruthy();
    expect(screen.getByText("Prywatność i Szyfrowanie")).toBeTruthy();
    expect(screen.getByText("Symulatory i Decyzje")).toBeTruthy();
    expect(screen.getByText("10 Banków & Kursy NBP")).toBeTruthy();
    expect(screen.getByText("Najczęściej zadawane pytania (FAQ)")).toBeTruthy();
  });

  it("filters articles by category pill", () => {
    render(<HelpView />);

    // Click "Wielowalutowość & NBP" category pill
    const nbpPill = screen.getByRole("button", { name: "Wielowalutowość & NBP" });
    fireEvent.click(nbpPill);

    expect(screen.getByText("Obsługa Walut Obcych i Kursy Średnie NBP")).toBeTruthy();
    // The quickstart section should be hidden when filtered
    expect(screen.queryByText("Szybki start — Pierwsze 3 kroki do opanowania budżetu")).toBeNull();
  });

  it("filters articles via interactive search query", () => {
    render(<HelpView />);

    const searchInput = screen.getByPlaceholderText(/Szukaj funkcji/i);
    fireEvent.change(searchInput, { target: { value: "Snowball" } });

    // Should find the analytics section containing snowball references
    expect(screen.queryByText("Inteligentne Analizy, Trendy Wielomiesięczne i Symulatory Decyzyjne")).toBeTruthy();

    // Clear search
    const clearBtn = screen.getByTitle("Wyczyść szukanie");
    fireEvent.click(clearBtn);

    expect((searchInput as HTMLInputElement).value).toBe("");
  });

  it("toggles accordion open/close to reveal visual mockups", () => {
    render(<HelpView />);

    // Find the multi-currency section button and click it to open
    const multiCurrBtn = screen.getByText("Obsługa Walut Obcych i Kursy Średnie NBP");
    fireEvent.click(multiCurrBtn);

    // Should reveal the mock currency visual content
    expect(screen.getByText("Przelicznik kursowy NBP (Tabela A)")).toBeTruthy();
    expect(screen.getByText("518,52 PLN")).toBeTruthy();
  });
});
