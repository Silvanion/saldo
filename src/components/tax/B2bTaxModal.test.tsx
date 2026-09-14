// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { B2bTaxModal } from "./B2bTaxModal";
import { Profile } from "../../types";

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
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});

const mockProfile: Profile = {
  id: "prof-1",
  name: "Jan B2B",
  kind: "personal",
  currency: "PLN",
  transactions: [
    {
      id: "t1",
      name: "Faktura za programowanie B2B",
      amount: 22000,
      type: "income",
      isoDate: "2026-09-05",
      currency: "PLN",
      category: "Przychody B2B",
      account: "Firmowe",
    },
    {
      id: "t2",
      name: "Abonament chmury AWS",
      amount: 1200,
      type: "expense",
      isoDate: "2026-09-10",
      currency: "PLN",
      category: "Koszty IT",
      account: "Firmowe",
    },
  ],
  payments: [],
  goals: [],
  investments: [],
  budgets: {},
};

describe("B2bTaxModal", () => {
  it("renders when isOpen is true and shows 3 tax forms", () => {
    render(
      <B2bTaxModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        initialRevenue={20000}
        initialCosts={1000}
      />
    );

    expect(screen.getByText("Kalkulator Podatkowy & B2B / JDG")).toBeTruthy();
    expect(screen.getByText("Podatek Liniowy (19%)")).toBeTruthy();
    expect(screen.getByText("Skala Podatkowa (12% / 32%)")).toBeTruthy();
    expect(screen.getByText(/Najbardziej opłacalny wybór/i)).toBeTruthy();
  });

  it("switches tabs between comparison, monthly buffer, and calendar tips", () => {
    render(
      <B2bTaxModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
      />
    );

    // Tab 2: Monthly Buffer
    const tabBuffer = screen.getByRole("button", { name: /Rezerwa Podatkowa/i });
    fireEvent.click(tabBuffer);
    expect(screen.getByText("Kalkulator Bufora Podatkowego na Bieżący Miesiąc")).toBeTruthy();
    expect(screen.getByText("Kwota do odłożenia na podatki")).toBeTruthy();

    // Tab 3: Calendar Tips
    const tabTips = screen.getByRole("button", { name: /Terminarz i Wskazówki/i });
    fireEvent.click(tabTips);
    expect(screen.getByText(/Oficjalne Terminy Podatkowe dla Przedsiębiorców w Polsce/i)).toBeTruthy();
    expect(screen.getByText(/20. dzień każdego miesiąca/i)).toBeTruthy();
    expect(screen.getByText(/25. dzień każdego miesiąca/i)).toBeTruthy();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <B2bTaxModal
        isOpen={true}
        onClose={handleClose}
        profile={mockProfile}
      />
    );

    const closeBtn = screen.getByRole("button", { name: /Zamknij kalkulator podatkowy/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
