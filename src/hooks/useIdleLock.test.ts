// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useIdleLock } from "./useIdleLock";

// Automatyczna blokada po bezczynności to kluczowy mechanizm ochrony danych (SEC-05) — dotąd bez żadnego testu.
describe("useIdleLock", () => {
  const onLock = vi.fn();
  const setVisibility = (state: "visible" | "hidden") => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
    document.dispatchEvent(new Event("visibilitychange"));
  };
  beforeEach(() => { vi.useFakeTimers(); onLock.mockReset(); setVisibility("visible"); });
  afterEach(() => { cleanup(); vi.useRealTimers(); }); // bez globals Vitest nie odmontowuje hooków sam

  it("blokuje dokładnie po upływie limitu bezczynności", () => {
    renderHook(() => useIdleLock({ isEnabled: true, timeoutMs: 5000, onLock }));
    vi.advanceTimersByTime(4999);
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onLock).toHaveBeenCalledOnce();
  });

  it("aktywność użytkownika (mysz, klawiatura, dotyk, klik, przewijanie) odnawia odliczanie", () => {
    renderHook(() => useIdleLock({ isEnabled: true, timeoutMs: 5000, onLock }));
    for (const ev of ["mousemove", "keydown", "touchstart", "click", "scroll"]) {
      vi.advanceTimersByTime(4000);
      document.dispatchEvent(new Event(ev));
    }
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5001);
    expect(onLock).toHaveBeenCalledOnce();
  });

  it("nie blokuje, gdy wyłączony lub limit <= 0", () => {
    renderHook(() => useIdleLock({ isEnabled: false, timeoutMs: 1000, onLock }));
    renderHook(() => useIdleLock({ isEnabled: true, timeoutMs: 0, onLock }));
    vi.advanceTimersByTime(60_000);
    expect(onLock).not.toHaveBeenCalled();
  });

  it("aktywność na ukrytej karcie nie odnawia odliczania — blokada nadal nastąpi", () => {
    renderHook(() => useIdleLock({ isEnabled: true, timeoutMs: 5000, onLock }));
    setVisibility("hidden");
    vi.advanceTimersByTime(3000);
    document.dispatchEvent(new Event("mousemove")); // ignorowane na ukrytej karcie
    vi.advanceTimersByTime(2100);
    expect(onLock).toHaveBeenCalledOnce();
  });

  it("powrót na kartę odnawia odliczanie", () => {
    renderHook(() => useIdleLock({ isEnabled: true, timeoutMs: 5000, onLock }));
    setVisibility("hidden");
    vi.advanceTimersByTime(4000);
    setVisibility("visible");
    vi.advanceTimersByTime(4000);
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1100);
    expect(onLock).toHaveBeenCalledOnce();
  });

  it("po odmontowaniu timer i nasłuchiwanie są zdjęte (brak późnej blokady)", () => {
    const { unmount } = renderHook(() => useIdleLock({ isEnabled: true, timeoutMs: 5000, onLock }));
    unmount();
    vi.advanceTimersByTime(60_000);
    expect(onLock).not.toHaveBeenCalled();
  });

  it("używa najnowszej wersji onLock bez resetowania odliczania", () => {
    const first = vi.fn(); const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useIdleLock({ isEnabled: true, timeoutMs: 5000, onLock: cb }), { initialProps: { cb: first } });
    vi.advanceTimersByTime(3000);
    rerender({ cb: second });
    vi.advanceTimersByTime(2100);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
