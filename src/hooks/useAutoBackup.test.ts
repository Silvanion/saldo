// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoBackup } from "./useAutoBackup";
import * as localDb from "../services/localDb";

describe("useAutoBackup (UX-01)", () => {
  const writeAutoBackup = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    writeAutoBackup.mockReset().mockResolvedValue({ ok: true });
    (window as any).electronAPI = { writeAutoBackup };
    vi.spyOn(localDb, "loadState").mockResolvedValue({ profiles: [{ id: "p1", name: "x", encryptedPayload: "{\"iv\":\"a\",\"data\":\"b\"}" }] } as any);
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); delete (window as any).electronAPI; });

  it("zapisuje kopię po opóźnieniu, a treścią jest stan z bazy lokalnej (nie ze stanu Reacta)", async () => {
    renderHook(() => useAutoBackup("2026-11-13T10:00:00Z", 1, 1000));
    expect(writeAutoBackup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(writeAutoBackup).toHaveBeenCalledOnce();
    expect(JSON.parse(writeAutoBackup.mock.calls[0][0]).profiles[0].encryptedPayload).toContain("iv");
  });

  it("kolejne szybkie zmiany resetują odliczanie (jedna kopia, nie seria)", async () => {
    const { rerender } = renderHook(({ t }) => useAutoBackup(t, 1, 1000), { initialProps: { t: "a" } });
    await vi.advanceTimersByTimeAsync(600);
    rerender({ t: "b" });
    await vi.advanceTimersByTimeAsync(600);
    expect(writeAutoBackup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(writeAutoBackup).toHaveBeenCalledOnce();
  });

  it("nic nie robi bez Electrona, bez profili lub bez stanu", async () => {
    delete (window as any).electronAPI;
    renderHook(() => useAutoBackup("a", 1, 10));
    renderHook(() => useAutoBackup("a", 0, 10));
    (window as any).electronAPI = { writeAutoBackup };
    renderHook(() => useAutoBackup(undefined, 1, 10));
    await vi.advanceTimersByTimeAsync(50);
    expect(writeAutoBackup).not.toHaveBeenCalled();
  });

  it("błąd zapisu nie przerywa aplikacji", async () => {
    writeAutoBackup.mockRejectedValue(new Error("dysk pełny"));
    renderHook(() => useAutoBackup("a", 1, 10));
    await expect(vi.advanceTimersByTimeAsync(50)).resolves.not.toThrow();
  });
});
