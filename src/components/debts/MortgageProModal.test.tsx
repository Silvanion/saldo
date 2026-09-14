// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MortgageProModal } from "./MortgageProModal";
import { DebtItem } from "../../types";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
});

afterEach(() => {
  cleanup();
});

const mockMortgage: DebtItem = {
  id: "mortgage-1",
  name: "Kredyt Hipoteczny PKO",
  institution: "PKO BP",
  type: "mortgage",
  currency: "PLN",
  balance: 400000,
  monthlyPayment: 2950,
  interestRate: 7.5,
  remainingMonths: 300,
  propertyValue: 500000,
  status: "active",
  createdAt: "2024-01-01"
};

describe("MortgageProModal", () => {
  it("renders when isOpen is true and shows header", () => {
    render(
      <MortgageProModal
        isOpen={true}
        onClose={vi.fn()}
        debts={[mockMortgage]}
      />
    );

    expect(screen.getByText("Centrum Hipoteczne Mortgage Pro")).toBeTruthy();
    expect(screen.getByText("Kredyt Hipoteczny PKO (PKO BP)")).toBeTruthy();
  });

  it("navigates across all 4 Mortgage Pro tabs", () => {
    render(
      <MortgageProModal
        isOpen={true}
        onClose={vi.fn()}
        debts={[mockMortgage]}
      />
    );

    // Tab 1: Stress Test (default)
    expect(screen.getByText(/Bufor ostrożnościowy KNF/i)).toBeTruthy();

    // Tab 2: Wakacje Kredytowe
    fireEvent.click(screen.getByRole("button", { name: /Wakacje Kredytowe/i }));
    expect(screen.getByText(/Dźwignia Finansowa/i)).toBeTruthy();
    expect(screen.getByText(/Uwolniona gotówka z rat/i)).toBeTruthy();

    // Tab 3: Raty Równe vs Malejące
    fireEvent.click(screen.getByRole("button", { name: /Raty Równe vs Malejące/i }));
    expect(screen.getByText(/Zysk z rat malejących/i)).toBeTruthy();
    expect(screen.getByText("Raty Równe (Annuitetowe)")).toBeTruthy();
    expect(screen.getByText("Raty Malejące (Kapitałowe)")).toBeTruthy();

    // Tab 4: Monitor LTV
    fireEvent.click(screen.getByRole("button", { name: /Monitor LTV i Marży/i }));
    expect(screen.getByText(/Wskaźnik LTV \(Loan to Value\)/i)).toBeTruthy();
    expect(screen.getByText(/Bezpieczna strefa LTV/i)).toBeTruthy();
  });

  it("allows selecting different delta in Stress Test tab", () => {
    render(
      <MortgageProModal
        isOpen={true}
        onClose={vi.fn()}
        debts={[mockMortgage]}
        initialTab="stress_test"
      />
    );

    const plus1Button = screen.getByRole("button", { name: /\+1%/i });
    fireEvent.click(plus1Button);
    expect(screen.getByText(/Stopa: 8.5%/i)).toBeTruthy();
  });
});
