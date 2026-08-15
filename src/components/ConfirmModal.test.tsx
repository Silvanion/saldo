/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ConfirmModal } from "./ConfirmModal";
import { ConfirmPayload } from "../uiTypes";

describe("ConfirmModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when isOpen is false", () => {
    const payload: ConfirmPayload = {
      title: "Tytuł",
      message: "Treść",
      onConfirm: vi.fn()
    };
    const { container } = render(
      <ConfirmModal isOpen={false} onClose={vi.fn()} payload={payload} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal content when open", () => {
    const payload: ConfirmPayload = {
      title: "Czy na pewno?",
      message: "To jest nieodwracalne.",
      confirmLabel: "Tak, usuń",
      cancelLabel: "Nie, wróć",
      tone: "danger",
      onConfirm: vi.fn()
    };

    render(<ConfirmModal isOpen={true} onClose={vi.fn()} payload={payload} />);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Czy na pewno?")).toBeTruthy();
    expect(screen.getByText("To jest nieodwracalne.")).toBeTruthy();
    expect(screen.getByText("Tak, usuń")).toBeTruthy();
    expect(screen.getByText("Nie, wróć")).toBeTruthy();
  });

  it("calls onClose when cancel button is clicked without calling onConfirm", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const payload: ConfirmPayload = {
      title: "Tytuł",
      message: "Treść",
      onConfirm
    };

    render(<ConfirmModal isOpen={true} onClose={onClose} payload={payload} />);

    fireEvent.click(screen.getByText("Anuluj"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm exactly once and closes on confirmation", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const payload: ConfirmPayload = {
      title: "Tytuł",
      message: "Treść",
      confirmLabel: "Potwierdź operację",
      onConfirm
    };

    render(<ConfirmModal isOpen={true} onClose={onClose} payload={payload} />);

    const confirmBtn = screen.getByText("Potwierdź operację");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("disables buttons during async submission to prevent double clicks", async () => {
    let resolveConfirm: () => void = () => {};
    const onConfirm = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        })
    );
    const onClose = vi.fn();
    const payload: ConfirmPayload = {
      title: "Tytuł",
      message: "Treść",
      confirmLabel: "Potwierdź wykonanie",
      onConfirm
    };

    render(<ConfirmModal isOpen={true} onClose={onClose} payload={payload} />);

    const confirmBtn = screen.getByText("Potwierdź wykonanie");
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn); // attempt second click

    expect(onConfirm).toHaveBeenCalledTimes(1);

    // Resolve promise
    resolveConfirm();
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
