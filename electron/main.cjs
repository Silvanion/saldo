const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");
const net = require("net");

// Set environment flags so our server knows it's running inside Electron
process.env.IS_ELECTRON = "true";
// Also default to production unless overridden
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

let mainWindow;
let localServer;

// Utility to find a free port
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Saldo",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 20 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    // icon: path.join(__dirname, "../public/icon.png") // Optional if we have an icon
  });

  // Handle external links securely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.startsWith(`http://localhost:${port}`)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.startsWith(`http://localhost:${port}`)) {
        event.preventDefault();
        shell.openExternal(url);
      }
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

  // Load the web app served by our embedded Express server
  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    const freePort = await getFreePort();
    
    // Import the compiled server
    // Note: We expect the app to be built (npm run build) before running Electron in prod
    const serverModulePath = path.join(__dirname, "../dist/server.cjs");
    const { startServer } = require(serverModulePath);
    
    // Start the Express API/Static server
    localServer = await startServer(freePort);
    
    // Open the browser window
    createWindow(freePort);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(freePort);
    });
  } catch (err) {
    console.error("Failed to start embedded server:", err);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  // Gracefully shutdown the server when Electron quits
  if (localServer) {
    localServer.close();
  }
});
