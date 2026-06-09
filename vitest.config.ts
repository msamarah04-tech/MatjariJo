import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Frontend (jsdom) test config. The Node/API test suite runs separately via
// `node --test` (npm run test:api); this covers React components + browser utils.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/web/setup.ts'],
    include: ['tests/web/**/*.test.{ts,tsx}'],
  },
});
