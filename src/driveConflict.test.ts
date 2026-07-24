import { describe, it, expect } from "vitest";
import { detectConflict } from "./hooks/useDriveSync";

describe("PROMPT C2 — detectConflict pure function tests", () => {
  it("1. returns false when local and remote updatedAt timestamps are identical", () => {
    const local = { updatedAt: "2026-07-23T12:00:00.000Z" };
    const remote = { updatedAt: "2026-07-23T12:00:00.000Z" };
    const lastSynced = "2026-07-23T10:00:00.000Z";

    expect(detectConflict(local, remote, lastSynced)).toBe(false);
  });

  it("2. returns true when both local and remote have newer changes than lastSyncedAt", () => {
    const local = { updatedAt: "2026-07-23T12:30:00.000Z" };
    const remote = { updatedAt: "2026-07-23T12:15:00.000Z" };
    const lastSynced = "2026-07-23T10:00:00.000Z";

    expect(detectConflict(local, remote, lastSynced)).toBe(true);
  });

  it("3. returns false when only local is newer than lastSyncedAt (remote unchanged)", () => {
    const local = { updatedAt: "2026-07-23T12:00:00.000Z" };
    const remote = { updatedAt: "2026-07-23T10:00:00.000Z" };
    const lastSynced = "2026-07-23T10:00:00.000Z";

    expect(detectConflict(local, remote, lastSynced)).toBe(false);
  });

  it("4. returns false when only remote is newer than lastSyncedAt (local unchanged)", () => {
    const local = { updatedAt: "2026-07-23T10:00:00.000Z" };
    const remote = { updatedAt: "2026-07-23T12:00:00.000Z" };
    const lastSynced = "2026-07-23T10:00:00.000Z";

    expect(detectConflict(local, remote, lastSynced)).toBe(false);
  });

  it("5. returns true when lastSyncedAt is missing/null and local and remote timestamps differ", () => {
    const local = { updatedAt: "2026-07-23T12:00:00.000Z" };
    const remote = { updatedAt: "2026-07-23T11:00:00.000Z" };

    expect(detectConflict(local, remote, null)).toBe(true);
    expect(detectConflict(local, remote, undefined)).toBe(true);
  });

  it("6. returns false when local or remote state is null or undefined", () => {
    const state = { updatedAt: "2026-07-23T12:00:00.000Z" };

    expect(detectConflict(null, state, "2026-07-23T10:00:00.000Z")).toBe(false);
    expect(detectConflict(state, null, "2026-07-23T10:00:00.000Z")).toBe(false);
    expect(detectConflict(undefined, undefined, null)).toBe(false);
  });
});
