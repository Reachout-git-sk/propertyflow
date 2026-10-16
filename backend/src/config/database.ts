import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClient } from '@prisma/client';

/**
 * Who the current request is acting for. The row-level security policies in
 * prisma/migrations/*_row_level_security read these two values.
 *   role: ADMIN | TENANT | WORKER, or SYSTEM for background jobs like the SLA check
 */
export type DbContext = {
  userId: string;
  role: string;
};

// AsyncLocalStorage is like a backpack that travels with one request through every
// `await`, so code deep inside a service can know who the request is for without
// passing it down by hand. Each request has its own backpack; they never mix.
const dbContext = new AsyncLocalStorage<DbContext>();

// The `await` inside matters: Prisma queries are lazy and only start when awaited.
// Without it, `runWithDbContext(ctx, () => prisma.ticket.count())` would hand back a query
// that has not started yet, the caller would await it AFTER leaving the context, and the
// database would see no user at all.
export function runWithDbContext<T>(context: DbContext, fn: () => T | Promise<T>): Promise<T> {
  return dbContext.run(context, async () => await fn());
}

// For jobs that run on a timer, not for a user (staff-level access)
export function runAsSystem<T>(fn: () => T | Promise<T>): Promise<T> {
  return runWithDbContext({ userId: '', role: 'SYSTEM' }, fn);
}

// The app logs in as the restricted propertyflow_app role (APP_DATABASE_URL), never as the
// table owner (DATABASE_URL, used only by migrations and the seed), because the owner skips RLS.
if (!process.env.APP_DATABASE_URL) {
  throw new Error(
    'APP_DATABASE_URL is not set. It must connect as the restricted propertyflow_app role (see .env.example).'
  );
}

const baseClient = new PrismaClient({
  datasourceUrl: process.env.APP_DATABASE_URL,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Every model query (findMany, create, update, ...) runs as a tiny transaction:
//   BEGIN
//   SELECT set_config('app.user_id', ..., true), set_config('app.role', ..., true)
//   <the real query>
//   COMMIT
// The `true` means "only for this transaction". When it ends, PostgreSQL forgets both
// values, so the next request that gets this pooled connection cannot inherit them.
const prisma = baseClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const context = dbContext.getStore();

        // No user known (for example the login route): run the query with nothing set.
        // RLS then returns no tenant-owned rows at all ("fail closed").
        if (!context) {
          return query(args);
        }

        const [, result] = await baseClient.$transaction([
          baseClient.$executeRaw`SELECT set_config('app.user_id', ${context.userId}, true), set_config('app.role', ${context.role}, true)`,
          query(args),
        ]);
        return result;
      },
    },
  },
});

export default prisma;
