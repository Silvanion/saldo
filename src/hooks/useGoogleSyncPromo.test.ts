// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGoogleSyncPromo } from "./useGoogleSyncPromo";
import { Profile } from "../types";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "p1",
    name: "Test",
    kind: "personal",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    currency: "PLN",
    budgets: {},
    ...overrides,
  };
}

describe("useGoogleSyncPromo", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
        clear: () => { store.clear(); },
      },
      writable: true,
      configurable: true,
    });
  });

  it("is not eligible when the profile has no transactions yet", () => {
    const { result } = renderHook(() => useGoogleSyncPromo(makeProfile(), null));
    expect(result.current.eligible).toBe(false);
  });

  it("is eligible once the profile has at least one transaction and no google user", () => {
    const profile = makeProfile({
      transactions: [{ id: "t1", name: "x", amount: 10, type: "expense", category: "Inne", account: "A", isoDate: "2026-01-01", currency: "PLN" }],
    });
    const { result } = renderHook(() => useGoogleSyncPromo(profile, null));
    expect(result.current.eligible).toBe(true);
  });

  it("is not eligible when a google user is already connected", () => {
    const profile = makeProfile({
      transactions: [{ id: "t1", name: "x", amount: 10, type: "expense", category: "Inne", account: "A", isoDate: "2026-01-01", currency: "PLN" }],
    });
    const { result } = renderHook(() => useGoogleSyncPromo(profile, { uid: "u1" }));
    expect(result.current.eligible).toBe(false);
  });

  it("stops being eligible after dismiss and stays dismissed on remount", () => {
    const profile = makeProfile({
      transactions: [{ id: "t1", name: "x", amount: 10, type: "expense", category: "Inne", account: "A", isoDate: "2026-01-01", currency: "PLN" }],
    });
    const { result } = renderHook(() => useGoogleSyncPromo(profile, null));
    expect(result.current.eligible).toBe(true);

    act(() => result.current.dismiss());
    expect(result.current.eligible).toBe(false);

    const { result: result2 } = renderHook(() => useGoogleSyncPromo(profile, null));
    expect(result2.current.eligible).toBe(false);
  });
});
