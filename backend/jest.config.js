/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  // Runs once before all tests: rebuilds the test database from the migrations
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  // Runs before each test file: points the app at the test database
  setupFiles: ['<rootDir>/tests/env.ts'],
  // All test files share one database, so run them one after another
  maxWorkers: 1,
  testTimeout: 20000,
};
