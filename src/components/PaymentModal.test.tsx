/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PaymentModal } from "./PaymentModal";

let mockAppState = {
  profiles: [
    {
      id: "p1",
      name: "Konto Główne",
      kind: "personal" as const,
      currency: "PLN",
      payments: [],
    },
  ],
  activeProfileId: "p1",
};

vi.mock("../app/providers/AppContext", () => ({
  useApp: () => ({
    state: mockAppState,
  }),
}));

describe("PaymentModal (Header, Footer, Labels & Currency)", () => {
  beforeEach(() => {
    mockAppState = {
      profiles: [
        {
          id: "p1",
          name: "Konto Główne",
          kind: "personal" as const,
          currency: "PLN",
          payments: [],
        },
      ],
      activeProfileId: "p1",
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("renders modal header with eyebrow and title, and handles close button click", () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    expect(screen.getByText("Nowa Płatność")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Dodaj rachunek" })).toBeTruthy();

    const closeBtn = screen.getByRole("button", { name: "Zamknij" });
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders secondary 'Anuluj' button in footer and triggers onClose when clicked", () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "Anuluj" });
    expect(cancelBtn).toBeTruthy();
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays dynamic currency in the amount label", () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/Kwota \(PLN\)/i)).toBeTruthy();
  });

  it("submits form and calls onSave with valid payment data", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/np\. Prąd Enea, Netflix, Internet/i);
    const amountInput = screen.getByPlaceholderText("0,00");
    const submitBtn = screen.getByRole("button", { name: "Dodaj płatność" });

    fireEvent.change(nameInput, { target: { value: "Czynsz Mieszkaniowy" } });
    fireEvent.change(amountInput, { target: { value: "2200" } });
    fireEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Czynsz Mieszkaniowy",
        amount: 2200,
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("renders shared-profile subsection with payer and split mode selects in shared profiles", () => {
    mockAppState = {
      profiles: [
        {
          id: "p-shared",
          name: "Seweryn",
          partnerName: "Aleksandra",
          kind: "shared" as const,
          currency: "PLN",
          payments: [],
        } as any,
      ],
      activeProfileId: "p-shared",
    };

    const onSave = vi.fn();
    render(
      <PaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    expect(screen.getByText("Rozliczenie Wspólne")).toBeTruthy();
    expect(screen.getByText("Podział kosztów")).toBeTruthy();
    expect(screen.getByLabelText("Kto płaci?")).toBeTruthy();
    expect(screen.getByLabelText("Dzielimy 50/50?")).toBeTruthy();

    const nameInput = screen.getByPlaceholderText(/np\. Prąd Enea, Netflix, Internet/i);
    const amountInput = screen.getByPlaceholderText("0,00");
    const submitBtn = screen.getByRole("button", { name: "Dodaj płatność" });

    fireEvent.change(nameInput, { target: { value: "Internet Wspólny" } });
    fireEvent.change(amountInput, { target: { value: "150" } });
    fireEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Internet Wspólny",
        amount: 150,
        paidBy: "me",
        splitMode: "equal",
      })
    );
  });

  it("renders warning banner when shared profile lacks partnerName", () => {
    mockAppState = {
      profiles: [
        {
          id: "p-shared-nopartner",
          name: "Seweryn",
          partnerName: "",
          kind: "shared" as const,
          currency: "PLN",
          payments: [],
        } as any,
      ],
      activeProfileId: "p-shared-nopartner",
    };

    render(
      <PaymentModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/Uzupełnij imię partnera w ustawieniach profilu/i)).toBeTruthy();
  });
});
