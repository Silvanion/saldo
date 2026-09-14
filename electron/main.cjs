const { app, BrowserWindow } = require("electron");
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    // icon: path.join(__dirname, "../public/icon.png") // Optional if we have an icon
  });

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
