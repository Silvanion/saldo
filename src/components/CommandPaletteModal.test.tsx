/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { CommandPaletteModal } from "./CommandPaletteModal";
import { Profile } from "../types";

describe("CommandPaletteModal", () => {
  afterEach(() => {
    cleanup();
  });

  const mockProfile: Profile = {
    id: "p1",
    name: "Profil Osobisty",
    kind: "personal",
    currency: "PLN",
    budgets: {},
    payments: [],
    goals: [],
    investments: [],
    transactions: [
      { id: "t1", name: "Biedronka zakupy", amount: 120.5, type: "expense", category: "Żywność", account: "Konto", isoDate: "2026-08-10", currency: "PLN" },
      { id: "t2", name: "Pensja", amount: 6000, type: "income", category: "Wynagrodzenie", account: "Konto", isoDate: "2026-08-01", currency: "PLN" }
    ]
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    activeProfile: mockProfile,
    profiles: [mockProfile],
    activeView: "dashboard" as const,
    setActiveView: vi.fn(),
    onSelectProfile: vi.fn(),
    onOpenTransactionModal: vi.fn(),
    onOpenPaymentModal: vi.fn(),
    onOpenGoalModal: vi.fn(),
    onOpenImportCsvModal: vi.fn(),
    onExportData: vi.fn(),
    theme: "dark" as const,
    onToggleTheme: vi.fn()
  };

  it("renders nothing when isOpen is false", () => {
    const { container } = render(<CommandPaletteModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders search input and default action/view items when open", () => {
    render(<CommandPaletteModal {...defaultProps} />);

    expect(screen.getByPlaceholderText(/Wpisz polecenie/i)).toBeDefined();
    expect(screen.getByText("Dodaj wydatek lub przychód")).toBeDefined();
    expect(screen.getByText("Pulpit główny")).toBeDefined();
    expect(screen.getByText("Transakcje i operacje")).toBeDefined();
  });

  it("filters actions and views based on text query", () => {
    render(<CommandPaletteModal {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Wpisz polecenie/i);

    fireEvent.change(input, { target: { value: "budżet" } });

    expect(screen.getByText("Budżety miesięczne")).toBeDefined();
    expect(screen.queryByText("Pulpit główny")).toBeNull();
  });

  it("searches transactions in real time and opens transaction modal on click", () => {
    render(<CommandPaletteModal {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Wpisz polecenie/i);

    fireEvent.change(input, { target: { value: "Biedronka" } });

    const txItem = screen.getByText("Biedronka zakupy");
    expect(txItem).toBeDefined();

    fireEvent.click(txItem);
    expect(defaultProps.onOpenTransactionModal).toHaveBeenCalledWith(mockProfile.transactions[0]);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("triggers navigation when view item is selected", () => {
    render(<CommandPaletteModal {...defaultProps} />);
    const txViewBtn = screen.getByText("Transakcje i operacje");

    fireEvent.click(txViewBtn);
    expect(defaultProps.setActiveView).toHaveBeenCalledWith("transactions");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("navigates with ArrowDown / ArrowUp and executes selected item with Enter", () => {
    render(<CommandPaletteModal {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Wpisz polecenie/i);

    // Initial item is index 0 ("Dodaj wydatek lub przychód")
    fireEvent.keyDown(input, { key: "ArrowDown" });
    // Item 1 ("Dodaj rachunek lub płatność")
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onOpenPaymentModal).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("closes modal on Escape key", () => {
    render(<CommandPaletteModal {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Wpisz polecenie/i);

    fireEvent.keyDown(input, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("finds power actions via synonyms (e.g. 'kula śnieżna', 'forecast', 'reguły')", () => {
    render(<CommandPaletteModal {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Wpisz polecenie/i);

    // Search by synonym "kredyt" -> finds Debt Payoff Simulator
    fireEvent.change(input, { target: { value: "kredyt" } });
    expect(screen.getByText("Symulator spłaty zadłużenia (Kula śnieżna)")).toBeDefined();

    // Search by synonym "forecast" -> finds Cashflow Forecast
    fireEvent.change(input, { target: { value: "forecast" } });
    expect(screen.getByText("Prognoza płynności finansowej (30/60/90 dni)")).toBeDefined();

    // Search by synonym "smart rules" -> finds Smart Rules action
    fireEvent.change(input, { target: { value: "smart rules" } });
    expect(screen.getByText("Reguły kategoryzacji (Smart Rules)")).toBeDefined();
  });
});

describe("CommandPaletteModal — szybki wpis", () => {
  afterEach(() => cleanup());

  const profile: Profile = {
    id: "p1",
    name: "Profil",
    kind: "personal",
    currency: "PLN",
    budgets: {},
    payments: [],
    goals: [],
    investments: [],
    transactions: []
  };

  const makeProps = (overrides: Record<string, any> = {}) => ({
    isOpen: true,
    onClose: vi.fn(),
    activeProfile: profile,
    profiles: [profile],
    activeView: "dashboard" as const,
    setActiveView: vi.fn(),
    onSelectProfile: vi.fn(),
    onOpenTransactionModal: vi.fn(),
    onOpenPaymentModal: vi.fn(),
    onOpenCalendarReminder: vi.fn(),
    onOpenGoalModal: vi.fn(),
    theme: "dark" as const,
    onToggleTheme: vi.fn(),
    ...overrides
  });

  const typeQuery = (value: string) => {
    fireEvent.change(screen.getByLabelText("Wyszukaj polecenie, widok lub transakcję"), {
      target: { value }
    });
  };

  it("proponuje rachunek dla zdania z kwotą i terminem", () => {
    render(<CommandPaletteModal {...makeProps()} />);
    typeQuery("prąd 340 zł jutro");

    expect(screen.getByText(/Dodaj rachunek: Prąd/)).toBeTruthy();
    expect(screen.getByText("Szybki wpis")).toBeTruthy();
  });

  it("wybranie pozycji otwiera formularz płatności z wypełnionymi danymi", () => {
    const onOpenPaymentModal = vi.fn();
    render(<CommandPaletteModal {...makeProps({ onOpenPaymentModal })} />);
    typeQuery("prąd 340 zł");

    fireEvent.click(screen.getByText(/Dodaj rachunek: Prąd/));

    expect(onOpenPaymentModal).toHaveBeenCalledTimes(1);
    const prefill = onOpenPaymentModal.mock.calls[0][0];
    expect(prefill).toMatchObject({ name: "Prąd", amount: 340, status: "Do opłacenia" });
    // Brak "id" — to nowy wpis, nie edycja.
    expect(prefill.id).toBeUndefined();
  });

  it("zdanie z intencją przypomnienia kieruje do kalendarza", () => {
    const onOpenCalendarReminder = vi.fn();
    const onOpenPaymentModal = vi.fn();
    render(<CommandPaletteModal {...makeProps({ onOpenCalendarReminder, onOpenPaymentModal })} />);
    typeQuery("przypomnij o przeglądzie auta jutro");

    fireEvent.click(screen.getByText(/Przypomnienie: Przeglądzie auta/));

    expect(onOpenCalendarReminder).toHaveBeenCalledTimes(1);
    expect(onOpenPaymentModal).not.toHaveBeenCalled();
  });

  it("nie proponuje szybkiego wpisu dla zwykłego wyszukiwania", () => {
    render(<CommandPaletteModal {...makeProps()} />);
    typeQuery("ustawienia");

    expect(screen.queryByText("Szybki wpis")).toBeNull();
  });

  it("pusty formularz nie generuje propozycji", () => {
    render(<CommandPaletteModal {...makeProps()} />);
    expect(screen.queryByText("Szybki wpis")).toBeNull();
  });
});
