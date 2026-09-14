/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FinancialStoryModal } from "./FinancialStoryModal";
import { Profile } from "../../types";

describe("FinancialStoryModal", () => {
  const mockProfile: Profile = {
    id: "p1",
    name: "Jan Kowalski",
    currency: "PLN",
    kind: "personal",
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    transactions: [
      {
        id: "t1",
        name: "Wpłata wypłaty",
        amount: 6000,
        type: "income",
        category: "Wynagrodzenie",
        isoDate: "2026-09-05",
        account: "Konto Główne",
        currency: "PLN"
      },
      {
        id: "t2",
        name: "Biedronka",
        amount: 1500,
        type: "expense",
        category: "Spożywcze",
        isoDate: "2026-09-10",
        account: "Konto Główne",
        currency: "PLN"
      }
    ],
    accounts: [
      {
        id: "acc1",
        name: "Konto Główne",
        bankName: "mBank",
        hasCreditLimit: false,
        creditLimit: 0
      }
    ],
    recurringRules: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <FinancialStoryModal
        isOpen={false}
        onClose={vi.fn()}
        profile={mockProfile}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders story modal and displays initial slide content", () => {
    render(
      <FinancialStoryModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        initialYear={2026}
        initialMonthIdx={8} // Wrzesień
      />
    );

    expect(screen.getByText("Saldo Wrapped")).toBeTruthy();
    expect(screen.getByText("Wrzesień 2026")).toBeTruthy();
    expect(screen.getByText("Karta 1 z 6")).toBeTruthy();
  });

  it("allows navigating between slides via Next and Prev buttons", () => {
    render(
      <FinancialStoryModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        initialYear={2026}
        initialMonthIdx={8}
      />
    );

    const nextBtn = screen.getByLabelText("Następny slajd");
    fireEvent.click(nextBtn);
    expect(screen.getByText("Karta 2 z 6")).toBeTruthy();
    expect(screen.getByText("Gdzie płynęły środki?")).toBeTruthy();

    const prevBtn = screen.getByLabelText("Poprzedni slajd");
    fireEvent.click(prevBtn);
    expect(screen.getByText("Karta 1 z 6")).toBeTruthy();
  });

  it("copies summary to clipboard when clicking copy button", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock
      }
    });

    const showToastMock = vi.fn();
    render(
      <FinancialStoryModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        initialYear={2026}
        initialMonthIdx={8}
        showToast={showToastMock}
      />
    );

    const copyBtn = screen.getByTitle("Kopiuj podsumowanie tekstowe");
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("Wrzesień 2026"));
  });

  it("calls onClose when clicking close button", () => {
    const onCloseMock = vi.fn();
    render(
      <FinancialStoryModal
        isOpen={true}
        onClose={onCloseMock}
        profile={mockProfile}
      />
    );

    const closeBtn = screen.getByLabelText("Zamknij");
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
