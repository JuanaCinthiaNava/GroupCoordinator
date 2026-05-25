import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Vitest 2.x — two environments routed by file pattern.
// Phase 1 has only node-environment tests; jsdom is configured for future .tsx tests.
export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    environmentMatchGlobs: [
      ['tests/unit/**', 'node'],
      ['tests/integration/**', 'node'],
      ['tests/**/*.test.tsx', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/lib/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
