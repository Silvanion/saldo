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

describe("useProfileSecurity - lockSession (SEC-05)", () => {
  it("szyfruje profil, usuwa klucz z pamięci i podmienia stan na zaszyfrowany", async () => {
    const { activeKeys, clearActiveKeys, deriveKeyFromPin } = await import("../services/crypto");
    clearActiveKeys();
    activeKeys["p1"] = await deriveKeyFromPin("1234", "salt");
    const profile = makeProfile({
      pinHash: "h", salt: "salt",
      transactions: [{ id: "t1", name: "TAJNE", amount: 5, type: "expense", category: "Inne", isoDate: "2026-11-01" } as any],
    });
    const state: AppState = { profiles: [profile], activeProfileId: "p1" } as AppState;
    const saveState = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useProfileSecurity({ state, activeProfile: profile, saveState }));
    act(() => { result.current.unlockProfile("p1"); });
    expect(result.current.isProfileLocked).toBe(false);

    await act(async () => { await result.current.lockSession(); });

    expect(activeKeys["p1"]).toBeUndefined();
    expect(result.current.isProfileLocked).toBe(true);
    const saved = saveState.mock.calls[0][0] as AppState;
    expect(saved.profiles[0].transactions).toEqual([]);
    expect(saved.profiles[0].encryptedPayload).toBeTruthy();
    expect(JSON.stringify(saved)).not.toContain("TAJNE");
    expect(saveState.mock.calls[0][1]).toBe(true); // tylko lokalnie
  });

  it("blokada systemowa (onSystemLock) też kasuje klucz", async () => {
    const { activeKeys, clearActiveKeys, deriveKeyFromPin } = await import("../services/crypto");
    clearActiveKeys();
    activeKeys["p1"] = await deriveKeyFromPin("1234", "salt");
    let systemLock: () => void = () => {};
    (window as any).electronAPI = { onSystemLock: (cb: () => void) => { systemLock = cb; return () => {}; } };
    const profile = makeProfile({ pinHash: "h", salt: "salt" });
    const state: AppState = { profiles: [profile], activeProfileId: "p1" } as AppState;
    const saveState = vi.fn().mockResolvedValue(undefined);

    renderHook(() => useProfileSecurity({ state, activeProfile: profile, saveState }));
    await act(async () => { systemLock(); await Promise.resolve(); await Promise.resolve(); });

    await vi.waitFor(() => expect(activeKeys["p1"]).toBeUndefined());
    delete (window as any).electronAPI;
  });

  it("profil bez PIN: lockSession nic nie zapisuje", async () => {
    const profile = makeProfile();
    const state: AppState = { profiles: [profile], activeProfileId: "p1" } as AppState;
    const saveState = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useProfileSecurity({ state, activeProfile: profile, saveState }));
    await act(async () => { await result.current.lockSession(); });
    expect(saveState).not.toHaveBeenCalled();
  });
});


describe("useProfileSecurity - profil z formatem v2 (SEC-02 faza 2a)", () => {
  const v2Profile = () => makeProfile({ encryptedPayload: JSON.stringify({ v: 2, iv: "a", data: "b" }) });

  it("profil z payloadem v2 jest traktowany jako zablokowany mimo braku pinHash", () => {
    const profile = v2Profile();
    const state: AppState = { profiles: [profile], activeProfileId: "p1" } as AppState;
    const { result } = renderHook(() => useProfileSecurity({ state, activeProfile: profile, saveState: vi.fn() }));
    expect(result.current.isProfileLocked).toBe(true);
    expect(result.current.isNewerFormatProfile).toBe(true);
  });

  it("wybór takiego profilu go nie odblokowuje, ale ustawia go jako aktywny (by pokazać komunikat)", async () => {
    const profile = v2Profile();
    const state: AppState = { profiles: [profile], activeProfileId: null } as any;
    const saveState = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useProfileSecurity({ state, activeProfile: profile, saveState }));
    let ok = true;
    await act(async () => { ok = await result.current.handleSelectAndUnlockProfile(profile); });
    expect(ok).toBe(false);
    expect(result.current.isProfileLocked).toBe(true);
    expect(saveState.mock.calls[0][0].activeProfileId).toBe("p1");
  });

  it("odblokowanie PIN-em takiego profilu zawsze się nie udaje", async () => {
    const profile = { ...v2Profile(), pinHash: "h", salt: "s" };
    const state: AppState = { profiles: [profile], activeProfileId: "p1" } as AppState;
    const { result } = renderHook(() => useProfileSecurity({ state, activeProfile: profile, saveState: vi.fn() }));
    let ok = true;
    await act(async () => { ok = await result.current.handleUnlockProfile("1234"); });
    expect(ok).toBe(false);
  });
});
