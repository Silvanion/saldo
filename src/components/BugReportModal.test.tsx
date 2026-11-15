/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { BugReportModal } from "./BugReportModal";

function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText("Niedziałający przycisk dodawania..."), { target: { value: "Tytuł błędu" } });
  fireEvent.change(screen.getByPlaceholderText("Kroki by odtworzyć błąd..."), { target: { value: "Opis błędu" } });
  fireEvent.click(screen.getByText("Otwórz zgłoszenie na GitHubie"));
}

describe("BugReportModal (zgłoszenia przez GitHub Issues)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("otwiera gotowy formularz issue z tytułem, opisem i wersją aplikacji — bez wysyłania czegokolwiek z aplikacji", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    render(<BugReportModal isOpen={true} onClose={vi.fn()} />);

    fillAndSubmit();

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [href, target, features] = openSpy.mock.calls[0];
    const url = new URL(String(href));
    expect(`${url.origin}${url.pathname}`).toBe("https://github.com/Silvanion/saldo/issues/new");
    expect(url.searchParams.get("title")).toBe("[Błąd] Tytuł błędu");
    expect(url.searchParams.get("description")).toBe("Opis błędu");
    expect(url.searchParams.get("version")).toBeTruthy();
    expect(target).toBe("_blank");
    expect(features).toContain("noopener");
    expect(screen.getByText(/Otworzyliśmy formularz zgłoszenia na GitHubie/)).toBeTruthy();
  });

  it("wymaga tytułu i opisu", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    render(<BugReportModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.submit(screen.getByText("Otwórz zgłoszenie na GitHubie").closest("form")!);
    expect(openSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Tytuł i opis są wymagane.")).toBeTruthy();
  });

  it("nie zbiera już e-maila ani zrzutu ekranu i jasno mówi, że zgłoszenie jest publiczne", () => {
    render(<BugReportModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.queryByText(/Twój e-mail/)).toBeNull();
    expect(screen.queryByText(/Zrzut ekranu/)).toBeNull();
    expect(screen.getByText(/publiczne/)).toBeTruthy();
  });
});
