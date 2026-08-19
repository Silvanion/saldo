/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { ChangelogModal } from "./ChangelogModal";

describe("ChangelogModal Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(<ChangelogModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders changelog entries and v1.1.0 release details when open", () => {
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Historia Zmian")).toBeTruthy();
    expect(screen.getByText("Co nowego w Saldo?")).toBeTruthy();
    expect(screen.getByText("v1.1.0")).toBeTruthy();
    expect(screen.getByText("Centrum Pomocy 2.0, Żywe Makiety UI, Konta z Buforem i Globalny Polish")).toBeTruthy();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(<ChangelogModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText("Zamknij");
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
