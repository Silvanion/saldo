/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PaymentsView } from "./PaymentsView";
import { Profile, Payment } from "../types";

describe("PaymentsView (Urgency badges & Empty state)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:00:00.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const baseProfile: Profile = {
    id: "p1",
    name: "Test",
    kind: "personal",
    avatar: "👤",
    currency: "PLN",
    accounts: [],
    settlements: [],
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
  };

  const defaultProps = {
    profile: baseProfile,
    selectedDate: new Date("2026-07-25T12:00:00.000Z"),
    onOpenPaymentModal: vi.fn(),
    onTogglePaymentStatus: vi.fn(),
    onAddPayment: vi.fn(),
    onDeletePayment: vi.fn(),
    calendarToken: null,
    onTriggerCalendarAi: vi.fn(),
  };

  it("renders unified empty state card when there are no payments in profile", () => {
    render(<PaymentsView {...defaultProps} />);

    expect(screen.getByText("Brak zdefiniowanych płatności")).toBeTruthy();
    expect(screen.getByText("Wszystkie bieżące opłaty są uregulowane lub brak zdefiniowanych terminów.")).toBeTruthy();
    expect(screen.getByText("🍵")).toBeTruthy();
    expect(screen.getByRole("button", { name: /\+ Dodaj pierwszy rachunek/i })).toBeTruthy();
  });

  it("renders filter empty state card when payments exist but all are filtered out", () => {
    const payments: Payment[] = [
      {
        id: "pay-1",
        name: "Rachunek odległy",
        amount: 200,
        status: "Do opłacenia",
        category: "Dom",
        isRecurring: false,
        dueDate: "2026-09-01",
        currency: "PLN",
      },
    ];

    render(
      <PaymentsView
        {...defaultProps}
        profile={{ ...baseProfile, payments }}
      />
    );

    // Filter by "Zaległe"
    const overdueFilterBtn = screen.getByRole("button", { name: "Zaległe" });
    fireEvent.click(overdueFilterBtn);

    expect(screen.getByText("Brak płatności pasujących do wybranego filtra")).toBeTruthy();
    expect(screen.getByText("Zmień kryteria filtrowania, aby zobaczyć pozostałe rachunki.")).toBeTruthy();
    expect(screen.getByText("🔍")).toBeTruthy();
  });

  it("classifies due date urgency into correct badges: 'Dzisiaj!' without animate-pulse, 'Jutro' with warning styling", () => {
    const payments: Payment[] = [
      { id: "1", name: "Czynsz", amount: 1500, status: "Do opłacenia", category: "Dom", isRecurring: false, dueDate: "2026-07-20", currency: "PLN" }, // Overdue (-5 days)
      { id: "2", name: "Internet", amount: 100, status: "Do opłacenia", category: "Media", isRecurring: false, dueDate: "2026-07-25", currency: "PLN" }, // Today (0 days)
      { id: "3", name: "Prąd", amount: 250, status: "Do opłacenia", category: "Media", isRecurring: false, dueDate: "2026-07-26", currency: "PLN" }, // Tomorrow (1 day)
      { id: "4", name: "Gaz", amount: 80, status: "Do opłacenia", category: "Media", isRecurring: false, dueDate: "2026-07-28", currency: "PLN" }, // In 3 days (3 days)
      { id: "5", name: "Telefon", amount: 60, status: "Do opłacenia", category: "Media", isRecurring: false, dueDate: "2026-08-05", currency: "PLN" }, // In 11 days (no badge)
      { id: "6", name: "Opłacony", amount: 90, status: "Opłacono", category: "Media", isRecurring: false, dueDate: "2026-07-25", currency: "PLN" }, // Paid (no badge)
    ];

    render(
      <PaymentsView
        {...defaultProps}
        profile={{ ...baseProfile, payments }}
      />
    );

    const todayBadge = screen.getByText("Dzisiaj!");
    expect(todayBadge).toBeTruthy();
    expect(todayBadge.className).not.toContain("animate-pulse");
    expect(todayBadge.className).toContain("text-danger");

    const tomorrowBadge = screen.getByText("Jutro");
    expect(tomorrowBadge).toBeTruthy();
    expect(tomorrowBadge.className).toContain("text-warning");
    expect(tomorrowBadge.className).toContain("border-warning/30");

    const overdueBadge = screen.getByText("Przeterminowane!");
    expect(overdueBadge).toBeTruthy();
    expect(overdueBadge.className).toContain("text-danger");

    const threeDaysBadge = screen.getByText("Za 3 dni");
    expect(threeDaysBadge).toBeTruthy();
    expect(threeDaysBadge.className).toContain("text-warning");

    expect(screen.queryByText(/Za 11 dni/i)).toBeNull();
  });

  it("triggers onOpenPaymentModal when clicking add payment button in empty state", () => {
    const onOpenPaymentModal = vi.fn();

    render(
      <PaymentsView
        {...defaultProps}
        onOpenPaymentModal={onOpenPaymentModal}
      />
    );

    const addBtn = screen.getByRole("button", { name: /\+ Dodaj pierwszy rachunek/i });
    fireEvent.click(addBtn);

    expect(onOpenPaymentModal).toHaveBeenCalledTimes(1);
  });

  it("renders payer-role badges ('Ja', 'Partner', 'Wspólne') with quiet styling in shared profiles", () => {
    const payments: Payment[] = [
      { id: "1", name: "Czynsz", amount: 1500, status: "Do opłacenia", category: "Dom", isRecurring: false, dueDate: "2026-07-30", currency: "PLN", paidBy: "me", splitMode: "equal" },
      { id: "2", name: "Internet", amount: 100, status: "Do opłacenia", category: "Media", isRecurring: false, dueDate: "2026-07-30", currency: "PLN", paidBy: "partner", splitMode: "equal" },
      { id: "3", name: "Zakupy", amount: 300, status: "Do opłacenia", category: "Jedzenie", isRecurring: false, dueDate: "2026-07-30", currency: "PLN", paidBy: "joint" },
    ];

    const sharedProfile: Profile = {
      ...baseProfile,
      kind: "shared",
      payments,
    };

    render(
      <PaymentsView
        {...defaultProps}
        profile={sharedProfile}
      />
    );

    expect(screen.getByTitle("Ja (50-50)")).toBeTruthy();
    expect(screen.getByTitle("Partner (50-50)")).toBeTruthy();
    expect(screen.getByTitle("Wspólne")).toBeTruthy();
  });

  it("renders row action buttons with accessible labels and triggers edit / delete modals", () => {
    const onOpenPaymentModal = vi.fn();
    const payments: Payment[] = [
      { id: "pay-edit-1", name: "Subskrypcja Spotify", amount: 30, status: "Do opłacenia", category: "Subskrypcje", isRecurring: false, dueDate: "2026-07-30", currency: "PLN" },
    ];

    render(
      <PaymentsView
        {...defaultProps}
        profile={{ ...baseProfile, payments }}
        onOpenPaymentModal={onOpenPaymentModal}
      />
    );

    const editBtn = screen.getByRole("button", { name: "Edytuj rachunek" });
    expect(editBtn).toBeTruthy();
    fireEvent.click(editBtn);
    expect(onOpenPaymentModal).toHaveBeenCalledWith(payments[0]);

    const deleteBtn = screen.getByRole("button", { name: "Usuń rachunek" });
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn);
    expect(screen.getByText("Usunąć płatność?")).toBeTruthy();
  });

  it("renders refined header hierarchy and time filter controls", () => {
    const payments: Payment[] = [
      { id: "1", name: "Rachunek 1", amount: 100, status: "Do opłacenia", category: "Dom", isRecurring: false, dueDate: "2026-07-25", currency: "PLN" },
    ];

    render(
      <PaymentsView
        {...defaultProps}
        profile={{ ...baseProfile, payments }}
      />
    );

    expect(screen.getByText("Harmonogram Płatności")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Rachunki i Subskrypcje" })).toBeTruthy();
    expect(screen.getByText("1 do opłacenia")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Wszystkie" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zaległe" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dzisiaj" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "7 dni" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "30 dni" })).toBeTruthy();
  });

  describe("Subscription & Fixed Cost Hub Mode", () => {
    it("switches to subscription mode and renders KPI summary cards and detected items", () => {
      const payments: Payment[] = [
        { id: "1", name: "Netflix Premium", amount: 60, status: "Do opłacenia", category: "Rozrywka", isRecurring: true, dueDate: "2026-07-28", currency: "PLN" },
        { id: "2", name: "Czynsz za mieszkanie", amount: 2500, status: "Do opłacenia", category: "Mieszkanie", isRecurring: false, dueDate: "2026-08-01", currency: "PLN" },
      ];

      render(
        <PaymentsView
          {...defaultProps}
          profile={{ ...baseProfile, payments }}
        />
      );

      // Verify mode tabs
      const subHubTab = screen.getByRole("tab", { name: /Subskrypcje i koszty stałe/i });
      expect(subHubTab).toBeTruthy();

      // Click to switch mode
      fireEvent.click(subHubTab);
      expect(subHubTab.getAttribute("aria-selected")).toBe("true");

      // Verify KPI summary cards
      expect(screen.getByText("Miesięcznie")).toBeTruthy();
      expect(screen.getByText("Rocznie")).toBeTruthy();
      expect(screen.getByText("Aktywne pozycje")).toBeTruthy();
      expect(screen.getByText("Najbliższa opłata")).toBeTruthy();

      // Verify detected items & type badges
      expect(screen.getAllByText("Netflix Premium").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Subskrypcja")).toBeTruthy();
      expect(screen.getByText("Czynsz za mieszkanie")).toBeTruthy();
      expect(screen.getByText("Rachunek stały")).toBeTruthy();
    });

    it("renders subscription hub empty state when no recurring or fixed cost candidates exist", () => {
      render(
        <PaymentsView
          {...defaultProps}
          profile={{ ...baseProfile, payments: [] }}
        />
      );

      const subHubTab = screen.getByRole("tab", { name: /Subskrypcje i koszty stałe/i });
      fireEvent.click(subHubTab);

      expect(screen.getByText("Brak wykrytych kosztów stałych")).toBeTruthy();
      expect(screen.getByText("Dodaj powtarzalną płatność lub rachunek stały, aby zobaczyć zestawienie abonamentów, czynszu i opłat cyklicznych.")).toBeTruthy();
    });
  });
});
