import { execSync } from 'child_process';

// Runs once before the whole test run.
// Drops everything in the test database and re-applies every migration in prisma/migrations,
// so tests always start from exactly what the migrations create.
export default async function globalSetup() {
  require('./env');
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    stdio: 'inherit',
    env: process.env,
  });
}
