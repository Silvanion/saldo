/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { ExportReportsModal } from "./ExportReportsModal";
import { Profile } from "../../types";

// Mock pdfGenerator
vi.mock("../../services/pdfGenerator", () => ({
  generateReportPdf: vi.fn(),
  generateAnnualReportPdf: vi.fn()
}));

describe("ExportReportsModal", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockProfile: Profile = {
    id: "p1",
    name: "Jan Kowalski",
    kind: "personal",
    currency: "PLN",
    budgets: {
      Żywność: 1500,
      Transport: 500
    },
    payments: [],
    investments: [],
    goals: [
      { id: "g1", name: "Wakacje", target: 5000, saved: 2500, currency: "PLN" }
    ],
    debts: [
      {
        id: "d1",
        name: "Kredyt Gotówkowy",
        institution: "Bank",
        type: "cash_loan",
        balance: 12000,
        monthlyPayment: 600,
        interestRate: 8.5,
        currency: "PLN",
        status: "active",
        createdAt: "2026-01-01"
      }
    ],
    accounts: [
      { id: "acc1", name: "Konto Główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }
    ],
    transactions: [
      {
        id: "t1",
        name: "Wynagrodzenie",
        amount: 8000,
        type: "income",
        category: "Przychód",
        account: "Konto Główne",
        isoDate: "2026-09-01",
        currency: "PLN"
      },
      {
        id: "t2",
        name: "Supermarket",
        amount: 300,
        type: "expense",
        category: "Żywność",
        account: "Konto Główne",
        isoDate: "2026-09-02",
        currency: "PLN"
      }
    ]
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    activeProfile: mockProfile,
    initialTab: "pdf" as const,
    onExportData: vi.fn(),
    showToast: vi.fn()
  };

  it("nie renderuje niczego, gdy isOpen wynosi false", () => {
    const { container } = render(<ExportReportsModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderuje nagłówek, 3 zakładki i domyślną treść raportu PDF", () => {
    render(<ExportReportsModal {...defaultProps} />);

    expect(screen.getByText("Centrum Raportów i Eksportu")).toBeDefined();
    expect(screen.getByText("Raporty PDF")).toBeDefined();
    expect(screen.getByText("Eksporty CSV")).toBeDefined();
    expect(screen.getByText("Kopia bazy")).toBeDefined();
    expect(screen.getByText("Pobierz raport PDF")).toBeDefined();
    expect(screen.getByText("Udostępnij")).toBeDefined();
  });

  it("przełącza się na zakładkę Eksporty CSV i umożliwia wybór typu danych", () => {
    render(<ExportReportsModal {...defaultProps} />);

    const csvTabBtn = screen.getByText("Eksporty CSV");
    fireEvent.click(csvTabBtn);

    expect(screen.getByText("Wybierz zbiór danych do eksportu CSV")).toBeDefined();
    expect(screen.getByText("Historia wpisów z filtrami")).toBeDefined();
    expect(screen.getByText("Limity i wykonanie")).toBeDefined();
    expect(screen.getByText("Portfel zadłużenia")).toBeDefined();
    expect(screen.getByText("Pobierz plik CSV")).toBeDefined();
  });

  it("przełącza się na zakładkę Kopia bazy i uruchamia onExportData po kliknięciu", () => {
    const onExportData = vi.fn();
    const showToast = vi.fn();
    render(<ExportReportsModal {...defaultProps} onExportData={onExportData} showToast={showToast} />);

    const backupTabBtn = screen.getByText("Kopia bazy");
    fireEvent.click(backupTabBtn);

    expect(screen.getByText("Pełna kopia zapasowa JSON")).toBeDefined();
    const downloadJsonBtn = screen.getByText("Pobierz pełną kopię zapasową (.json)");
    fireEvent.click(downloadJsonBtn);

    expect(onExportData).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("Kopia zapasowa JSON została wygenerowana", "success");
  });

  it("zamyka modal po kliknięciu przycisku zamykania", () => {
    const onClose = vi.fn();
    render(<ExportReportsModal {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByLabelText("Zamknij okno raportów");
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
