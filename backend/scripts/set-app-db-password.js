// Lets the restricted propertyflow_app role (created by the row_level_security migration)
// log in, using the password inside APP_DATABASE_URL.
//
// Why a script: migrations are committed to git, so they must never contain a password.
// The password lives only in .env locally (or a secret store in production).
//
// Connects as the database owner (DATABASE_URL). Run it after migrating:
//   npm run db:app-role
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const appUrl = process.env.APP_DATABASE_URL;
  if (!appUrl) {
    throw new Error('APP_DATABASE_URL is not set (see .env.example)');
  }

  const { username, password } = new URL(appUrl);
  if (username !== 'propertyflow_app') {
    throw new Error(`APP_DATABASE_URL must log in as propertyflow_app, not "${username}"`);
  }
  if (!password) {
    throw new Error('APP_DATABASE_URL has no password');
  }

  const owner = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  try {
    // ALTER ROLE does not accept query parameters, so the password goes in as a
    // SQL string literal, with any single quote doubled ('') so it cannot break out.
    const literal = `'${decodeURIComponent(password).replace(/'/g, "''")}'`;
    await owner.$executeRawUnsafe(`ALTER ROLE propertyflow_app WITH LOGIN PASSWORD ${literal}`);
    console.log('propertyflow_app can now log in with the password from APP_DATABASE_URL');
  } finally {
    await owner.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
