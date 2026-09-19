/**
 * UpdateManager - Zaawansowany Silnik Aktualizacji z GitHub Releases
 * Obsługuje optymalizację ETag (ochrona przed rate-limitami 60 req/h),
 * walidację semver, strumieniowe pobieranie ze wskaźnikiem MB/s oraz weryfikację sum SHA-256.
 */
import { changelogData } from "../content/changelogData";

export type UpdateState =
  | "IDLE"
  | "CHECKING"
  | "AVAILABLE"
  | "DOWNLOADING"
  | "VERIFYING"
  | "READY_TO_INSTALL"
  | "ERROR";

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface ReleaseInfo {
  version: string;
  releaseNotes: string;
  publishedAt: string;
  assetUrl?: string;
  assetName?: string;
  assetSize?: number;
  sha256Url?: string;
}

export interface DownloadProgress {
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
  speedMBps: number;
}

export interface UpdateManagerListener {
  onStateChange?: (state: UpdateState) => void;
  onProgress?: (progress: DownloadProgress) => void;
  onError?: (error: string) => void;
}

export class UpdateManager {
  private static instance: UpdateManager | null = null;
  // Wersja bieżąco działającej aplikacji — wyprowadzana z pierwszego wpisu
  // changelogData (ten sam plik, który i tak trzeba zaktualizować przy każdym
  // wydaniu), żeby nie trzymać osobnej, łatwej do zapomnienia stałej tutaj.
  static get CURRENT_VERSION(): string {
    return (changelogData[0]?.version || "0.0.0").replace(/^v/, "");
  }
  private static readonly GITHUB_REPO = "Silvanion/saldo";
  private static readonly ETAG_STORAGE_KEY = "saldo_release_etag";
  private static readonly CACHED_RELEASE_KEY = "saldo_cached_release";

  private state: UpdateState = "IDLE";
  private releaseInfo: ReleaseInfo | null = null;
  private progress: DownloadProgress = {
    downloadedBytes: 0,
    totalBytes: 0,
    percentage: 0,
    speedMBps: 0
  };
  private errorMessage: string | null = null;
  private listeners: Set<UpdateManagerListener> = new Set();
  private downloadedBlob: Blob | null = null;

  private constructor() {
    this.setupElectronListeners();
  }

  static getInstance(): UpdateManager {
    if (!this.instance) {
      this.instance = new UpdateManager();
    }
    return this.instance;
  }

  private setupElectronListeners(): void {
    if (typeof window !== "undefined" && window.electronAPI) {
      window.electronAPI.onUpdateAvailable?.((info) => {
        this.releaseInfo = {
          version: info.version,
          releaseNotes: info.releaseNotes || "Nowe ulepszenia i poprawki bezpieczeństwa.",
          publishedAt: new Date().toISOString()
        };
        this.setState("AVAILABLE");
      });

      window.electronAPI.onUpdateProgress?.((prog) => {
        this.progress = {
          downloadedBytes: prog.transferred,
          totalBytes: prog.total,
          percentage: Math.round(prog.percent),
          speedMBps: Number((prog.bytesPerSecond / (1024 * 1024)).toFixed(2))
        };
        this.setState("DOWNLOADING");
        this.notifyProgress();
      });

      window.electronAPI.onUpdateDownloaded?.((info) => {
        this.releaseInfo = {
          version: info.version,
          releaseNotes: "Gotowe do zainstalowania",
          publishedAt: new Date().toISOString()
        };
        this.setState("READY_TO_INSTALL");
      });

      // Nowy event - błąd autoUpdater (tylko dla manualnych)
      window.electronAPI.onUpdateError?.((err) => {
        this.errorMessage = err || "Nie udało się sprawdzić aktualizacji.";
        this.setState("ERROR");
      });
    }
  }

  /**
   * Porównanie wersji semver (czy remote > local)
   */
  static isNewerVersion(remoteVer: string, currentVer: string = this.CURRENT_VERSION): boolean {
    const cleanRemote = remoteVer.replace(/^v/, "").trim();
    const cleanCurrent = currentVer.replace(/^v/, "").trim();

    const remoteParts = cleanRemote.split(".").map((n) => parseInt(n, 10) || 0);
    const currentParts = cleanCurrent.split(".").map((n) => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(remoteParts.length, currentParts.length); i++) {
      const r = remoteParts[i] || 0;
      const c = currentParts[i] || 0;
      if (r > c) return true;
      if (r < c) return false;
    }
    return false;
  }

  /**
   * Dopasowanie assetu z GitHub Release do bieżącej platformy i architektury
   */
  static matchPlatformAsset(assets: ReleaseAsset[]): { asset?: ReleaseAsset; sha256Asset?: ReleaseAsset } {
    const isElectron = typeof window !== "undefined" && Boolean(window.electronAPI);
    const platform = isElectron && window.electronAPI?.platform ? window.electronAPI.platform : "web";
    const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
    const isArm64 = ua.includes("arm") || ua.includes("apple silicon") || ua.includes("aarch64");

    let matchedAsset: ReleaseAsset | undefined;
    let sha256Asset: ReleaseAsset | undefined = assets.find(
      (a) => a.name.endsWith(".sha256") || a.name.includes("SHASUMS") || a.name.endsWith(".yml")
    );

    if (platform === "win32" || ua.includes("windows")) {
      matchedAsset =
        assets.find((a) => a.name.endsWith(".exe") && a.name.includes("Setup")) ||
        assets.find((a) => a.name.endsWith(".exe"));
    } else if (platform === "darwin" || ua.includes("mac")) {
      if (isArm64) {
        matchedAsset =
          assets.find((a) => a.name.endsWith(".dmg") && a.name.includes("arm64")) ||
          assets.find((a) => a.name.endsWith(".dmg"));
      } else {
        matchedAsset =
          assets.find((a) => a.name.endsWith(".dmg") && !a.name.includes("arm64")) ||
          assets.find((a) => a.name.endsWith(".dmg"));
      }
    }

    if (!matchedAsset) {
      matchedAsset =
        assets.find((a) => a.name.endsWith(".dmg")) ||
        assets.find((a) => a.name.endsWith(".exe")) ||
        assets.find((a) => a.name.endsWith(".zip"));
    }

    return { asset: matchedAsset, sha256Asset };
  }

  private safeGetStorage(key: string): string | null {
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
        return localStorage.getItem(key);
      }
    } catch {
      // Ignoruj błąd
    }
    return null;
  }

  private safeSetStorage(key: string, val: string): void {
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
        localStorage.setItem(key, val);
      }
    } catch {
      // Ignoruj błąd
    }
  }

  /**
   * Sprawdza dostępność aktualizacji w GitHub Releases API z użyciem nagłówka ETag
   */
  async checkForUpdates(manual = false): Promise<ReleaseInfo | null> {
    if (this.state === "DOWNLOADING" || this.state === "VERIFYING") {
      return this.releaseInfo;
    }

    this.setState("CHECKING");
    this.errorMessage = null;

    // Jeśli jesteśmy w Electronie, uruchom również natywny sprawdzacz autoUpdater
    if (typeof window !== "undefined" && window.electronAPI?.checkForUpdates) {
      window.electronAPI.checkForUpdates().catch(() => {});
    }

    try {
      const cachedEtag = this.safeGetStorage(UpdateManager.ETAG_STORAGE_KEY);
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json"
      };
      if (cachedEtag && !manual) {
        headers["If-None-Match"] = cachedEtag;
      }

      const response = await fetch(
        `https://api.github.com/repos/${UpdateManager.GITHUB_REPO}/releases/latest`,
        { headers }
      );

      // 304 Not Modified: brak zmian w wydaniach
      if (response.status === 304) {
        this.setState("IDLE");
        return null;
      }

      if (!response.ok) {
        throw new Error(`GitHub API zwróciło status: ${response.status}`);
      }

      const newEtag = response.headers.get("ETag");
      if (newEtag) {
        this.safeSetStorage(UpdateManager.ETAG_STORAGE_KEY, newEtag);
      }

      const releaseData = await response.json();

      // Ignoruj wersje draft i prerelease
      if (releaseData.draft || releaseData.prerelease) {
        this.setState("IDLE");
        return null;
      }

      const remoteVer = releaseData.tag_name || releaseData.name || "";
      if (!UpdateManager.isNewerVersion(remoteVer, UpdateManager.CURRENT_VERSION)) {
        this.setState("IDLE");
        return null;
      }

      const { asset, sha256Asset } = UpdateManager.matchPlatformAsset(releaseData.assets || []);

      this.releaseInfo = {
        version: remoteVer,
        releaseNotes: releaseData.body || "Nowe funkcje i poprawki wydajności.",
        publishedAt: releaseData.published_at || new Date().toISOString(),
        assetUrl: asset?.browser_download_url,
        assetName: asset?.name,
        assetSize: asset?.size,
        sha256Url: sha256Asset?.browser_download_url
      };

      this.setState("AVAILABLE");
      return this.releaseInfo;
    } catch (err: any) {
      this.errorMessage = err?.message || "Nie udało się sprawdzić aktualizacji.";
      // Cichy, automatyczny check (przy starcie apki) nie powinien wyskakiwać
      // z błędem za każdym uruchomieniem, gdy np. GitHub jest chwilowo
      // nieosiągalny — spójnie z natywnym autoUpdaterem (który też pokazuje
      // błąd tylko po ręcznym "Sprawdź aktualizacje"). Stan wraca do IDLE,
      // więc UpdateToast (który nic nie renderuje w IDLE) zostaje niewidoczny.
      if (manual) {
        this.setState("ERROR");
        this.notifyError(this.errorMessage);
      } else {
        this.setState("IDLE");
      }
      return null;
    }
  }

  /**
   * Strumieniowe pobieranie pliku aktualizacji z aktywnym wskaźnikiem prędkości i postępu
   */
  async downloadAndVerifyUpdate(): Promise<boolean> {
    if (!this.releaseInfo?.assetUrl) {
      // W natywnym Electronie, deleguj pobieranie do autoUpdater
      if (typeof window !== "undefined" && window.electronAPI?.startDownloadUpdate) {
        this.setState("DOWNLOADING");
        await window.electronAPI.startDownloadUpdate();
        return true;
      }
      this.errorMessage = "Brak pasującego pliku binarnego dla Twojego systemu.";
      this.setState("ERROR");
      return false;
    }

    this.setState("DOWNLOADING");
    this.errorMessage = null;

    try {
      const response = await fetch(this.releaseInfo.assetUrl);
      if (!response.ok || !response.body) {
        throw new Error(`Błąd pobierania: HTTP ${response.status}`);
      }

      const contentLength = response.headers.get("content-length");
      const totalBytes = contentLength ? parseInt(contentLength, 10) : this.releaseInfo.assetSize || 0;

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      let lastTime = performance.now();
      let lastBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        const now = performance.now();
        const timeDiff = (now - lastTime) / 1000;

        let speedMBps = this.progress.speedMBps;
        if (timeDiff >= 0.5) {
          const bytesDiff = receivedBytes - lastBytes;
          speedMBps = Number((bytesDiff / timeDiff / (1024 * 1024)).toFixed(2));
          lastTime = now;
          lastBytes = receivedBytes;
        }

        const percentage = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0;

        this.progress = {
          downloadedBytes: receivedBytes,
          totalBytes,
          percentage,
          speedMBps
        };
        this.notifyProgress();
      }

      this.downloadedBlob = new Blob(chunks as unknown as BlobPart[]);

      // Weryfikacja sumy kontrolnej SHA-256
      this.setState("VERIFYING");
      await this.verifyDownloadedIntegrity(this.downloadedBlob);

      this.setState("READY_TO_INSTALL");
      return true;
    } catch (err: any) {
      this.errorMessage = err?.message || "Wystąpił błąd podczas pobierania aktualizacji.";
      this.setState("ERROR");
      this.notifyError(this.errorMessage);
      return false;
    }
  }

  /**
   * Obliczenie i weryfikacja sumy kontrolnej SHA-256 pobranego pliku binarnego
   */
  private async verifyDownloadedIntegrity(blob: Blob): Promise<boolean> {
    try {
      const cryptoObj = typeof window !== "undefined" && window.crypto ? window.crypto : globalThis.crypto;
      const arrayBuffer = await blob.arrayBuffer();
      const hashBuffer = await cryptoObj.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      // Jeśli w wydaniu był dołączony plik sum kontrolnych, sprawdź go
      if (this.releaseInfo?.sha256Url) {
        try {
          const checksumResp = await fetch(this.releaseInfo.sha256Url);
          if (checksumResp.ok) {
            const checksumText = await checksumResp.text();
            if (!checksumText.toLowerCase().includes(hashHex.toLowerCase())) {
              throw new Error("Suma kontrolna SHA-256 pobranego pliku nie zgadza się z oficjalnym wydaniem!");
            }
          }
        } catch (csErr: any) {
          if (csErr.message.includes("Suma kontrolna")) {
            throw csErr;
          }
        }
      }

      return true;
    } catch (err: any) {
      throw new Error(err?.message || "Błąd integralności danych SHA-256.");
    }
  }

  /**
   * Uruchamia instalację pobranego wydania
   */
  installUpdate(): void {
    if (typeof window !== "undefined" && window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate();
      return;
    }

    // W przeglądarce pobierz plik lokalnie
    if (this.downloadedBlob && this.releaseInfo?.assetName) {
      const url = URL.createObjectURL(this.downloadedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = this.releaseInfo.assetName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  getState(): UpdateState {
    return this.state;
  }

  getReleaseInfo(): ReleaseInfo | null {
    return this.releaseInfo;
  }

  getProgress(): DownloadProgress {
    return this.progress;
  }

  getErrorMessage(): string | null {
    return this.errorMessage;
  }

  private setState(newState: UpdateState): void {
    this.state = newState;
    this.listeners.forEach((l) => l.onStateChange?.(newState));
  }

  private notifyProgress(): void {
    this.listeners.forEach((l) => l.onProgress?.(this.progress));
  }

  private notifyError(err: string): void {
    this.listeners.forEach((l) => l.onError?.(err));
  }

  subscribe(listener: UpdateManagerListener): () => void {
    this.listeners.add(listener);
    listener.onStateChange?.(this.state);
    listener.onProgress?.(this.progress);
    if (this.errorMessage) {
      listener.onError?.(this.errorMessage);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }
}
