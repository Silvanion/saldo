// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { OverpaymentSimulatorModal } from "./OverpaymentSimulatorModal";
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
  createdAt: "2023-01-01",
  baseRate: 5, // these should not affect UI!
  margin: 5    // these should not affect UI!
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

describe("OverpaymentSimulatorModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderuje fallback jeśli kwota nadpłaty wynosi 0", () => {
    render(
      <OverpaymentSimulatorModal
        isOpen={true}
        onClose={() => {}}
        debt={mockAmortizingDebt}
        initialAmount={0}
      />
    );

    expect(screen.getByText("Wprowadź kwotę nadpłaty, aby zobaczyć porównanie.")).toBeTruthy();
    expect(screen.queryByText("Scenariusz bazowy")).toBeNull();
  });

  it("renderuje fallback dla długu nieamortyzowanego (unsupported)", () => {
    render(
      <OverpaymentSimulatorModal
        isOpen={true}
        onClose={() => {}}
        debt={mockNonAmortizingDebt}
        initialAmount={1000}
      />
    );

    expect(screen.getByText("Miesięczna rata nie pokrywa bieżących odsetek — dług nie amortyzuje się.")).toBeTruthy();
    expect(screen.queryByText("Scenariusz bazowy")).toBeNull();
  });

  it("renderuje pełny scenariusz bazowy, po nadpłacie i oszczędności po podaniu kwoty", () => {
    render(
      <OverpaymentSimulatorModal
        isOpen={true}
        onClose={() => {}}
        debt={mockAmortizingDebt}
        initialAmount={500}
      />
    );

    // Scenariusz bazowy
    expect(screen.getByText("Scenariusz bazowy")).toBeTruthy();
    
    // Scenariusz po nadpłacie
    expect(screen.getByText("Scenariusz po nadpłacie")).toBeTruthy();

    // Oszczędność czasu i odsetek
    expect(screen.getByText("Oszczędność czasu")).toBeTruthy();
    expect(screen.getByText("Oszczędność odsetek")).toBeTruthy();

    // Tytuły pól w baseline i symulacji
    expect(screen.getAllByText("Rata miesięczna:").length).toBe(1);
    expect(screen.getAllByText("Czas do spłaty:").length).toBe(1);
    expect(screen.getAllByText("Szacowane odsetki:").length).toBe(1);

    expect(screen.getAllByText("Nowa rata:").length).toBe(1);
    expect(screen.getAllByText("Nowy czas spłaty:").length).toBe(1);
    expect(screen.getAllByText("Nowe odsetki:").length).toBe(1);
  });
});
