// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProfileSecurity } from "./useProfileSecurity";
import { BiometricService } from "../services/BiometricService";
import { AppState, Profile } from "../types";

vi.mock("../services/BiometricService", () => ({
  BiometricService: { removeBiometrics: vi.fn().mockResolvedValue({ success: true }) },
}));

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "p1", name: "Test", kind: "personal",
    transactions: [], payments: [], goals: [], investments: [],
    currency: "PLN", budgets: {},
    ...overrides,
  };
}

describe("useProfileSecurity - handleSetProfilePin biometric invalidation", () => {
  afterEach(() => {
    vi.mocked(BiometricService.removeBiometrics).mockClear();
  });

  it("removes the native biometric secret when a new PIN is set, so a stale one can't silently mismatch later", async () => {
    const profile = makeProfile();
    const state: AppState = { profiles: [profile], activeProfileId: "p1" } as AppState;
    const saveState = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProfileSecurity({ state, activeProfile: profile, saveState }));

    await act(async () => {
      await result.current.handleSetProfilePin("1234");
    });

    expect(BiometricService.removeBiometrics).toHaveBeenCalledWith("p1");
  });

  it("also removes the native biometric secret when the PIN is cleared", async () => {
    const profile = makeProfile({ pinHash: "existinghash", salt: "s" });
    const state: AppState = { profiles: [profile], activeProfileId: "p1" } as AppState;
    const saveState = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProfileSecurity({ state, activeProfile: profile, saveState }));

    await act(async () => {
      await result.current.handleSetProfilePin(null);
    });

    expect(BiometricService.removeBiometrics).toHaveBeenCalledWith("p1");
  });
});
