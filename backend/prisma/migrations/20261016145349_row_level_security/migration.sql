-- Row-level security (RLS), added October 2026.
--
-- Until now, only the application code stopped tenant A from reading tenant B's rows.
-- With RLS, PostgreSQL itself filters every query, so a forgotten check in the code
-- still cannot leak another tenant's data.
--
-- How it works:
--   1. The app connects as a restricted role (propertyflow_app), not as the table owner,
--      because table owners and superusers skip RLS.
--   2. For every query, the app sets two values inside the query's transaction:
--        app.user_id = the logged-in user's id
--        app.role    = ADMIN, TENANT, WORKER, or SYSTEM (background jobs)
--   3. The policies below read those values and decide which rows are visible.

-- ---------------------------------------------------------------------------
-- 1. The restricted role the app logs in as
-- ---------------------------------------------------------------------------
-- No password here, because this file is in git. `npm run db:app-role` gives the role
-- its password from APP_DATABASE_URL in .env (or the secret store in production).
-- Roles belong to the whole Postgres server, so only create it if it is not there yet.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'propertyflow_app') THEN
    CREATE ROLE propertyflow_app NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

-- The app may read and write rows, but not create, drop or alter tables
GRANT USAGE ON SCHEMA public TO propertyflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO propertyflow_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO propertyflow_app;

-- Tables and sequences added by later migrations get the same rights automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO propertyflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO propertyflow_app;

-- The app has no business touching the migration history.
-- (Guarded because Prisma's throwaway "shadow" database has no _prisma_migrations table.)
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE "_prisma_migrations" FROM propertyflow_app;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Helpers that read the per-request values
-- ---------------------------------------------------------------------------
-- current_setting(name, true) returns NULL (instead of an error) when the value was never set,
-- and NULLIF turns an empty string into NULL. So when nothing is set, nothing matches:
-- the database "fails closed" and returns no tenant-owned rows at all.
CREATE FUNCTION app_user_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.user_id', true), '') $$;

CREATE FUNCTION app_role() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.role', true), '') $$;

-- ---------------------------------------------------------------------------
-- 3. Tickets: staff see all tickets, a tenant sees only their own
-- ---------------------------------------------------------------------------
-- A policy without a FOR clause covers SELECT, INSERT, UPDATE and DELETE.
-- USING decides which existing rows are visible. For new or changed rows the same
-- condition is checked again, so a tenant cannot insert a ticket in someone else's name.
ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tickets_owner_or_staff ON "tickets"
  USING (app_role() IN ('ADMIN', 'WORKER', 'SYSTEM') OR "tenant_id" = app_user_id());

-- Rows that hang off a ticket are visible exactly when their ticket is visible.
-- The sub-query on "tickets" is itself filtered by the tickets policy above.
ALTER TABLE "ticket_activity_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY ticket_activity_log_follows_ticket ON "ticket_activity_log"
  USING (EXISTS (SELECT 1 FROM "tickets" t WHERE t."id" = "ticket_activity_log"."ticket_id"));

ALTER TABLE "ticket_attachments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY ticket_attachments_follows_ticket ON "ticket_attachments"
  USING (EXISTS (SELECT 1 FROM "tickets" t WHERE t."id" = "ticket_attachments"."ticket_id"));

ALTER TABLE "ticket_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY ticket_assignments_follows_ticket ON "ticket_assignments"
  USING (EXISTS (SELECT 1 FROM "tickets" t WHERE t."id" = "ticket_assignments"."ticket_id"));

-- ---------------------------------------------------------------------------
-- 4. Tenancies (leases) and the money and documents attached to them
-- ---------------------------------------------------------------------------
-- Admins see all, a tenant sees their own, workers see none (they fix things; they
-- do not need anyone's rent payments or ID documents).
ALTER TABLE "tenancies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenancies_owner_or_admin ON "tenancies"
  USING (app_role() IN ('ADMIN', 'SYSTEM') OR "tenant_id" = app_user_id());

ALTER TABLE "payment_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_records_follows_tenancy ON "payment_records"
  USING (EXISTS (SELECT 1 FROM "tenancies" t WHERE t."id" = "payment_records"."tenancy_id"));

ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_follows_tenancy ON "documents"
  USING (EXISTS (SELECT 1 FROM "tenancies" t WHERE t."id" = "documents"."tenancy_id"));

-- ---------------------------------------------------------------------------
-- 5. Service orders (groceries, cleaning): owned by one tenant
-- ---------------------------------------------------------------------------
ALTER TABLE "service_orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_orders_owner_or_admin ON "service_orders"
  USING (app_role() IN ('ADMIN', 'SYSTEM') OR "tenant_id" = app_user_id());

-- Not covered on purpose:
--   users, email_whitelist: the login route must look a user up before anyone is known.
--   notifications: the app creates notifications for OTHER users (a tenant's new ticket
--     notifies the admins), so it needs separate read and insert rules. The code already
--     filters them by user_id; adding RLS here is a possible next step.
--   properties, units, workers, community posts: shared, not owned by one tenant.
