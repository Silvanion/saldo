const { app, BrowserWindow, shell, Menu, dialog, ipcMain, Notification, powerMonitor, Tray, globalShortcut, nativeImage, systemPreferences, safeStorage, session } = require("electron");
const path = require("path");
const net = require("net");
const { execFile } = require("child_process");
const { autoUpdater } = require("electron-updater");
const windowStateKeeper = require("electron-window-state");
const log = require("electron-log");
const fs = require("fs");
// Route electron-updater's internal logging to a file (~/Library/Logs/Saldo
// on macOS, %USERPROFILE%\AppData\Roaming\Saldo\logs on Windows) so update
// failures in the field are actually diagnosable, e.g. via the bug-report form.
log.transports.file.level = "info";
log.transports.console.level = process.env.NODE_ENV === "production" ? false : "info";
autoUpdater.logger = log;
// The renderer (UpdateToast) asks before downloading — auto-downloading on
// every startup check wasted bandwidth and produced a second, native
// "restart and install" prompt on top of the in-app one.
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const RELEASES_URL = "https://github.com/Silvanion/saldo/releases/latest";

// Set environment flags so our server knows it's running inside Electron
process.env.IS_ELECTRON = "true";
// Also default to production unless overridden
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  // Ensure we exit cleanly and quickly
  process.exit(0);
}

let mainWindow;
let localServer;
let tray = null;
let cachedBadgeOverlayIcon; // undefined = not attempted yet, null = attempted and failed
let pendingImportFilePath; // set when a statement file is opened before the window/renderer is ready

// Statement file opened via Finder/Explorer "Open with", a Dock/taskbar-icon
// drop, or a double-click while the app is already running — distinct from
// the in-app dropzone (ImportTransactionsModal), which only reacts to drops
// made while that modal is already open.
const IMPORT_FILE_EXTENSIONS = ['.csv', '.pdf'];

function isImportableFile(filePath) {
  return typeof filePath === 'string' && IMPORT_FILE_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

async function openImportFile(filePath) {
  if (!isImportableFile(filePath)) return;
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoadingMainFrame()) {
    pendingImportFilePath = filePath;
    return;
  }
  try {
    const bytes = await fs.promises.readFile(filePath);
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('import-file-dropped', { name: path.basename(filePath), bytes });
  } catch (err) {
    log.error("[OpenFile] Błąd odczytu pliku do zaimportowania:", err);
  }
}

// Registered before app.whenReady() — required on macOS to catch a file
// opened at cold start (double-click / Dock drop before the app was running).
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (app.isReady()) {
    openImportFile(filePath);
  } else {
    pendingImportFilePath = filePath;
  }
});

app.on('second-instance', (event, commandLine, workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  // Windows/Linux: a file dropped on the .exe/shortcut, or "Open with Saldo",
  // relaunches with the file path as the last CLI argument.
  const filePath = commandLine[commandLine.length - 1];
  if (isImportableFile(filePath)) {
    openImportFile(filePath);
  }
});

function isAppUrl(url, port) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.port === String(port);
  } catch {
    return false;
  }
}

function isAuthPopupUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    if (u.hostname.endsWith('.firebaseapp.com') && u.pathname.startsWith('/__/auth/')) return true;
    return u.hostname === 'accounts.google.com' && u.pathname.startsWith('/o/oauth2');
  } catch {
    return false;
  }
}

function triggerAddExpense() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('open-add-expense-modal');
  }
}

function createTray() {
  const isMac = process.platform === 'darwin';
  const iconPath = isMac
    ? path.join(__dirname, '../build/trayTemplate.png')
    : path.join(__dirname, '../build/icon.png');

  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (isMac) {
      trayIcon.setTemplateImage(true);
    } else {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }
  } catch (err) {
    log.error("[Tray] Błąd wczytywania ikony zasobnika:", err);
    return;
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Saldo');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Pokaż Saldo',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          if (!mainWindow.isVisible()) mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Dodaj wydatek...',
      accelerator: 'CmdOrControl+Shift+E',
      click: () => {
        triggerAddExpense();
      }
    },
    { type: 'separator' },
    {
      label: 'Sprawdź aktualizacje...',
      click: () => checkForUpdates(true)
    },
    { type: 'separator' },
    {
      label: 'Zakończ Saldo',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

// Utility to find a free port
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.listen(port, "127.0.0.1", () => srv.close(() => resolve(true)));
  });
}

// The renderer keeps all data in IndexedDB/localStorage, which Chromium scopes
// per origin — and the origin includes the port. A new random port on every
// launch therefore meant a fresh, empty database each time (the old data was
// still on disk, just orphaned under http_localhost_<oldPort>). The port is
// now chosen once and persisted, so the origin stays stable across launches.
const DEFAULT_SERVER_PORT = 47819;

function serverPortFilePath() {
  return path.join(app.getPath("userData"), "server-port.json");
}

function readSavedServerPort() {
  try {
    const { port } = JSON.parse(fs.readFileSync(serverPortFilePath(), "utf8"));
    return Number.isInteger(port) && port > 0 && port < 65536 ? port : null;
  } catch {
    return null;
  }
}

function saveServerPort(port) {
  try {
    fs.writeFileSync(serverPortFilePath(), JSON.stringify({ port }), "utf8");
  } catch (err) {
    log.error("[Port] Błąd zapisu portu serwera:", err);
  }
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

// One-time recovery for installs from before the port was persisted: reuse
// the port of the largest existing IndexedDB origin (the one most likely to
// hold the user's real data rather than an abandoned fresh onboarding).
function findLegacyDataPort() {
  try {
    const idbDir = path.join(app.getPath("userData"), "IndexedDB");
    let best = null;
    for (const name of fs.readdirSync(idbDir)) {
      const match = /^http_localhost_(\d+)\.indexeddb\.leveldb$/.exec(name);
      if (!match) continue;
      const size = dirSize(path.join(idbDir, name));
      if (!best || size > best.size) best = { port: Number(match[1]), size };
    }
    return best ? best.port : null;
  } catch {
    return null;
  }
}

async function resolveServerPort() {
  const saved = readSavedServerPort();
  if (saved) {
    if (await isPortFree(saved)) return saved;
    // Don't overwrite the saved port — next launch should return to the
    // origin that holds the user's data.
    log.warn(`[Port] Zapisany port ${saved} jest zajęty — używam tymczasowego portu (dane lokalne mogą być niewidoczne w tej sesji).`);
    return getFreePort();
  }
  const candidates = [findLegacyDataPort(), DEFAULT_SERVER_PORT].filter(Boolean);
  for (const candidate of candidates) {
    if (await isPortFree(candidate)) {
      saveServerPort(candidate);
      return candidate;
    }
  }
  const port = await getFreePort();
  saveServerPort(port);
  return port;
}

// Set App User Model ID for Windows (required for native notifications)
app.setAppUserModelId("com.saldo.app");

// Branded native About panel (macOS: App menu > About Saldo; Linux: also supported)
app.setAboutPanelOptions({
  applicationName: "Saldo",
  applicationVersion: app.getVersion(),
  version: app.getVersion(),
  copyright: `© ${new Date().getFullYear()} Silvanion`,
  iconPath: path.join(__dirname, "../build/icon.png")
});

// IPC handlers
ipcMain.handle('export-data', async (event, defaultPath, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  if (canceled || !filePath) return null;
  await fs.promises.writeFile(filePath, data, 'utf-8');
  return filePath;
});

ipcMain.handle('import-data', async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  if (canceled || filePaths.length === 0) return null;
  const data = await fs.promises.readFile(filePaths[0], 'utf-8');
  return data;
});

ipcMain.handle('show-notification', (event, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

ipcMain.handle('update-badge', (event, count) => {
  if (app.dock) {
    // macOS: dock potrafi wyświetlić sam tekst/liczbę na ikonie
    app.dock.setBadge(count || '');
    return;
  }
  // Windows: brak odpowiednika dock-badge — nakładka na ikonę paska zadań
  // (bez konkretnej liczby, bo BrowserWindow.setOverlayIcon przyjmuje tylko
  // statyczny obrazek, nie tekst)
  if (mainWindow && typeof mainWindow.setOverlayIcon === 'function') {
    if (count) {
      if (cachedBadgeOverlayIcon === undefined) {
        try {
          const overlay = nativeImage.createFromPath(path.join(__dirname, "../build/badgeOverlay.png"));
          cachedBadgeOverlayIcon = overlay.isEmpty() ? null : overlay;
        } catch (err) {
          log.error("[Badge] Błąd wczytywania ikony nakładki:", err);
          cachedBadgeOverlayIcon = null;
        }
      }
      mainWindow.setOverlayIcon(cachedBadgeOverlayIcon, `${count} zaległych płatności`);
    } else {
      mainWindow.setOverlayIcon(null, "");
    }
  }
});

ipcMain.handle('get-login-item', () => {
  try {
    const settings = app.getLoginItemSettings();
    return Boolean(settings.openAtLogin);
  } catch (err) {
    log.error("[LoginItem] Błąd odczytu autostartu:", err);
    return false;
  }
});

ipcMain.handle('set-login-item', (event, openAtLogin) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(openAtLogin),
      openAsHidden: false
    });
    const settings = app.getLoginItemSettings();
    return Boolean(settings.openAtLogin);
  } catch (err) {
    log.error("[LoginItem] Błąd zapisu autostartu:", err);
    return false;
  }
});

// --- Pasek postępu (Windows & macOS) ---
ipcMain.handle('set-progress-bar', (event, progress) => {
  if (mainWindow) {
    mainWindow.setProgressBar(progress);
  }
});

// --- Biometria / Touch ID & Bezpieczny Magazyn ---
function loadBiometricsData() {
  try {
    const biometricsFilePath = path.join(app.getPath('userData'), 'biometrics.json');
    if (fs.existsSync(biometricsFilePath)) {
      return JSON.parse(fs.readFileSync(biometricsFilePath, 'utf8'));
    }
  } catch (err) {
    log.error("[Biometrics] Błąd odczytu danych biometrii:", err);
  }
  return {};
}

function saveBiometricsData(data) {
  try {
    const biometricsFilePath = path.join(app.getPath('userData'), 'biometrics.json');
    fs.writeFileSync(biometricsFilePath, JSON.stringify(data), 'utf8');
  } catch (err) {
    log.error("[Biometrics] Błąd zapisu danych biometrii:", err);
  }
}

ipcMain.handle('biometrics-status', (event, profileId) => {
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';
  const hasTouchID = isMac && typeof systemPreferences.canPromptTouchID === 'function' && systemPreferences.canPromptTouchID();
  const encryptionAvailable = typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable();

  // On Windows, safeStorage uses DPAPI (backed by Windows Hello / Credential Manager / TPM)
  const hasBiometricsHardware = isMac ? Boolean(hasTouchID) : isWin ? Boolean(encryptionAvailable) : false;

  let isEnrolledForProfile = false;
  if (profileId) {
    const data = loadBiometricsData();
    isEnrolledForProfile = Boolean(data[profileId]);
  }

  return {
    available: Boolean(hasBiometricsHardware && encryptionAvailable),
    isEnrolledForProfile,
    platform: process.platform
  };
});

ipcMain.handle('get-window-state', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { isMaximized: false, isFullScreen: false };
  return {
    isMaximized: mainWindow.isMaximized(),
    isFullScreen: mainWindow.isFullScreen()
  };
});

ipcMain.handle('check-for-updates', async (event, manual = true) => {
  checkForUpdates(manual !== false);
});

ipcMain.handle('start-download-update', async () => {
  // Squirrel.Mac only installs an update whose code signature satisfies the
  // running app's designated requirement — impossible for ad-hoc/unsigned
  // builds. Send those users to the release page instead of letting them
  // download ~100 MB only to have "restart and install" silently do nothing.
  if (process.platform === 'darwin' && !(await isDeveloperIdSigned())) {
    await shell.openExternal(RELEASES_URL);
    return { manual: true };
  }
  isUserInitiatedUpdate = true;
  await autoUpdater.downloadUpdate();
  return { manual: false };
});

ipcMain.handle('install-update', () => {
  isUserInitiatedUpdate = true;
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('biometrics-save-pin', async (event, profileId, pin) => {
  if (typeof safeStorage.isEncryptionAvailable !== 'function' || !safeStorage.isEncryptionAvailable()) {
    return { success: false, error: 'Szyfrowany magazyn systemowy nie jest dostępny.' };
  }
  try {
    const encryptedBuffer = safeStorage.encryptString(pin);
    const data = loadBiometricsData();
    data[profileId] = encryptedBuffer.toString('base64');
    saveBiometricsData(data);
    return { success: true };
  } catch (err) {
    log.error("[Biometrics] Błąd szyfrowania PIN-u:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('biometrics-prompt-unlock', async (event, profileId, promptReason) => {
  const data = loadBiometricsData();
  const encryptedBase64 = data[profileId];
  if (!encryptedBase64) {
    return { success: false, error: 'Brak zarejestrowanych danych Touch ID dla tego profilu.' };
  }

  if (process.platform === 'darwin' && typeof systemPreferences.promptTouchID === 'function') {
    try {
      await systemPreferences.promptTouchID(promptReason || 'Odblokuj profil Saldo');
    } catch (err) {
      log.warn("[Biometrics] Weryfikacja Touch ID anulowana lub nieudana:", err);
      return { success: false, error: err.message || 'Weryfikacja anulowana.' };
    }
  }

  try {
    const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
    const decryptedPin = safeStorage.decryptString(encryptedBuffer);
    return { success: true, pin: decryptedPin };
  } catch (err) {
    log.error("[Biometrics] Błąd odszyfrowania PIN-u:", err);
    return { success: false, error: 'Nie udało się odszyfrować PIN-u magazynem systemowym.' };
  }
});

ipcMain.handle('biometrics-remove-pin', async (event, profileId) => {
  try {
    const data = loadBiometricsData();
    if (data[profileId]) {
      delete data[profileId];
      saveBiometricsData(data);
    }
    return { success: true };
  } catch (err) {
    log.error("[Biometrics] Błąd usuwania danych biometrii:", err);
    return { success: false, error: err.message };
  }
});

// --- Auto-update (electron-updater) ---
// Set to true only for the duration of a user-triggered "Sprawdź aktualizacje..."
// check, so the event handlers below know whether to speak up when there's
// nothing to report (silent on the automatic startup check, explicit on a manual one).
let isManualUpdateCheck = false;
// True once the user clicked download/install, so a later failure is reported
// to the renderer instead of leaving the toast stuck on "Pobieranie...".
let isUserInitiatedUpdate = false;

let developerIdSignedPromise;
function isDeveloperIdSigned() {
  if (!developerIdSignedPromise) {
    developerIdSignedPromise = new Promise((resolve) => {
      if (process.platform !== 'darwin' || !app.isPackaged) return resolve(false);
      // .../Saldo.app/Contents/MacOS/Saldo -> .../Saldo.app
      const bundlePath = path.resolve(path.dirname(process.execPath), '..', '..');
      execFile('/usr/bin/codesign', ['-dv', '--verbose=2', bundlePath], (err, stdout, stderr) => {
        resolve(!err && /Authority=Developer ID Application/.test(String(stderr)));
      });
    });
  }
  return developerIdSignedPromise;
}

autoUpdater.on("checking-for-update", () => {
  log.info("[AutoUpdater] Sprawdzanie dostępności aktualizacji...");
});

autoUpdater.on("update-available", (info) => {
  log.info(`[AutoUpdater] Dostępna aktualizacja: ${info.version}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-available", {
      version: info.version,
      releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : undefined
    });
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-progress", {
      percent: progressObj.percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  }
});

autoUpdater.on("update-not-available", () => {
  log.info("[AutoUpdater] Brak nowszej wersji.");
  if (isManualUpdateCheck) {
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Brak aktualizacji",
      message: "Masz zainstalowaną najnowszą wersję aplikacji Saldo."
    });
  }
  isManualUpdateCheck = false;
});

autoUpdater.on("error", (err) => {
  log.error("[AutoUpdater] Błąd:", err instanceof Error ? err.stack : err);
  if (isManualUpdateCheck) {
    dialog.showErrorBox(
      "Nie udało się sprawdzić aktualizacji",
      "Sprawdź połączenie z internetem i spróbuj ponownie później."
    );
  }
  if ((isManualUpdateCheck || isUserInitiatedUpdate) && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-error", err instanceof Error ? err.message : String(err));
  }
  isManualUpdateCheck = false;
  isUserInitiatedUpdate = false;
});

autoUpdater.on("update-downloaded", (info) => {
  log.info(`[AutoUpdater] Pobrano aktualizację: ${info.version}`);
  isManualUpdateCheck = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    // UpdateToast shows its own "restart and install" button.
    mainWindow.webContents.send("update-downloaded", { version: info.version });
    return;
  }
  // No window to show the in-app prompt in (e.g. closed to tray on macOS).
  dialog.showMessageBox({
    type: "info",
    title: "Dostępna nowa wersja",
    message: `Wersja ${info.version} aplikacji Saldo została pobrana. Czy chcesz zainstalować ją teraz?`,
    buttons: ["Restartuj i zainstaluj", "Później"],
    defaultId: 0,
    cancelId: 1
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true); // forceRun = true
    }
  });
});

function checkForUpdates(manual = false) {
  if (!app.isPackaged) {
    log.info("[AutoUpdater] Pominięto sprawdzanie aktualizacji — aplikacja uruchomiona w trybie deweloperskim.");
    if (manual) {
      dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Sprawdzanie aktualizacji",
        message: "Sprawdzanie aktualizacji jest dostępne tylko w zbudowanej wersji aplikacji (poza trybem deweloperskim)."
      });
    }
    return;
  }
  isManualUpdateCheck = manual;
  // Na automacich checkach (manual=false) nie pokazujemy żadnych dialogów - 
  // electron-updater wywoła eventy update-available / update-not-available / error
  // a te eventy same decydują czy pokazać dialog (tylko gdy manual=true)
  autoUpdater.checkForUpdates().catch((err) => {
    log.error("[AutoUpdater] checkForUpdates() odrzucone:", err);
    if (manual) {
      dialog.showErrorBox(
        "Nie udało się sprawdzić aktualizacji",
        "Sprawdź połączenie z internetem i spróbuj ponownie później."
      );
    }
  });
}

async function createWindow(port) {
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1280,
    defaultHeight: 800
  });

  // Electron paints a blank window before the SPA finishes loading; without
  // an explicit backgroundColor that default is white, which is a jarring
  // flash in dark mode. Match the app's own light/dark bg-base token using
  // the same time-of-day heuristic src/hooks/useTheme.ts uses for its
  // default "auto" theme (we can't read the renderer's localStorage choice
  // this early), so the flash blends in for most users most of the time.
  const currentHour = new Date().getHours();
  const isLikelyDark = currentHour >= 18 || currentHour < 6;
  const backgroundColor = isLikelyDark ? "#121315" : "#f5f5f5";

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 800,
    minHeight: 600,
    title: "Saldo",
    backgroundColor,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 20 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, "../build/icon.png")
  });

  mainWindowState.manage(mainWindow);

  const notifyWindowState = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-state-changed', {
        isMaximized: mainWindow.isMaximized(),
        isFullScreen: mainWindow.isFullScreen()
      });
    }
  };

  // Native right-click menu on text fields (Cut/Copy/Paste, spell-check
  // suggestions) — without this, right-clicking any input shows nothing.
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menuTemplate = [];

    if (params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions) {
        menuTemplate.push({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion)
        });
      }
      if (params.dictionarySuggestions.length > 0) {
        menuTemplate.push({ type: 'separator' });
      }
      menuTemplate.push({
        label: 'Dodaj do słownika',
        click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      });
      menuTemplate.push({ type: 'separator' });
    }

    if (params.isEditable) {
      menuTemplate.push(
        { role: 'undo', enabled: params.editFlags.canUndo },
        { role: 'redo', enabled: params.editFlags.canRedo },
        { type: 'separator' },
        { role: 'cut', enabled: params.editFlags.canCut },
        { role: 'copy', enabled: params.editFlags.canCopy },
        { role: 'paste', enabled: params.editFlags.canPaste },
        { role: 'selectAll', enabled: params.editFlags.canSelectAll }
      );
    } else if (params.selectionText) {
      menuTemplate.push({ role: 'copy' });
    }

    if (menuTemplate.length === 0) return;

    Menu.buildFromTemplate(menuTemplate).popup({ window: mainWindow });
  });

  mainWindow.on('maximize', notifyWindowState);
  mainWindow.on('unmaximize', notifyWindowState);
  mainWindow.on('enter-full-screen', notifyWindowState);
  mainWindow.on('leave-full-screen', notifyWindowState);

  // Handle external links securely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Pozwól na otwieranie pop-upów dla mechanizmu autoryzacji Google/Firebase.
    // Sprawdzamy sparsowany host, nie podciąg adresu — "includes()" przepuszczał
    // np. https://evil.example/?firebaseapp.com/__/auth, a okno potomne dziedziczy
    // preload z pełnym electronAPI.
    if (isAuthPopupUrl(url)) {
      return { action: 'allow' };
    }

    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!isAppUrl(url, port)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    }
    // Firebase otwiera popup najpierw jako about:blank; inne schematy (file:,
    // javascript:, data:) nie mają powodu otwierać okna z dostępem do preloadu.
    return { action: url === 'about:blank' ? 'allow' : 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url, port)) return;
    event.preventDefault();
    // mailto: — BugReportModal opens the mail client via location.href.
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
  });

  // Setup basic application menu to enable Copy/Paste on Mac
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('open-preferences');
          }
        },
        {
          label: 'Sprawdź aktualizacje...',
          click: () => checkForUpdates(true)
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        ...(!isMac ? [{
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('open-preferences');
          }
        }, {
          label: 'Sprawdź aktualizacje...',
          click: () => checkForUpdates(true)
        }, { type: 'separator' }] : []),
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        ...(isMac ? [{ role: 'front' }, { role: 'window' }] : [{ role: 'close' }])
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingImportFilePath) {
      const filePath = pendingImportFilePath;
      pendingImportFilePath = undefined;
      openImportFile(filePath);
    }
  });

  // Load the web app served by our embedded Express server
  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    const freePort = await resolveServerPort();

    // Older builds registered the PWA service worker (PWABadge now skips it in
    // Electron). With a stable origin, a leftover worker would keep serving
    // the previous version's precached UI after an app update. Only service
    // workers and Cache Storage are cleared — IndexedDB/localStorage (the
    // user's data) are untouched.
    try {
      await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
    } catch (swErr) {
      log.warn("[Startup] Nie udało się wyczyścić service workerów:", swErr);
    }
    
    // Import the compiled server
    // Note: We expect the app to be built (npm run build) before running Electron in prod
    const serverModulePath = path.join(__dirname, "../dist/server.cjs");
    const { startServer } = require(serverModulePath);
    
    // Start the Express API/Static server
    localServer = await startServer(freePort);
    
    // Open the browser window
    createWindow(freePort);

    // Windows/Linux: a file dropped on the .exe/shortcut, or "Open with
    // Saldo", launches the app with the file path as the last CLI argument
    // (macOS instead fires the 'open-file' event registered above).
    if (process.platform !== 'darwin') {
      const argvFilePath = process.argv[process.argv.length - 1];
      if (isImportableFile(argvFilePath)) {
        openImportFile(argvFilePath);
      }
    }

    // Initialize System Tray
    createTray();

    // Register global shortcut for quick expense
    try {
      const registered = globalShortcut.register('CommandOrControl+Shift+E', () => {
        triggerAddExpense();
      });
      if (!registered) {
        log.warn('[GlobalShortcut] Rejestracja skrótu CommandOrControl+Shift+E nie powiodła się.');
      } else {
        log.info('[GlobalShortcut] Zarejestrowano skrót CommandOrControl+Shift+E.');
      }
    } catch (scErr) {
      log.error('[GlobalShortcut] Błąd rejestracji skrótu:', scErr);
    }

    // Silent startup check — event handlers registered above only speak up
    // (via dialogs) when an update is actually found or successfully downloaded.
    // Give the window a moment to finish loading first.
    setTimeout(() => checkForUpdates(false), 3000);

    powerMonitor.on('suspend', () => {
      if (mainWindow) {
        mainWindow.webContents.send('system-lock');
      }
    });

    powerMonitor.on('lock-screen', () => {
      if (mainWindow) {
        mainWindow.webContents.send('system-lock');
      }
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(freePort);
    });
  } catch (err) {
    console.error("Failed to start embedded server:", err);
    log.error("[Startup] Failed to start embedded server:", err);
    dialog.showErrorBox(
      "Błąd uruchamiania Saldo",
      `Wystąpił błąd podczas uruchamiania aplikacji:\n\n${err && err.stack ? err.stack : err}`
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("quit", () => {
  // Gracefully shutdown the server when Electron quits
  if (localServer) {
    localServer.close();
  }
});
