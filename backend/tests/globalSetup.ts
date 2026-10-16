import { execSync } from 'child_process';
import fs from 'fs';

// Runs once before the whole test run.
// Drops everything in the test database and re-applies every migration in prisma/migrations,
// so tests always start from exactly what the migrations create.
export default async function globalSetup() {
  require('./env');
  fs.rmSync(process.env.UPLOAD_DIR!, { recursive: true, force: true });
  fs.mkdirSync(process.env.UPLOAD_DIR!, { recursive: true });
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    stdio: 'inherit',
    env: process.env,
  });
  // Let the restricted app role log in (the same step a real deployment runs)
  execSync('npm run db:app-role --silent', { stdio: 'inherit', env: process.env });
}
