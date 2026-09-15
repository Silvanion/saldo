import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UpdateManager, ReleaseAsset } from "./UpdateManager";

describe("UpdateManager - GitHub Releases & Semver Matching", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prawidłowo porównuje wersje semver", () => {
    expect(UpdateManager.isNewerVersion("v1.4.1", "1.4.0")).toBe(true);
    expect(UpdateManager.isNewerVersion("1.5.0", "1.4.0")).toBe(true);
    expect(UpdateManager.isNewerVersion("v2.0.0", "1.4.0")).toBe(true);
    expect(UpdateManager.isNewerVersion("1.4.0", "1.4.0")).toBe(false);
    expect(UpdateManager.isNewerVersion("1.3.9", "1.4.0")).toBe(false);
    expect(UpdateManager.isNewerVersion("v1.3.2", "1.4.0")).toBe(false);
  });

  it("dopasowuje odpowiedni asset dla architektury i systemu", () => {
    const sampleAssets: ReleaseAsset[] = [
      { name: "Saldo-1.4.1-arm64.dmg", browser_download_url: "https://example.com/arm.dmg", size: 90000 },
      { name: "Saldo-1.4.1.dmg", browser_download_url: "https://example.com/intel.dmg", size: 95000 },
      { name: "Saldo Setup 1.4.1.exe", browser_download_url: "https://example.com/setup.exe", size: 85000 },
      { name: "latest.yml", browser_download_url: "https://example.com/latest.yml", size: 200 }
    ];

    const result = UpdateManager.matchPlatformAsset(sampleAssets);
    expect(result.asset).toBeDefined();
    expect(result.sha256Asset).toBeDefined();
    expect(result.sha256Asset?.name).toBe("latest.yml");
  });

  it("obsługuje odpowiedź 304 Not Modified bez zgłaszania błędu", async () => {
    const manager = UpdateManager.getInstance();

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 304,
      ok: false
    });

    const res = await manager.checkForUpdates();
    expect(res).toBeNull();
    expect(manager.getState()).toBe("IDLE");
  });

  it("prawidłowo parsuje nowe wydanie i przechodzi w stan AVAILABLE", async () => {
    const manager = UpdateManager.getInstance();

    const mockRelease = {
      tag_name: "v1.5.0",
      name: "Wydanie 1.5.0",
      body: "Nowy moduł aktualizacji i biometrii",
      published_at: "2026-09-15T12:00:00Z",
      draft: false,
      prerelease: false,
      assets: [
        { name: "Saldo-1.5.0.dmg", browser_download_url: "https://github.com/Silvanion/saldo/releases/download/v1.5.0/Saldo-1.5.0.dmg", size: 88000 }
      ]
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers({ ETag: '"etag-12345"' }),
      json: vi.fn().mockResolvedValue(mockRelease)
    });

    const res = await manager.checkForUpdates(true);
    expect(res).not.toBeNull();
    expect(res?.version).toBe("v1.5.0");
    expect(manager.getState()).toBe("AVAILABLE");
    expect(manager.getReleaseInfo()?.assetName).toBe("Saldo-1.5.0.dmg");
  });
});
