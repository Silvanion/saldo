import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // rodoManualTest hits a real production Firebase project (live signup/delete) and must
    // only run manually (e.g. `npx vitest run src/rodoManualTest.integration.test.ts`), never in CI/`npm test`.
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/e2e-prod/**', '**/e2e-electron/**', '**/rules-tests/**', '**/rodoManualTest.integration.test.ts'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/main.tsx', 'src/content/**'],
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: './coverage',
      // Progi tuż pod stanem z audytu 2026-11 (69/61/63/70) — chronią przed regresją, nie ustalają celu.
      thresholds: { statements: 68, branches: 60, functions: 62, lines: 69 },
    },
  },
});
