import { useState, useEffect } from "react";

export type WindowMode = "windowed" | "maximized" | "fullscreen";

export interface WindowScaleState {
  devicePixelRatio: number;
  viewportWidth: number;
  viewportHeight: number;
  windowMode: WindowMode;
  isMaximized: boolean;
  isFullScreen: boolean;
  safeAreaLeft: number;
  safeAreaRight: number;
  platform: "macos" | "windows" | "linux" | "web";
}

/**
 * WindowScaleManager - Menedżer skalowania okna, DPI i Safe-Areas
 * Likwiduje błędy ucinania dolnych pasków, rozmycia czcionek na Windows (125%, 150%, 200%)
 * oraz dostosowuje marginesy dla kontrolek okna (traffic lights na macOS, WCO na Windows).
 */
export class WindowScaleManager {
  private static instance: WindowScaleManager | null = null;
  private listeners: Set<(state: WindowScaleState) => void> = new Set();
  private currentState: WindowScaleState;
  private isInitialized = false;

  private constructor() {
    this.currentState = this.calculateState();
  }

  static getInstance(): WindowScaleManager {
    if (!this.instance) {
      this.instance = new WindowScaleManager();
    }
    return this.instance;
  }

  private detectPlatform(): "macos" | "windows" | "linux" | "web" {
    if (typeof window !== "undefined" && window.electronAPI?.platform) {
      const p = window.electronAPI.platform.toLowerCase();
      if (p === "darwin") return "macos";
      if (p === "win32") return "windows";
      if (p === "linux") return "linux";
    }
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes("mac")) return "macos";
      if (ua.includes("win")) return "windows";
      if (ua.includes("linux")) return "linux";
    }
    return "web";
  }

  private calculateState(): WindowScaleState {
    const isBrowser = typeof window !== "undefined";
    const dpr = isBrowser ? window.devicePixelRatio || 1 : 1;
    const width = isBrowser ? window.innerWidth : 1280;
    const height = isBrowser ? window.innerHeight : 800;
    const platform = this.detectPlatform();
    const isElectron = isBrowser && Boolean(window.electronAPI);

    let isFullScreen = false;
    let isMaximized = false;

    if (isBrowser && document.fullscreenElement) {
      isFullScreen = true;
    }

    let windowMode: WindowMode = "windowed";
    if (isFullScreen) {
      windowMode = "fullscreen";
    } else if (isMaximized) {
      windowMode = "maximized";
    }

    // Obliczenie bezpiecznych marginesów (Safe Areas)
    let safeAreaLeft = 0;
    let safeAreaRight = 0;

    if (isElectron) {
      if (platform === "macos" && !isFullScreen) {
        // macOS traffic lights zajmują lewą stronę nagłówka (ok. 72px)
        safeAreaLeft = 72;
      } else if (platform === "windows" && !isFullScreen) {
        // Windows przyciski minimalizuj/powiększ/zamknij w prawym górnym rogu
        safeAreaRight = 138;
      }
    }

    return {
      devicePixelRatio: dpr,
      viewportWidth: width,
      viewportHeight: height,
      windowMode,
      isMaximized,
      isFullScreen,
      safeAreaLeft,
      safeAreaRight,
      platform
    };
  }

  /**
   * Inicjalizuje nasłuchiwanie zdarzeń systemowych i synchronizuje zmienne CSS
   */
  init(): void {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;

    this.updateCssVariables(this.currentState);

    // Nasłuchiwanie zmiany rozmiaru okna i DPI
    window.addEventListener("resize", this.handleResize, { passive: true });

    // Zmiana media query devicePixelRatio (np. przeniesienie okna na monitor 4K)
    const dprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    try {
      dprMediaQuery.addEventListener("change", this.handleDprChange);
    } catch {
      dprMediaQuery.addListener(this.handleDprChange);
    }

    // Nasłuchiwanie zdarzeń pełnego ekranu przeglądarki
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);

    // Nasłuchiwanie zdarzeń stanu okna z natywnego Electrona
    if (window.electronAPI?.onWindowStateChange) {
      window.electronAPI.onWindowStateChange((nativeState) => {
        this.currentState = {
          ...this.currentState,
          isMaximized: nativeState.isMaximized,
          isFullScreen: nativeState.isFullScreen,
          windowMode: nativeState.isFullScreen
            ? "fullscreen"
            : nativeState.isMaximized
            ? "maximized"
            : "windowed"
        };
        this.updateCssVariables(this.currentState);
        this.notifyListeners();
      });

      // Pobranie początkowego stanu okna Electrona
      window.electronAPI.getWindowState?.().then((nativeState) => {
        if (nativeState) {
          this.currentState = {
            ...this.currentState,
            isMaximized: nativeState.isMaximized,
            isFullScreen: nativeState.isFullScreen,
            windowMode: nativeState.isFullScreen
              ? "fullscreen"
              : nativeState.isMaximized
              ? "maximized"
              : "windowed"
          };
          this.updateCssVariables(this.currentState);
          this.notifyListeners();
        }
      }).catch(() => {});
    }
  }

  private handleResize = (): void => {
    this.currentState = {
      ...this.currentState,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };
    this.updateCssVariables(this.currentState);
    this.notifyListeners();
  };

  private handleDprChange = (): void => {
    this.currentState = {
      ...this.currentState,
      devicePixelRatio: window.devicePixelRatio || 1
    };
    this.updateCssVariables(this.currentState);
    this.notifyListeners();
  };

  private handleFullscreenChange = (): void => {
    const isFullScreen = Boolean(document.fullscreenElement);
    this.currentState = {
      ...this.currentState,
      isFullScreen,
      windowMode: isFullScreen ? "fullscreen" : this.currentState.isMaximized ? "maximized" : "windowed"
    };
    this.updateCssVariables(this.currentState);
    this.notifyListeners();
  };

  private updateCssVariables(state: WindowScaleState): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Dokładna dynamiczna wysokość zapobiegająca ucinaniu dolnych pasków
    root.style.setProperty("--app-height", `${state.viewportHeight}px`);
    root.style.setProperty("--app-dpr", `${state.devicePixelRatio}`);
    root.style.setProperty("--titlebar-safe-left", `${state.safeAreaLeft}px`);
    root.style.setProperty("--titlebar-safe-right", `${state.safeAreaRight}px`);
    root.style.setProperty("--window-mode", state.windowMode);

    // Zapobieganie rozmyciu czcionek w Windows przy DPI > 1 (np. 125%, 150%)
    if (state.devicePixelRatio > 1) {
      root.classList.add("high-dpi");
    } else {
      root.classList.remove("high-dpi");
    }
  }

  subscribe(listener: (state: WindowScaleState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): WindowScaleState {
    return this.currentState;
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.currentState));
  }
}

/**
 * Hook React do odczytu stanu skalowania okna i safe-areas
 */
export function useWindowScale(): WindowScaleState {
  const [state, setState] = useState<WindowScaleState>(() =>
    WindowScaleManager.getInstance().getState()
  );

  useEffect(() => {
    const manager = WindowScaleManager.getInstance();
    manager.init();
    return manager.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  return state;
}
