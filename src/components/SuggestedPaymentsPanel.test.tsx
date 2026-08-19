/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SuggestedPaymentsPanel } from "./SuggestedPaymentsPanel";
import { Payment } from "../types";

describe("SuggestedPaymentsPanel (Header hierarchy, Cards & CTA)", () => {
  afterEach(() => {
    cleanup();
  });

  const selectedDate = new Date("2026-08-15T12:00:00.000Z");

  it("returns null and renders nothing when there are no suggested payments", () => {
    const { container } = render(
      <SuggestedPaymentsPanel
        currency="PLN"
        payments={[]}
        selectedDate={selectedDate}
        onAddPayment={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders panel with eyebrow, title, count badge, and structured card when previous month payments exist", () => {
    const prevMonthPayment: Payment = {
      id: "pay-1",
      name: "Internet Światłowód",
      amount: 89.99,
      dueDate: "2026-07-20",
      status: "Opłacono",
      category: "Rachunki",
      currency: "PLN",
    };

    render(
      <SuggestedPaymentsPanel
        currency="PLN"
        payments={[prevMonthPayment]}
        selectedDate={selectedDate}
        onAddPayment={vi.fn()}
      />
    );

    expect(screen.getByText("Sugestie Cykliczne")).toBeTruthy();
    expect(screen.getByText("Rachunki z poprzedniego miesiąca")).toBeTruthy();
    expect(screen.getByText("1 do dodania")).toBeTruthy();
    expect(screen.getByText("Internet Światłowód")).toBeTruthy();
    expect(screen.getByText(/89,99/)).toBeTruthy();
    expect(screen.getByText(/do 20/)).toBeTruthy();
  });

  it("calls onAddPayment with calculated current month date when clicking Dodaj button", () => {
    const onAddPayment = vi.fn();
    const prevMonthPayment: Payment = {
      id: "pay-2",
      name: "Netflix Premium",
      amount: 60,
      dueDate: "2026-07-10",
      status: "Opłacono",
      category: "Subskrypcje",
      currency: "PLN",
    };

    render(
      <SuggestedPaymentsPanel
        currency="PLN"
        payments={[prevMonthPayment]}
        selectedDate={selectedDate}
        onAddPayment={onAddPayment}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Dodaj rachunek Netflix Premium/i });
    expect(addBtn).toBeTruthy();
    fireEvent.click(addBtn);

    expect(onAddPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Netflix Premium",
        amount: 60,
        status: "Do opłacenia",
        category: "Subskrypcje",
      })
    );
  });
});
