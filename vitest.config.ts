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
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/rodoManualTest.integration.test.ts'],
    fileParallelism: false,
  },
});
