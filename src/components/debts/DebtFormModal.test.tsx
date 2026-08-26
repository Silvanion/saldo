/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DebtFormModal } from "./DebtFormModal";

describe("DebtFormModal — pierwotna kwota zobowiązania", () => {
  afterEach(() => cleanup());

  const fillRequiredFields = () => {
    fireEvent.change(screen.getByPlaceholderText("Hipoteka mieszkanie"), { target: { value: "Kredyt testowy" } });
    fireEvent.change(screen.getByPlaceholderText("350000"), { target: { value: "300000" } });
    fireEvent.change(screen.getByPlaceholderText("2500"), { target: { value: "2200" } });
    fireEvent.change(screen.getByPlaceholderText("6.85"), { target: { value: "6.5" } });
  };

  it("pole jest widoczne i opcjonalne — formularz zapisuje się bez wypełnienia go", () => {
    const onSave = vi.fn();
    render(<DebtFormModal isOpen={true} onClose={vi.fn()} onSave={onSave} />);

    expect(screen.getByText("Pierwotna kwota zobowiązania")).toBeTruthy();

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Dodaj zobowiązanie" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0];
    expect(payload.originalAmount).toBeUndefined();
  });

  it("wypełniona wartość trafia do zapisu jako liczba", () => {
    const onSave = vi.fn();
    render(<DebtFormModal isOpen={true} onClose={vi.fn()} onSave={onSave} />);

    fillRequiredFields();
    fireEvent.change(screen.getByPlaceholderText("np. 350000"), { target: { value: "350000" } });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj zobowiązanie" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].originalAmount).toBe(350000);
  });

  it("edycja istniejącego długu wstępnie wypełnia pole zapisaną wartością", () => {
    render(
      <DebtFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialData={{
          id: "1",
          name: "Hipoteka",
          institution: "Bank",
          type: "mortgage",
          currency: "PLN",
          balance: 300000,
          originalAmount: 420000,
          monthlyPayment: 2200,
          interestRate: 6.5,
          status: "active",
          createdAt: "2026-01-01"
        }}
      />
    );

    const input = screen.getByPlaceholderText("np. 350000") as HTMLInputElement;
    expect(input.value).toBe("420000");
  });
});
