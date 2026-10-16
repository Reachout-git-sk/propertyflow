/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  // `npm test` runs the *.test.tsx files in jsdom, a browser simulated inside Node
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
