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

describe("DebtFormModal — składniki oprocentowania", () => {
  afterEach(() => cleanup());

  const fillRequiredFields = () => {
    fireEvent.change(screen.getByPlaceholderText("Hipoteka mieszkanie"), { target: { value: "Kredyt testowy" } });
    fireEvent.change(screen.getByPlaceholderText("350000"), { target: { value: "300000" } });
    fireEvent.change(screen.getByPlaceholderText("2500"), { target: { value: "2200" } });
    fireEvent.change(screen.getByPlaceholderText("6.85"), { target: { value: "6.5" } });
  };

  it("pola są widoczne dla mortgage i pozwalają na zapis", () => {
    const onSave = vi.fn();
    render(<DebtFormModal isOpen={true} onClose={vi.fn()} onSave={onSave} />);
    
    // Hipoteka jest domyślnym typem
    expect(screen.getByText("Składniki oprocentowania")).toBeTruthy();
    
    fillRequiredFields();
    
    // wpisanie baseRate i margin
    fireEvent.change(screen.getByPlaceholderText("np. 5.85"), { target: { value: "5.5" } });
    fireEvent.change(screen.getByPlaceholderText("np. 2.15"), { target: { value: "2.0" } });
    
    fireEvent.click(screen.getByRole("button", { name: "Dodaj zobowiązanie" }));
    
    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0];
    expect(payload.interestRate).toBe(6.5);
    expect(payload.baseRate).toBe(5.5);
    expect(payload.margin).toBe(2.0);
  });

  it("pola nie są widoczne dla innych typów długów (credit card, cash loan)", () => {
    const { rerender } = render(<DebtFormModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />);
    
    // Switch to credit card
    fireEvent.click(screen.getByRole("button", { name: /Karta kredytowa/i }));
    expect(screen.queryByText("Składniki oprocentowania")).toBeNull();
    
    // Switch to cash loan
    fireEvent.click(screen.getByRole("button", { name: /Kredyt gotówkowy/i }));
    expect(screen.queryByText("Składniki oprocentowania")).toBeNull();
  });

  it("edycja kredytu z oboma składnikami pokazuje je, a stary bez nich zostaje nienaruszony", () => {
    const { rerender } = render(
      <DebtFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialData={{
          id: "1",
          name: "Hipoteka stary",
          institution: "Bank",
          type: "mortgage",
          currency: "PLN",
          balance: 300000,
          monthlyPayment: 2200,
          interestRate: 6.5,
          status: "active",
          createdAt: "2026-01-01"
        }}
      />
    );
    
    expect((screen.getByPlaceholderText("np. 5.85") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("np. 2.15") as HTMLInputElement).value).toBe("");
    
    rerender(
      <DebtFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialData={{
          id: "2",
          name: "Hipoteka nowy",
          institution: "Bank",
          type: "mortgage",
          currency: "PLN",
          balance: 300000,
          monthlyPayment: 2200,
          interestRate: 7.5,
          baseRate: 5.5,
          margin: 2.0,
          status: "active",
          createdAt: "2026-01-01"
        }}
      />
    );
    
    expect((screen.getByPlaceholderText("np. 5.85") as HTMLInputElement).value).toBe("5.5");
    expect((screen.getByPlaceholderText("np. 2.15") as HTMLInputElement).value).toBe("2");
  });

  it("odrzuca ujemne wartości", () => {
    const onSave = vi.fn();
    render(<DebtFormModal isOpen={true} onClose={vi.fn()} onSave={onSave} />);
    fillRequiredFields();
    
    fireEvent.change(screen.getByPlaceholderText("np. 5.85"), { target: { value: "-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj zobowiązanie" }));
    
    expect(screen.getByText("Stawka bazowa nie może być ujemna.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
    
    fireEvent.change(screen.getByPlaceholderText("np. 5.85"), { target: { value: "5" } });
    fireEvent.change(screen.getByPlaceholderText("np. 2.15"), { target: { value: "-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj zobowiązanie" }));
    
    expect(screen.getByText("Marża banku nie może być ujemna.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
});
