const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  exportData: (defaultPath, data) => ipcRenderer.invoke('export-data', defaultPath, data),
  importData: () => ipcRenderer.invoke('import-data'),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  updateBadge: (count) => ipcRenderer.invoke('update-badge', count),
  onSystemLock: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('system-lock', handler);
    return () => ipcRenderer.removeListener('system-lock', handler);
  },
  onOpenAddExpense: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('open-add-expense-modal', handler);
    return () => ipcRenderer.removeListener('open-add-expense-modal', handler);
  },
  onOpenPreferences: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('open-preferences', handler);
    return () => ipcRenderer.removeListener('open-preferences', handler);
  },
  onImportFileDropped: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('import-file-dropped', handler);
    return () => ipcRenderer.removeListener('import-file-dropped', handler);
  },
  getLoginItem: () => ipcRenderer.invoke('get-login-item'),
  setLoginItem: (openAtLogin) => ipcRenderer.invoke('set-login-item', openAtLogin),
  setProgressBar: (progress) => ipcRenderer.invoke('set-progress-bar', progress),
  checkBiometricsStatus: (profileId) => ipcRenderer.invoke('biometrics-status', profileId),
  saveBiometricsPin: (profileId, pin) => ipcRenderer.invoke('biometrics-save-pin', profileId, pin),
  promptBiometricsUnlock: (profileId, promptReason) => ipcRenderer.invoke('biometrics-prompt-unlock', profileId, promptReason),
  removeBiometricsPin: (profileId) => ipcRenderer.invoke('biometrics-remove-pin', profileId),
  platform: process.platform,
  getWindowState: () => ipcRenderer.invoke('get-window-state'),
  onWindowStateChange: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('window-state-changed', handler);
    return () => ipcRenderer.removeListener('window-state-changed', handler);
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startDownloadUpdate: () => ipcRenderer.invoke('start-download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('update-progress', handler);
    return () => ipcRenderer.removeListener('update-progress', handler);
  },
  onUpdateAvailable: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  onUpdateError: (callback) => {
    const handler = (_event, err) => callback(err);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  }
});
