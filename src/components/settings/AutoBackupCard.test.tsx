/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { AutoBackupCard } from "./AutoBackupCard";

const api = (over: any = {}) => ({
  listAutoBackups: vi.fn().mockResolvedValue([{ name: "saldo-auto-2026-11-13.json", date: "2026-11-13", size: 2048, modifiedAt: "x" }, { name: "saldo-auto-2026-11-12.json", date: "2026-11-12", size: 1024, modifiedAt: "y" }]),
  readAutoBackup: vi.fn().mockResolvedValue({ ok: true, json: "{\"profiles\":[]}" }),
  openBackupsFolder: vi.fn().mockResolvedValue(undefined),
  ...over
});

describe("AutoBackupCard", () => {
  afterEach(() => { cleanup(); delete (window as any).electronAPI; });

  it("nie renderuje się w przeglądarce (brak Electrona)", () => {
    const { container } = render(<AutoBackupCard onRestore={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("pokazuje listę kopii i przywraca wybraną przez istniejący podgląd importu", async () => {
    (window as any).electronAPI = api();
    const onRestore = vi.fn();
    render(<AutoBackupCard onRestore={onRestore} />);
    expect(await screen.findByText("2026-11-13")).toBeTruthy();
    expect(screen.getByText("2026-11-12")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /Przywróć/ })[0]);
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith("{\"profiles\":[]}"));
    expect((window as any).electronAPI.readAutoBackup).toHaveBeenCalledWith("saldo-auto-2026-11-13.json");
  });

  it("pokazuje stan pusty i otwiera folder kopii", async () => {
    (window as any).electronAPI = api({ listAutoBackups: vi.fn().mockResolvedValue([]) });
    render(<AutoBackupCard onRestore={vi.fn()} />);
    expect(await screen.findByText(/Brak kopii/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Otwórz folder kopii/ }));
    expect((window as any).electronAPI.openBackupsFolder).toHaveBeenCalled();
  });

  it("uczciwie opisuje ochronę kopii", async () => {
    (window as any).electronAPI = api();
    render(<AutoBackupCard onRestore={vi.fn()} />);
    expect(await screen.findByText(/bez PIN-u nie są zaszyfrowane/)).toBeTruthy();
  });
});
