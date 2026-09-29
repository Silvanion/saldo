/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { StatementFolderWatchCard } from "./StatementFolderWatchCard";

describe("StatementFolderWatchCard", () => {
  afterEach(() => {
    cleanup();
    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  it("nie renderuje się w przeglądarce (bez Electrona)", () => {
    const { container } = render(<StatementFolderWatchCard />);
    expect(container.childElementCount).toBe(0);
  });

  it("pokazuje wybrany folder, pozwala go zmienić i wyłączyć", async () => {
    window.electronAPI = {
      getImportWatchFolder: vi.fn().mockResolvedValue("C:\\Wyciagi"),
      chooseImportWatchFolder: vi.fn().mockResolvedValue("D:\\Nowy"),
      clearImportWatchFolder: vi.fn().mockResolvedValue(null)
    } as unknown as typeof window.electronAPI;

    render(<StatementFolderWatchCard />);
    await waitFor(() => expect(screen.getByTestId("statement-folder-path").textContent).toBe("C:\\Wyciagi"));

    fireEvent.click(screen.getByText("Zmień folder"));
    await waitFor(() => expect(screen.getByTestId("statement-folder-path").textContent).toBe("D:\\Nowy"));

    fireEvent.click(screen.getByText("Wyłącz"));
    await waitFor(() => expect(screen.getByTestId("statement-folder-path").textContent).toBe("Nie wybrano folderu"));
  });
});
