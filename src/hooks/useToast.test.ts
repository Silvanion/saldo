/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useToast } from "./useToast";

describe("useToast", () => {
  it("should start with an empty toast list", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it("should add a success toast", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("Sukces!", "success");
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      message: "Sukces!",
      type: "success"
    });
  });

  it("should add an error toast", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("Błąd!", "error");
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      message: "Błąd!",
      type: "error"
    });
  });

  it("should allow manual dismissal of a toast", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("Wiadomość");
    });
    const toastId = result.current.toasts[0].id;
    
    act(() => {
      result.current.dismissToast(toastId);
    });
    
    expect(result.current.toasts).toHaveLength(0);
  });

  it("should auto-dismiss toast after a delay", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.showToast("Wiadomość z czasem");
    });
    
    expect(result.current.toasts).toHaveLength(1);
    
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(result.current.toasts).toHaveLength(0);
    vi.useRealTimers();
  });

  it("should not add empty or whitespace-only messages", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("   ", "info");
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it("should deduplicate identical active toasts", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast("Powtórzony błąd", "error");
      result.current.showToast("Powtórzony błąd", "error");
      result.current.showToast("Powtórzony błąd", "error");
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe("Powtórzony błąd");
  });
});
