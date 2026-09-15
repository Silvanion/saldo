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

    // v9.9.9 zamiast realnego numeru wydania — CURRENT_VERSION jest teraz
    // wyprowadzane z changelogData[0].version, więc sztywno wpisana "aktualna"
    // wersja testowa prędzej czy później zrówna się z prawdziwą i test przestałby
    // wykrywać "nowszą" wersję. Sentinel wyżej niż cokolwiek realnego jest stabilny.
    const mockRelease = {
      tag_name: "v9.9.9",
      name: "Wydanie 9.9.9",
      body: "Nowy moduł aktualizacji i biometrii",
      published_at: "2026-09-15T12:00:00Z",
      draft: false,
      prerelease: false,
      assets: [
        { name: "Saldo-9.9.9.dmg", browser_download_url: "https://github.com/Silvanion/saldo/releases/download/v9.9.9/Saldo-9.9.9.dmg", size: 88000 }
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
    expect(res?.version).toBe("v9.9.9");
    expect(manager.getState()).toBe("AVAILABLE");
    expect(manager.getReleaseInfo()?.assetName).toBe("Saldo-9.9.9.dmg");
  });
});
