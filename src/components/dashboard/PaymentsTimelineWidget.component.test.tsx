/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PaymentsTimelineWidget } from "./PaymentsTimelineWidget";
import { Payment } from "../../types";

describe("PaymentsTimelineWidget (Component rendering)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:00:00.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const defaultProps = {
    currency: "PLN",
    unpaidPayments: [] as Payment[],
    onTogglePaymentStatus: vi.fn(),
    onChangeView: vi.fn(),
  };

  it("renders empty state correctly when there are no payments", () => {
    render(<PaymentsTimelineWidget {...defaultProps} />);

    expect(screen.getByText("Brak zobowiązań")).toBeTruthy();
    expect(screen.getByText("Twój harmonogram jest czysty.")).toBeTruthy();
    expect(screen.getByText("🏖️")).toBeTruthy();
  });

  it("renders overdue count badge in header when there are overdue payments", () => {
    const payments: Payment[] = [
      {
        id: "p-ov-1",
        name: "Zaległy rachunek 1",
        amount: 250,
        status: "Do opłacenia",
        category: "Dom",
        isRecurring: false,
        dueDate: "2026-07-20",
        currency: "PLN",
      },
      {
        id: "p-ov-2",
        name: "Zaległy rachunek 2",
        amount: 150,
        status: "Do opłacenia",
        category: "Media",
        isRecurring: false,
        dueDate: "2026-07-22",
        currency: "PLN",
      },
    ];

    render(<PaymentsTimelineWidget {...defaultProps} unpaidPayments={payments} />);

    expect(screen.getByText("Zaległe: 2")).toBeTruthy();
  });

  it("renders timeline sections with payment details", () => {
    const payments: Payment[] = [
      { id: "1", name: "Zaległy", amount: 100, status: "Do opłacenia", category: "Dom", isRecurring: false, dueDate: "2026-07-20", currency: "PLN" },
      { id: "2", name: "Dzisiejszy", amount: 200, status: "Do opłacenia", category: "Media", isRecurring: false, dueDate: "2026-07-25", currency: "PLN" },
      { id: "3", name: "W tym tygodniu", amount: 300, status: "Do opłacenia", category: "Subskrypcje", isRecurring: false, dueDate: "2026-07-28", currency: "PLN" },
    ];

    render(<PaymentsTimelineWidget {...defaultProps} unpaidPayments={payments} />);

    expect(screen.getByText("Zaległy")).toBeTruthy();
    expect(screen.getByText("Dzisiejszy")).toBeTruthy();
    expect(screen.getByText("W tym tygodniu")).toBeTruthy();
    expect(screen.getByText("Najbliższe 7 dni")).toBeTruthy();
  });

  it("toggles between compact timeline list and monthly overview mode", () => {
    const payments: Payment[] = [
      { id: "1", name: "Rachunek A", amount: 120, status: "Do opłacenia", category: "Dom", isRecurring: false, dueDate: "2026-07-26", currency: "PLN" },
    ];

    render(<PaymentsTimelineWidget {...defaultProps} unpaidPayments={payments} />);

    // Initially in compact mode: toggle button text is "Cashflow"
    const toggleBtn = screen.getByRole("button", { name: /Cashflow/i });
    fireEvent.click(toggleBtn);

    // After click: switches to monthly overview mode and shows overview content
    expect(screen.getByText("Zestawienie ogólne")).toBeTruthy();
    expect(screen.getByText(/Liczba pozycji:/i)).toBeTruthy();
  });

  it("triggers onTogglePaymentStatus when checking off a payment row", () => {
    const onTogglePaymentStatus = vi.fn();
    const payments: Payment[] = [
      { id: "pay-42", name: "Prąd", amount: 180, status: "Do opłacenia", category: "Media", isRecurring: false, dueDate: "2026-07-25", currency: "PLN" },
    ];

    render(
      <PaymentsTimelineWidget
        {...defaultProps}
        unpaidPayments={payments}
        onTogglePaymentStatus={onTogglePaymentStatus}
      />
    );

    const checkBtn = screen.getByRole("button", { name: /Oznacz jako opłacone/i });
    fireEvent.click(checkBtn);

    expect(onTogglePaymentStatus).toHaveBeenCalledWith("pay-42");
  });
});
