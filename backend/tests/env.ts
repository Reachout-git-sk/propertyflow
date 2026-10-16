import os from 'os';
import path from 'path';

// Test-only settings. Nothing here is used in development or production.
//
// Tests always use a separate database (propertyflow_test), never your dev data.
// CI can point somewhere else by setting TEST_DATABASE_URL.
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/propertyflow_test?schema=public';

// Safety check: the test setup wipes the database, so refuse anything not named *_test
if (!new URL(testDatabaseUrl).pathname.endsWith('_test')) {
  throw new Error(`Refusing to run tests against a database not named *_test: ${testDatabaseUrl}`);
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET = 'test-only-secret-0123456789abcdefghijklmnopqrstuvwxyz';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'propertyflow-test-uploads');
