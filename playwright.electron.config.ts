import { defineConfig } from "@playwright/test";

// E2E prawdziwej aplikacji desktopowej (Electron). Wymaga `npm run build` (dist/) oraz wyświetlacza
// (na Linuksie: `xvfb-run -a`, patrz skrypt `test:e2e:electron`). Dziala bez trybu dev i bez CSP wylaczonego.
export default defineConfig({
  testDir: "./e2e-electron",
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: "list",
});
