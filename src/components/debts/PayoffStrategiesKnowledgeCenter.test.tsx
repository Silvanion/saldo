/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PayoffStrategiesKnowledgeCenter } from "./PayoffStrategiesKnowledgeCenter";

describe("PayoffStrategiesKnowledgeCenter", () => {
  afterEach(() => {
    cleanup();
  });

  it("1. renders all strategies when open and supports toggle disclosure", () => {
    render(<PayoffStrategiesKnowledgeCenter selectedStrategy="avalanche" />);

    // Trigger button starts with aria-expanded="false"
    const toggleBtn = screen.getByRole("button", { name: /Jak działają strategie spłaty\?/i });
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");

    // Open disclosure
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");

    // All strategies are present
    expect(screen.getAllByText("Lawina (Avalanche)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Kula Śnieżna (Snowball)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Własna kolejność (Custom)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Status Quo (Plan bazowy)").length).toBeGreaterThanOrEqual(1);

    // Specific strategy rules are explained
    expect(screen.getByText(/najwyższym oprocentowaniem/i)).toBeTruthy();
    expect(screen.getByText(/najmniejszym saldem/i)).toBeTruthy();
    expect(screen.getByText(/ręcznie przez użytkownika/i)).toBeTruthy();
  });

  it("2. highlights active selected strategy semantically", () => {
    const { rerender } = render(
      <PayoffStrategiesKnowledgeCenter selectedStrategy="avalanche" defaultOpen={true} />
    );

    expect(screen.getByText(/Wybrana strategia:/i)).toBeTruthy();
    const activeCard = document.querySelector('[data-selected="true"]');
    expect(activeCard?.textContent).toContain("Lawina (Avalanche)");

    rerender(<PayoffStrategiesKnowledgeCenter selectedStrategy="snowball" defaultOpen={true} />);
    const snowballCard = document.querySelector('[data-selected="true"]');
    expect(snowballCard?.textContent).toContain("Kula Śnieżna (Snowball)");
  });

  it("3. displays recommendation badge when recommendedStrategy is provided", () => {
    render(
      <PayoffStrategiesKnowledgeCenter
        selectedStrategy="snowball"
        recommendedStrategy="avalanche"
        defaultOpen={true}
      />
    );

    expect(screen.getByText("Sugerowana")).toBeTruthy();
  });

  it("4. invokes onSelectStrategy when action button is clicked", () => {
    const onSelect = vi.fn();
    render(
      <PayoffStrategiesKnowledgeCenter
        selectedStrategy="avalanche"
        onSelectStrategy={onSelect}
        defaultOpen={true}
      />
    );

    const snowballSelectBtn = screen.getByRole("button", { name: /Wybierz Kulę Śnieżną/i });
    fireEvent.click(snowballSelectBtn);

    expect(onSelect).toHaveBeenCalledWith("snowball");
  });

  it("5. works in static informational mode without callbacks without crashing", () => {
    render(<PayoffStrategiesKnowledgeCenter defaultOpen={true} />);

    expect(screen.getAllByText("Lawina (Avalanche)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Kula Śnieżna (Snowball)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Własna kolejność (Custom)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Jak interpretować wyniki symulacji?")).toBeTruthy();
    expect(screen.getByText(/Zastrzeżenie edukacyjne:/i)).toBeTruthy();
  });
});
