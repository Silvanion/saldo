// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppState } from "./types";
import { useDriveSync } from "./hooks/useDriveSync";

const { updateBudgetFile } = vi.hoisted(() => ({
  updateBudgetFile: vi.fn()
}));

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
  }
});
Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

vi.mock("./googleDrive", () => ({
  findBudgetFile: vi.fn(),
  readBudgetFile: vi.fn(),
  updateBudgetFile,
  createBudgetFile: vi.fn()
}));

vi.mock("./services/crypto", () => ({
  prepareStateForRemoteSave: vi.fn(async () => ({
    profiles: [
      {
        id: "profile-1",
        name: "Profil PIN",
        kind: "personal",
        encryptedPayload: "{\"iv\":[],\"data\":[]}",
        transactions: []
      }
    ],
    activeProfileId: "profile-1",
    driveFileId: "drive-file-1",
    updatedAt: "2026-09-11T10:00:00.000Z",
    schemaVersion: 1,
    lastModifiedBy: "test@example.com",
    recurringRules: [],
    transactionRules: []
  })),
  decryptProfile: vi.fn(),
  activeKeys: {}
}));

describe("useDriveSync", () => {
  it("preserves the decrypted local state after uploading an encrypted backup", async () => {
    const state: AppState = {
      profiles: [
        {
          id: "profile-1",
          name: "Profil PIN",
          kind: "personal",
          pinHash: "hash",
          transactions: [
            {
              id: "transaction-1",
              name: "Zakupy",
              amount: 50,
              type: "expense",
              category: "Jedzenie",
              account: "Konto główne",
              isoDate: "2026-09-11",
              currency: "PLN"
            }
          ],
          payments: [],
          goals: [],
          investments: [],
          budgets: {},
          currency: "PLN"
        }
      ],
      activeProfileId: "profile-1",
      driveFileId: "drive-file-1",
      updatedAt: "2026-09-11T10:00:00.000Z",
      schemaVersion: 1,
      lastModifiedBy: "test@example.com",
      recurringRules: [],
      transactionRules: []
    };
    const onImportState = vi.fn();

    const { result } = renderHook(() =>
      useDriveSync({
        driveToken: "drive-token",
        state,
        onImportState,
        onBeforeRestore: vi.fn(),
        onDriveAuthInvalid: vi.fn()
      })
    );

    await act(async () => {
      await result.current.backupToDriveManual({ forceAction: "upload_local" });
    });

    expect(updateBudgetFile).toHaveBeenCalledWith(
      "drive-token",
      "drive-file-1",
      expect.objectContaining({
        profiles: [
          expect.objectContaining({
            encryptedPayload: expect.any(String),
            transactions: []
          })
        ]
      })
    );
    expect(onImportState).toHaveBeenCalledWith(
      expect.objectContaining({
        driveFileId: "drive-file-1",
        profiles: [
          expect.objectContaining({
            transactions: [
              expect.objectContaining({ id: "transaction-1", name: "Zakupy" })
            ]
          })
        ]
      })
    );
  });
});
