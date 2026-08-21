/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DebtsView } from "./DebtsView";

describe("DebtsView (Sprint 0 Mock)", () => {
  afterEach(cleanup);

  it("renders the module header, top actions, and 8 KPI indicators", () => {
    render(<DebtsView showToast={vi.fn()} />);

    expect(screen.getByText("Kredyty i Hipoteka")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dodaj zobowiązanie/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Porównaj strategie/i })).toBeTruthy();

    // Check KPIs
    expect(screen.getByText("Łączne saldo")).toBeTruthy();
    expect(screen.getByText("Miesięczna obsługa")).toBeTruthy();
    expect(screen.getByText("Pozostałe odsetki")).toBeTruthy();
    expect(screen.getByText("Śr. koszt długu (WACD)")).toBeTruthy();
    expect(screen.getByText("Najdroższy dług")).toBeTruthy();
    expect(screen.getByText("Najbliższa płatność")).toBeTruthy();
    expect(screen.getByText("Refi alert")).toBeTruthy();
    expect(screen.getAllByText("Potencjał nadpłaty").length).toBeGreaterThanOrEqual(1);
  });

  it("renders sample debt cards and allows filtering by category", () => {
    render(<DebtsView showToast={vi.fn()} />);

    // Default renders all
    expect(screen.getAllByText("Hipoteka mieszkanie").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Karta kredytowa Visa Gold")).toBeTruthy();
    expect(screen.getByText("Kredyt gotówkowy na remont")).toBeTruthy();
    expect(screen.getByText("Allegro Pay / PayPo (Sprzęt AGD)")).toBeTruthy();

    // Filter by mortgage
    const mortgageFilter = screen.getByRole("button", { name: "Hipoteki" });
    fireEvent.click(mortgageFilter);

    expect(screen.getAllByText("Hipoteka mieszkanie").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Karta kredytowa Visa Gold")).toBeNull();

    // Switch to all
    const allFilter = screen.getByRole("button", { name: /Wszystkie/i });
    fireEvent.click(allFilter);
    expect(screen.getByText("Karta kredytowa Visa Gold")).toBeTruthy();
  });

  it("opens debt details modal when clicking Szczegóły", () => {
    render(<DebtsView showToast={vi.fn()} />);

    const detailsButtons = screen.getAllByText("Szczegóły");
    fireEvent.click(detailsButtons[0]);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Harmonogram spłat")).toBeTruthy();
    expect(screen.getByText("Koszty i warunki umowy")).toBeTruthy();
  });

  it("switches to Scenariusze and Wiedza tabs", () => {
    const { container } = render(<DebtsView showToast={vi.fn()} />);

    const scenariosTab = container.querySelector("#tab-btn-scenarios") as HTMLButtonElement;
    fireEvent.click(scenariosTab);
    expect(screen.getByText("Porównanie strategii spłaty całego portfela")).toBeTruthy();
    expect(screen.getByText("Lawina zadłużenia (Najwyższy APR)")).toBeTruthy();

    const knowledgeTab = container.querySelector("#tab-btn-knowledge") as HTMLButtonElement;
    fireEvent.click(knowledgeTab);
    expect(screen.getByText("Stała vs Zmienna stopa: kiedy warto refinansować?")).toBeTruthy();
  });
});
