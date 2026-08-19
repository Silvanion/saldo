/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import { ModalFallback } from "./ModalFallback";

describe("ModalFallback", () => {
  it("renders with role='status' and accessible label", () => {
    render(<ModalFallback label="Ładowanie modułu testowego..." />);

    const statusEl = screen.getByRole("status");
    expect(statusEl).toBeDefined();
    expect(statusEl.getAttribute("aria-label")).toBe("Ładowanie okna dialogowego...");
    expect(screen.getByText("Ładowanie modułu testowego...")).toBeDefined();
  });

  it("renders with default label when none provided", () => {
    render(<ModalFallback />);

    expect(screen.getByText("Ładowanie...")).toBeDefined();
  });
});
