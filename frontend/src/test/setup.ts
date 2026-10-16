// Runs before every test file (see `test.setupFiles` in vite.config.ts)
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Each test starts with an empty page and nobody logged in
afterEach(() => {
  cleanup();
  localStorage.clear();
});
