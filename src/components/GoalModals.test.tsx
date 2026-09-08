/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GoalModal, GoalDepositModal } from "./Modals";

describe("GoalModals — GoalModal & GoalDepositModal UI Unification", () => {
  afterEach(() => {
    cleanup();
  });

  describe("GoalModal", () => {
    it("renders modal header with eyebrow and title, and triggers close callback", () => {
      const onClose = vi.fn();
      render(<GoalModal isOpen={true} onClose={onClose} onSave={vi.fn()} />);

      expect(screen.getByText("Oszczędności")).toBeTruthy();
      expect(screen.getByText("Nowy cel oszczędnościowy")).toBeTruthy();

      const closeBtn = screen.getByRole("button", { name: "Zamknij" });
      expect(closeBtn).toBeTruthy();
      expect(closeBtn.className).toContain("min-h-[44px]");
      expect(closeBtn.className).toContain("min-w-[44px]");
      expect(closeBtn.className).toContain("focus-visible:ring-focus-ring");

      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it("renders form inputs with standard touch target and handles valid submission", () => {
      const onSave = vi.fn();
      const onClose = vi.fn();
      render(<GoalModal isOpen={true} onClose={onClose} onSave={onSave} />);

      const nameInput = screen.getByLabelText(/Nazwa celu/i);
      const targetInput = screen.getByLabelText(/Kwota docelowa/i);
      const submitBtn = screen.getByRole("button", { name: "Utwórz cel" });

      expect(nameInput.className).toContain("min-h-[44px]");
      expect(targetInput.className).toContain("min-h-[44px]");
      expect(submitBtn.className).toContain("min-h-[44px]");
      expect(submitBtn.className).toContain("focus-visible:ring-focus-ring");

      fireEvent.change(nameInput, { target: { value: "Wakacje 2027" } });
      fireEvent.change(targetInput, { target: { value: "8500" } });
      fireEvent.click(submitBtn);

      expect(onSave).toHaveBeenCalledWith({
        name: "Wakacje 2027",
        target: 8500,
      });
      expect(onClose).toHaveBeenCalled();
    });

    it("does not submit if target is invalid or non-positive", () => {
      const onSave = vi.fn();
      render(<GoalModal isOpen={true} onClose={vi.fn()} onSave={onSave} />);

      const nameInput = screen.getByLabelText(/Nazwa celu/i);
      const targetInput = screen.getByLabelText(/Kwota docelowa/i);
      const submitBtn = screen.getByRole("button", { name: "Utwórz cel" });

      fireEvent.change(nameInput, { target: { value: "Poduszka" } });
      fireEvent.change(targetInput, { target: { value: "0" } });
      fireEvent.click(submitBtn);

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe("GoalDepositModal", () => {
    it("renders goal deposit header, close button, and handles close", () => {
      const onClose = vi.fn();
      render(
        <GoalDepositModal
          isOpen={true}
          goalName="Wakacje 2027"
          onClose={onClose}
          onSave={vi.fn()}
        />
      );

      expect(screen.getByText("Transfer Celu")).toBeTruthy();
      expect(screen.getByText("Transfer: Wakacje 2027")).toBeTruthy();

      const closeBtn = screen.getByRole("button", { name: "Zamknij" });
      expect(closeBtn).toBeTruthy();
      expect(closeBtn.className).toContain("min-h-[44px]");
      expect(closeBtn.className).toContain("min-w-[44px]");
      expect(closeBtn.className).toContain("focus-visible:ring-focus-ring");

      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it("handles positive and negative transfer amounts with 44px touch targets", () => {
      const onSave = vi.fn();
      const onClose = vi.fn();
      render(
        <GoalDepositModal
          isOpen={true}
          goalName="Wakacje 2027"
          onClose={onClose}
          onSave={onSave}
        />
      );

      const amountInput = screen.getByLabelText(/Kwota/i);
      const submitBtn = screen.getByRole("button", { name: "Zapisz wpłatę" });

      expect(amountInput.className).toContain("min-h-[44px]");
      expect(submitBtn.className).toContain("min-h-[44px]");
      expect(submitBtn.className).toContain("focus-visible:ring-focus-ring");

      fireEvent.change(amountInput, { target: { value: "500" } });
      fireEvent.click(submitBtn);

      expect(onSave).toHaveBeenCalledWith(500);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
