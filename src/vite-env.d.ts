/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  electronAPI?: {
    exportData: (defaultPath: string, data: string) => Promise<string | null>;
    importData: () => Promise<string | null>;
    showNotification: (title: string, body: string) => Promise<void>;
    updateBadge: (count: string) => Promise<void>;
    onSystemLock: (callback: () => void) => () => void;
    onOpenAddExpense?: (callback: () => void) => () => void;
    onOpenPreferences?: (callback: () => void) => () => void;
    onImportFileDropped?: (callback: (payload: { name: string; bytes: Uint8Array | number[] }) => void) => () => void;
    getLoginItem?: () => Promise<boolean>;
    setLoginItem?: (openAtLogin: boolean) => Promise<boolean>;
    setProgressBar?: (progress: number) => Promise<void>;
    checkBiometricsStatus?: (profileId?: string) => Promise<{ available: boolean; isEnrolledForProfile: boolean; platform?: string }>;
    saveBiometricsPin?: (profileId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
    promptBiometricsUnlock?: (profileId: string, promptReason?: string) => Promise<{ success: boolean; pin?: string; error?: string }>;
    removeBiometricsPin?: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    platform?: string;
    getWindowState?: () => Promise<{ isMaximized: boolean; isFullScreen: boolean }>;
    onWindowStateChange?: (callback: (state: { isMaximized: boolean; isFullScreen: boolean }) => void) => () => void;
    checkForUpdates?: () => Promise<void>;
    startDownloadUpdate?: () => Promise<void>;
    installUpdate?: () => Promise<void>;
    onUpdateProgress?: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void;
    onUpdateAvailable?: (callback: (info: { version: string; releaseNotes?: string }) => void) => () => void;
    onUpdateDownloaded?: (callback: (info: { version: string }) => void) => () => void;
  };
}
