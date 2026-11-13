import { defineConfig } from 'vitest/config';

// Testy reguł Firestore — wymagają emulatora, więc uruchamiane osobno (npm run test:rules).
export default defineConfig({
  test: { include: ['rules-tests/**/*.test.ts'], environment: 'node', testTimeout: 30000, hookTimeout: 60000 },
});
