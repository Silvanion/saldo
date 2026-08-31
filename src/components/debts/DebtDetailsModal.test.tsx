// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DebtDetailsModal } from "./DebtDetailsModal";
import { DebtItem } from "../../types";

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const mockAmortizingDebt: DebtItem = {
  id: "test-debt-1",
  name: "Kredyt Gotówkowy",
  institution: "Bank X",
  type: "cash_loan",
  balance: 10000,
  interestRate: 10,
  monthlyPayment: 1000,
  status: "active",
  currency: "PLN",
  createdAt: "2023-01-01"
};

const mockNonAmortizingDebt: DebtItem = {
  id: "test-debt-2",
  name: "Kredyt bez spłaty kapitału",
  institution: "Bank Y",
  type: "cash_loan",
  balance: 10000,
  interestRate: 12,
  monthlyPayment: 50, // interest alone is 100
  status: "active",
  currency: "PLN",
  createdAt: "2023-01-01"
};

describe("DebtDetailsModal — Koszt pozostałej spłaty", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderuje rozbicie kosztów dla długu amortyzowanego", () => {
    render(
      <DebtDetailsModal
        isOpen={true}
        onClose={() => {}}
        debt={mockAmortizingDebt}
      />
    );

    // Sekcja istnieje
    expect(screen.getAllByText("Koszt pozostałej spłaty").length).toBeGreaterThan(0);

    // Wartości są renderowane
    expect(screen.getAllByText("Pozostały kapitał").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Szacowane odsetki").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Szacunkowy łączny koszt").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Szacowana data spłaty").length).toBeGreaterThan(0);

    // Data końcowa jest wyraźnie oznaczona jako szacunkowa
    expect(screen.getByText(/Za \d+ mies\./)).toBeTruthy();
  });

  it("renderuje fallback dla długu, w którym rata nie pokrywa odsetek", () => {
    render(
      <DebtDetailsModal
        isOpen={true}
        onClose={() => {}}
        debt={mockNonAmortizingDebt}
      />
    );

    expect(screen.getAllByText("Koszt pozostałej spłaty").length).toBeGreaterThan(0);
    
    // Wiadomość o błędzie amortyzacji z kalkulatora
    expect(screen.getByText("Miesięczna rata nie pokrywa bieżących odsetek — dług nie amortyzuje się.")).toBeTruthy();
    
    // Brak rozbicia
    expect(screen.queryByText("Szacunkowy łączny koszt")).toBeNull();
  });
});
