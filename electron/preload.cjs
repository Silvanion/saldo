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
  getLoginItem: () => ipcRenderer.invoke('get-login-item'),
  setLoginItem: (openAtLogin) => ipcRenderer.invoke('set-login-item', openAtLogin),
  setProgressBar: (progress) => ipcRenderer.invoke('set-progress-bar', progress),
  checkBiometricsStatus: (profileId) => ipcRenderer.invoke('biometrics-status', profileId),
  saveBiometricsPin: (profileId, pin) => ipcRenderer.invoke('biometrics-save-pin', profileId, pin),
  promptBiometricsUnlock: (profileId, promptReason) => ipcRenderer.invoke('biometrics-prompt-unlock', profileId, promptReason),
  removeBiometricsPin: (profileId) => ipcRenderer.invoke('biometrics-remove-pin', profileId)
});
