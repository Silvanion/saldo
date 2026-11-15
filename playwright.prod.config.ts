import { defineConfig, devices } from "@playwright/test";

// E2E na buildzie PRODUKCYJNYM (dist/server.cjs). Zwykłe e2e chodzą na serwerze dev,
// gdzie CSP jest wyłączony, więc nie wykrywają blokad z Content-Security-Policy.
// Wymaga wcześniejszego `npm run build`.
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e-prod",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    // Opcjonalnie: własna przeglądarka (np. środowiska bez pobranego Chromium dla Playwrighta).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node dist/server.cjs",
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    env: {
      NODE_ENV: "production",
      PORT: String(PORT),
      ALLOWED_ORIGINS: `http://localhost:${PORT}`,
      FIREBASE_PROJECT_ID: "saldo-e2e", // serwer produkcyjny odmawia startu bez projectId
    },
  },
});
