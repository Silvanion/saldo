/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { ChangelogModal } from "./ChangelogModal";
import { UpdateManager } from "../services/UpdateManager";

vi.mock("../services/UpdateManager", () => {
  const mockManager = {
    checkForUpdates: vi.fn(),
    getErrorMessage: vi.fn(() => null),
  };
  return { UpdateManager: { getInstance: () => mockManager } };
});

describe("ChangelogModal Component", () => {
  afterEach(() => {
    cleanup();
    vi.mocked(UpdateManager.getInstance().checkForUpdates).mockReset();
    vi.mocked(UpdateManager.getInstance().getErrorMessage).mockReturnValue(null);
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

  it("shows a simple, discoverable update-check button in the header", () => {
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);
    expect(document.getElementById("btn-check-for-updates")).toBeTruthy();
  });

  it("tells the user they are up to date when no update is found", async () => {
    vi.mocked(UpdateManager.getInstance().checkForUpdates).mockResolvedValueOnce(null);
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(document.getElementById("btn-check-for-updates")!);

    await waitFor(() => expect(screen.getByText("Masz najnowszą wersję Saldo.")).toBeTruthy());
  });

  it("defers to the floating UpdateToast (does not duplicate the version/download UI) when an update is found", async () => {
    vi.mocked(UpdateManager.getInstance().checkForUpdates).mockResolvedValueOnce({
      version: "v9.9.9", releaseNotes: "", publishedAt: "2026-01-01",
    });
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(document.getElementById("btn-check-for-updates")!);

    await waitFor(() => expect(screen.getByText(/zobacz szczegóły w powiadomieniu/)).toBeTruthy());
    expect(screen.queryByText(/v9\.9\.9/)).toBeNull();
  });

  it("points to the floating UpdateToast (does not duplicate the error text) when the check fails", async () => {
    vi.mocked(UpdateManager.getInstance().checkForUpdates).mockResolvedValueOnce(null);
    vi.mocked(UpdateManager.getInstance().getErrorMessage).mockReturnValue("Nie udało się sprawdzić aktualizacji.");
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(document.getElementById("btn-check-for-updates")!);

    await waitFor(() => expect(screen.getByText(/szczegóły błędu w powiadomieniu/)).toBeTruthy());
    expect(screen.queryByText("Nie udało się sprawdzić aktualizacji.")).toBeNull();
  });
});
