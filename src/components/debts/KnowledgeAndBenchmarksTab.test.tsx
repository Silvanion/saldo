/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { KnowledgeAndBenchmarksTab } from "./KnowledgeAndBenchmarksTab";
import { DebtItem } from "../../types";

const mockMortgageBase: DebtItem = {
  id: "1",
  name: "Kredyt Hipoteczny",
  institution: "Bank",
  type: "mortgage",
  currency: "PLN",
  balance: 300000,
  monthlyPayment: 2500,
  interestRate: 6.85,
  status: "active",
  createdAt: "2026-01-01"
};

describe("KnowledgeAndBenchmarksTab — Porównanie Marży", () => {
  afterEach(() => cleanup());

  it("pokazuje fallback gdy kredyt hipoteczny nie ma podanej marży", () => {
    render(<KnowledgeAndBenchmarksTab activeDebts={[mockMortgageBase]} onNavigateToTools={() => {}} />);
    
    // Fallback text
    expect(screen.getByText("Podaj marżę z umowy, aby zobaczyć orientacyjne porównanie.")).toBeTruthy();
    // interestRate without margin does not activate the actual comparison rendering
    expect(screen.queryByText(/Twoja marża z umowy kredytowej/)).toBeNull();
  });

  it("pokazuje spersonalizowane porównanie gdy kredyt hipoteczny ma margin", () => {
    const mortgageWithMargin = { ...mockMortgageBase, margin: 2.1 };
    render(<KnowledgeAndBenchmarksTab activeDebts={[mortgageWithMargin]} onNavigateToTools={() => {}} />);
    
    // User margin displayed
    expect(screen.getByText("2.10%")).toBeTruthy();
    expect(screen.getByText("Twoja marża z umowy kredytowej.")).toBeTruthy();
    
    // Benchmark range is rendered
    expect(screen.getAllByText(/1.49% – 3.55%/).length).toBeGreaterThan(0);
    
    // Relation logic check (2.1 is within 1.49 - 3.55)
    expect(screen.getByText(/mieści się w obserwowanym zakresie/)).toBeTruthy();
    
    // Date and Source
    expect(screen.getByText(/Data benchmarku: 2026-08-01/)).toBeTruthy();
    expect(screen.getAllByText(/Raport rynkowy \(Totalmoney\)/).length).toBeGreaterThan(0);
    
    // Microcopy
    expect(screen.getByText(/Benchmark orientacyjny/)).toBeTruthy();
    expect(screen.getByText(/To porównanie ma charakter informacyjny, nie stanowi rekomendacji/)).toBeTruthy();
  });

  it("pokazuje poprawne komunikaty dla marży poza zakresem", () => {
    const { rerender } = render(<KnowledgeAndBenchmarksTab activeDebts={[{ ...mockMortgageBase, margin: 1.0 }]} onNavigateToTools={() => {}} />);
    expect(screen.getByText(/jest poniżej obserwowanego zakresu/)).toBeTruthy();

    rerender(<KnowledgeAndBenchmarksTab activeDebts={[{ ...mockMortgageBase, margin: 4.5 }]} onNavigateToTools={() => {}} />);
    expect(screen.getByText(/jest powyżej obserwowanego zakresu/)).toBeTruthy();
  });
});
