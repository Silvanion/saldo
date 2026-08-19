/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

// Component that throws on demand
function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Testowy błąd komponentu");
  }
  return <div>Zawartość bezpieczna</div>;
}

describe("ErrorBoundary", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    cleanup();
    console.error = originalConsoleError;
  });

  it("renders children normally when there is no error", () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Zawartość bezpieczna")).toBeDefined();
  });

  it("renders accessible fallback alert when child throws", () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(screen.getByText("Wystąpił nieoczekiwany problem")).toBeDefined();
    expect(
      screen.getByText("Nie udało się załadować tego widoku lub modułu. Twoje lokalne dane są w pełni bezpieczne.")
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /Spróbuj ponownie/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Odśwież aplikację/i })).toBeDefined();
  });

  it("supports retry and remounts successfully when condition resolves", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeDefined();

    // Rerender with healthy child and click retry
    rerender(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    const retryBtn = screen.getByRole("button", { name: /Spróbuj ponownie/i });
    fireEvent.click(retryBtn);

    expect(screen.getByText("Zawartość bezpieczna")).toBeDefined();
  });

  it("renders custom title, message and home button when configured", () => {
    const onNavigateHome = vi.fn();
    render(
      <ErrorBoundary
        title="Błąd widoku budżetu"
        message="Wystąpił problem z ładowaniem modułu budżetowego."
        showHomeButton={true}
        onNavigateHome={onNavigateHome}
      >
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Błąd widoku budżetu")).toBeDefined();
    expect(screen.getByText("Wystąpił problem z ładowaniem modułu budżetowego.")).toBeDefined();

    const homeBtn = screen.getByRole("button", { name: /Wróć do Przeglądu/i });
    expect(homeBtn).toBeDefined();
    fireEvent.click(homeBtn);
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });
});
