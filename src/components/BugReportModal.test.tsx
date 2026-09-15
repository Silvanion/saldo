/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { BugReportModal } from "./BugReportModal";
import { submitBugReport } from "../firebase";

vi.mock("../firebase", () => ({
  isFirebaseConfigured: true,
  submitBugReport: vi.fn(),
}));

function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText("Niedziałający przycisk dodawania..."), { target: { value: "Tytuł błędu" } });
  fireEvent.change(screen.getByPlaceholderText("Kroki by odtworzyć błąd..."), { target: { value: "Opis błędu" } });
  fireEvent.click(screen.getByText("Wyślij Zgłoszenie"));
}

describe("BugReportModal", () => {
  afterEach(() => {
    cleanup();
    vi.mocked(submitBugReport).mockReset();
    delete (window as any).location;
    (window as any).location = { href: "" };
  });

  it("submits the report with the current app version attached", async () => {
    vi.mocked(submitBugReport).mockResolvedValueOnce(undefined);
    render(<BugReportModal isOpen={true} onClose={vi.fn()} />);

    fillAndSubmit();

    await waitFor(() => expect(submitBugReport).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(submitBugReport).mock.calls[0][0];
    expect(payload.title).toBe("Tytuł błędu");
    expect(payload.appVersion).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Twoje zgłoszenie zostało wysłane.")).toBeTruthy());
  });

  it("falls back to a pre-filled email draft when the Firestore write fails, instead of a dead end", async () => {
    vi.mocked(submitBugReport).mockRejectedValueOnce(new Error("permission-denied"));
    render(<BugReportModal isOpen={true} onClose={vi.fn()} />);

    fillAndSubmit();

    await waitFor(() => expect(window.location.href).toContain("mailto:kontakt@saldo.app"));
    await waitFor(() => expect(screen.getByText(/Otworzyliśmy gotowy e-mail/)).toBeTruthy());
  });
});
