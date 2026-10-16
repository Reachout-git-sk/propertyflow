-- Ticket numbers from a database sequence, added October 2026.
--
-- Before: the app picked 4 random digits (TKT-2026-0166). Two tickets could get the
-- same number, and the second insert then failed on the unique index.
-- Now: PostgreSQL hands out the numbers. A sequence never gives the same number twice,
-- even to two requests at exactly the same moment.

-- A counter that only goes up: 1, 2, 3, ...
CREATE SEQUENCE "ticket_number_seq";

-- The running app (propertyflow_app) needs to call nextval() on it
GRANT USAGE, SELECT ON SEQUENCE "ticket_number_seq" TO propertyflow_app;

-- Builds the number, e.g. TKT-2026-000042.
-- The year is only a label: the counter does not restart each January.
-- At least 6 digits, but never cut short: number 1234567 stays TKT-2026-1234567.
-- (Old random numbers have 4 digits, so they can never clash with these.)
CREATE FUNCTION next_ticket_number() RETURNS text
  LANGUAGE sql VOLATILE
  AS $$
    SELECT 'TKT-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, GREATEST(6, length(n::text)), '0')
    FROM (SELECT nextval('ticket_number_seq') AS n) AS next
  $$;

-- Every new ticket gets its number from the function, unless one is given explicitly
-- AlterTable
ALTER TABLE "tickets" ALTER COLUMN "ticket_number" SET DEFAULT next_ticket_number();
