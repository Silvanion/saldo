import { describe, it, expect, vi } from "vitest";
import { GoogleAuthError, findBudgetFile, readBudgetFile, updateBudgetFile } from "./googleDrive";
import { prepareStateForRemoteSave, deriveKeyFromPin, activeKeys, clearActiveKeys } from "./services/crypto";
import { AppState, Profile } from "./types";

describe("KROK 7 — OAuth Token Separation, Drive Errors & Data Protection", () => {
  it("GoogleAuthError correctly formats status 401 and 403", () => {
    const err401 = new GoogleAuthError("Expired token", 401);
    expect(err401.status).toBe(401);
    expect(err401.name).toBe("GoogleAuthError");
    expect(err401.message).toBe("Expired token");

    const err403 = new GoogleAuthError("Forbidden scope", 403);
    expect(err403.status).toBe(403);
  });

  it("Drive API handles 401/403 with GoogleAuthError and 404 with FILE_NOT_FOUND", async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    // 401 scenario
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized"
    });

    await expect(findBudgetFile("invalid-drive-token")).rejects.toThrow(GoogleAuthError);

    // 404 scenario
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "File Not Found"
    });

    await expect(readBudgetFile("valid-token", "non-existent-id")).rejects.toThrow("FILE_NOT_FOUND");
  });

  it("OAuth Token Separation — Drive operations send driveToken, not calendarToken or auth token", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [{ id: "drive-file-1", name: "saldo_budget.json" }] })
    });
    globalThis.fetch = mockFetch;

    const driveToken = "drive-access-token-abc";
    const calendarToken = "calendar-access-token-xyz";

    await findBudgetFile(driveToken);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("drive/v3/files"),
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${driveToken}`
        }
      })
    );
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${calendarToken}`
        }
      })
    );
  });

  it("prepareStateForRemoteSave encrypts profiles with PIN and leaves open profiles unchanged", async () => {
    clearActiveKeys();

    const pinProfileId = "prof-pin";
    const openProfileId = "prof-open";

    const key = await deriveKeyFromPin("1234", "salt123");
    activeKeys[pinProfileId] = key;

    const pinProfile: Profile = {
      id: pinProfileId,
      name: "Profil PIN",
      kind: "personal",
      pinHash: "hash123",
      salt: "salt123",
      transactions: [{ id: "t1", name: "Tajny Zakup", type: "expense", amount: 50, isoDate: "2026-01-01", category: "Jedzenie", account: "Główne" }],
      payments: [],
      goals: [],
      investments: [],
      currency: "PLN", budgets: {}
    };

    const openProfile: Profile = {
      id: openProfileId,
      name: "Profil Jawny",
      kind: "shared",
      transactions: [{ id: "t2", name: "Faktura Jawna", type: "income", amount: 2000, isoDate: "2026-01-02", category: "Usługi", account: "Firmowe" }],
      payments: [],
      goals: [],
      investments: [],
      currency: "PLN", budgets: {}
    };

    const state: AppState = {
      profiles: [pinProfile, openProfile],
      activeProfileId: pinProfileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00Z",
      lastModifiedBy: "test@example.com",
      driveFileId: "file-999",
      recurringRules: [],
      transactionRules: []
    };

    const prepared = await prepareStateForRemoteSave(state);

    const savedPinProfile = prepared.profiles.find((p) => p.id === pinProfileId)!;
    const savedOpenProfile = prepared.profiles.find((p) => p.id === openProfileId)!;

    // PIN profile must be encrypted
    expect(savedPinProfile.encryptedPayload).toBeDefined();
    expect(savedPinProfile.transactions).toHaveLength(0);

    // Open profile must remain plaintext
    expect(savedOpenProfile.encryptedPayload).toBeUndefined();
    expect(savedOpenProfile.transactions).toHaveLength(1);
    expect(savedOpenProfile.transactions[0].name).toBe("Faktura Jawna");
  });
});
