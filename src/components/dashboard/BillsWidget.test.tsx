/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BillsWidget } from "./BillsWidget";
import { Payment } from "../../types";

describe("BillsWidget", () => {
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
    urgentPaymentsCount: 0,
    onTogglePaymentStatus: vi.fn(),
    onChangeView: vi.fn(),
    onOpenPaymentModal: vi.fn(),
  };

  it("renders empty state correctly when there are no unpaid payments", () => {
    render(<BillsWidget {...defaultProps} />);

    expect(screen.getByText("Brak rachunków do opłacenia")).toBeTruthy();
    expect(screen.getByText("Wszystkie bieżące opłaty są uregulowane.")).toBeTruthy();
    expect(screen.queryByText(/innych opłat/i)).toBeNull();
  });

  it("renders header badge with urgent count when urgentPaymentsCount > 0", () => {
    render(<BillsWidget {...defaultProps} urgentPaymentsCount={3} />);

    expect(screen.getByText("Pilne (3)")).toBeTruthy();
  });

  it("does not render urgent badge when urgentPaymentsCount is 0", () => {
    render(<BillsWidget {...defaultProps} urgentPaymentsCount={0} />);

    expect(screen.queryByText(/Pilne/i)).toBeNull();
  });

  it("classifies due date urgency into correct badges (overdue, today, tomorrow, within 3 days, beyond 3 days)", () => {
    const payments: Payment[] = [
      { id: "1", name: "Czynsz", amount: 1500, status: "Do opłacenia", category: "Dom", isRecurring: false, dueDate: "2026-07-20", currency: "PLN" }, // Overdue (-5 days)
      { id: "2", name: "Internet", amount: 100, status: "Do opłacenia", category: "Media", isRecurring: false, dueDate: "2026-07-25", currency: "PLN" }, // Today (0 days)
      { id: "3", name: "Prąd", amount: 250, status: "Do opłacenia", category: "Media", isRecurring: false, dueDate: "2026-07-26", currency: "PLN" }, // Tomorrow (1 day)
      { id: "4", name: "Gaz", amount: 80, status: "Do opłacenia", category: "Media", isRecurring: false, dueDate: "2026-07-28", currency: "PLN" }, // Within 3 days (3 days)
      { id: "5", name: "Telefon", amount: 60, status: "Do opłacenia", category: "Media", isRecurring: false, dueDate: "2026-08-05", currency: "PLN" }, // Beyond 3 days (11 days)
    ];

    render(<BillsWidget {...defaultProps} unpaidPayments={payments} />);

    expect(screen.getByText("Przeterminowane!")).toBeTruthy();
    expect(screen.getByText("Dzisiaj!")).toBeTruthy();
    expect(screen.getByText("Jutro")).toBeTruthy();
    expect(screen.getByText("Za 3 dni")).toBeTruthy();
    // 5th item should not have a due badge
    expect(screen.queryByText(/Za 11 dni/i)).toBeNull();
  });

  it("renders paidBy badges correctly ('Ja', 'Partner', 'Wspólne')", () => {
    const payments: Payment[] = [
      { id: "1", name: "Subskrypcja A", amount: 30, status: "Do opłacenia", category: "Rozrywka", isRecurring: false, dueDate: "2026-07-27", paidBy: "me", currency: "PLN" },
      { id: "2", name: "Subskrypcja B", amount: 40, status: "Do opłacenia", category: "Rozrywka", isRecurring: false, dueDate: "2026-07-27", paidBy: "partner", currency: "PLN" },
      { id: "3", name: "Subskrypcja C", amount: 50, status: "Do opłacenia", category: "Rozrywka", isRecurring: false, dueDate: "2026-07-27", paidBy: "joint", currency: "PLN" },
    ];

    render(<BillsWidget {...defaultProps} unpaidPayments={payments} />);

    expect(screen.getByText("Ja")).toBeTruthy();
    expect(screen.getByText("Partner")).toBeTruthy();
    expect(screen.getByText("Wspólne")).toBeTruthy();
  });

  it("handles overflow: displays at most 5 items and shows the overflow count indicator", () => {
    const payments: Payment[] = Array.from({ length: 8 }, (_, i) => ({
      id: `p-${i + 1}`,
      name: `Rachunek ${i + 1}`,
      amount: 50 * (i + 1),
      status: "Do opłacenia",
      category: "Inne",
      isRecurring: false,
      dueDate: `2026-07-${26 + i}`,
      currency: "PLN",
    }));

    render(<BillsWidget {...defaultProps} unpaidPayments={payments} />);

    // First 5 items should be rendered
    expect(screen.getByText("Rachunek 1")).toBeTruthy();
    expect(screen.getByText("Rachunek 5")).toBeTruthy();
    // 6th item should not be rendered in the topItems list
    expect(screen.queryByText("Rachunek 6")).toBeNull();
    // Overflow text should show + 3 innych opłat
    expect(screen.getByText("+ 3 innych opłat (zobacz w zakładce Zarządzaj)")).toBeTruthy();
  });

  it("triggers interactive callbacks when buttons are clicked", () => {
    const onTogglePaymentStatus = vi.fn();
    const onChangeView = vi.fn();
    const onOpenPaymentModal = vi.fn();

    const payment: Payment = {
      id: "pay-123",
      name: "Czynsz",
      amount: 1500,
      status: "Do opłacenia",
      category: "Dom",
      isRecurring: false,
      dueDate: "2026-07-25",
      currency: "PLN",
    };

    render(
      <BillsWidget
        currency="PLN"
        unpaidPayments={[payment]}
        urgentPaymentsCount={1}
        onTogglePaymentStatus={onTogglePaymentStatus}
        onChangeView={onChangeView}
        onOpenPaymentModal={onOpenPaymentModal}
      />
    );

    // Toggle status button (checkmark)
    const checkBtn = screen.getByRole("button", { name: /Oznacz jako opłacone/i });
    fireEvent.click(checkBtn);
    expect(onTogglePaymentStatus).toHaveBeenCalledWith("pay-123");

    // Manage view button
    const manageBtn = screen.getByRole("button", { name: /Zarządzaj/i });
    fireEvent.click(manageBtn);
    expect(onChangeView).toHaveBeenCalledWith("payments");

    // Add payment button
    const addBtn = screen.getByRole("button", { name: /Dodaj opłatę/i });
    fireEvent.click(addBtn);
    expect(onOpenPaymentModal).toHaveBeenCalledTimes(1);
  });

  it("gracefully handles missing or empty optional fields without crashing", () => {
    const incompletePayment: Payment = {
      id: "incomplete-1",
      name: "Brak opcjonalnych",
      amount: 99,
      status: "Do opłacenia",
      category: "Różne",
      isRecurring: false,
      dueDate: "",
      currency: "PLN",
    };

    expect(() => {
      render(<BillsWidget {...defaultProps} unpaidPayments={[incompletePayment]} />);
    }).not.toThrow();

    expect(screen.getByText("Brak opcjonalnych")).toBeTruthy();
  });
});
