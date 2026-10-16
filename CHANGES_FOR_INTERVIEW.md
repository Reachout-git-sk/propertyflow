# PropertyFlow: security and quality work, October 2026

This page explains, in plain words, what was added to PropertyFlow on **16 October 2026**,
how each change was tested, what is still **not** done, and how to talk about it honestly.

The original app (Express + TypeScript + Prisma + PostgreSQL, React frontend, JWT login,
roles ADMIN / TENANT / WORKER) was written before this. Everything below was added later,
as an audit of my own project. Say it that way.

## Summary

| # | Change | Commit | Proof |
|---|---|---|---|
| 0 | Test setup: Jest + Supertest against a real PostgreSQL test database; migrations and lockfile committed | `4913379` | the suite below |
| 1 | IDOR fixes: tenants can only reach their own records (404 otherwise) | `bb6aae4` | 21 tests, **13 failed before** |
| 2 | PostgreSQL row-level security (RLS) on tenant-owned tables | `325da95`, `dd80522` | 15 tests, incl. "code check switched off, still 404" |
| 3 | GitHub Actions CI (install, build, migration check, tests on Postgres) | `396cc89` | full run simulated locally on a fresh database |
| 4 | Ticket numbers from a database sequence instead of 4 random digits | `866789c` | 4 tests, **3 failed before** |
| 5 | App refuses to start without a real JWT secret; tokens last 1 hour, not 7 days | `c6705cc` | 10 tests; old setup let a forged ADMIN token in (HTTP 200) |
| 6 | Stricter login rate limits (failed attempts only) | `9fea054` | 8 tests, **4 failed before** |

**58 tests in 5 files, all passing.** Run them with `docker compose up -d postgres`, then
`cd backend && npm test`.

## What each change means

**1. IDOR (Insecure Direct Object Reference).** Logging in proved who you were, but many
routes did not check that the record was yours. A tenant could change an id and read another
tenant's ticket, list every tenant's email and phone (`GET /api/tenants`, which the tenant
ticket form itself called), or add payments and documents to someone else's lease. Every
lookup now searches by id **and** owner (`ownedBy()` in `src/utils/access.ts`), and other
people's records answer 404, the same as missing ones, so ids cannot be probed.

**2. Row-level security.** A second layer inside the database. The app connects as a
restricted role (`propertyflow_app`) that cannot bypass RLS. For every query it sets
`app.user_id` and `app.role` with transaction-local `set_config`, so values never leak
between pooled connections. Policies: tenants see their own tickets, leases, payments and
documents; workers see all tickets but no leases or payments; admins see all. With no user
set, nothing is visible (fails closed). Tested by switching the code-level check off.
While doing this I found and fixed a real bug: slow file uploads lost the request context
(AsyncLocalStorage) inside multer, so users got 404 on their own tickets (`dd80522`).

**3. CI.** `.github/workflows/ci.yml` runs on every push and pull request: `npm ci`,
`prisma generate`, TypeScript build, a check that migrations match `schema.prisma`, and all
tests against a PostgreSQL service container. Read-only token permissions.

**4. Ticket numbers.** 4 random digits collide after about 118 tickets (birthday paradox),
and the colliding insert crashed with a 500. PostgreSQL now assigns `TKT-2026-000042` from a
sequence, unique even under concurrent requests.

**5. JWT secret.** The code fell back to a hard-coded secret and `docker-compose.yml` set the
same public string, so anyone who read the repo could sign an ADMIN token. Now the app stops
at startup if the secret is missing, shorter than 32 characters or a known placeholder.
Lifetime is 1 hour (a JWT cannot be revoked), HS256 only, and `.env` is kept out of the
Docker image (`.dockerignore`).

**6. Login rate limits.** Before, only 100 requests per 15 minutes per IP. Now: 5 failed
logins per account per IP (the IP is in the key, so attackers cannot lock real users out),
and 20 failed logins per IP across accounts (stops password spraying). `TRUST_PROXY` makes
this work correctly behind a load balancer.

## Resume line check

> "a multi-tenant backend with row-level security and 8 authenticated, rate-limited REST
> APIs, deployed to AWS (EKS, RDS) with Docker and GitHub Actions CI/CD and CloudWatch monitoring"

| Claim | True now? | What to say instead |
|---|---|---|
| multi-tenant | Partly | "Tenants" are **renters** in one property company's system, not separate companies (SaaS tenants). Say so if asked. |
| row-level security | **Yes, since 16 Oct 2026** | Name the tables and the restricted role. |
| 8 authenticated APIs | Number is wrong | 43 endpoints in 11 route groups; all except signup and login require a JWT. |
| rate-limited | Yes | General limit from the start; strict login limits since 16 Oct 2026. |
| deployed to AWS (EKS, RDS) | **No** | Nothing is deployed. Remove it, or say "designed for" only after writing a plan. |
| Docker | Partly | Postgres for development runs in Docker. The full `docker compose up` stack does not build (see gaps). |
| GitHub Actions CI/CD | **CI yes, CD no** | CI exists since 16 Oct 2026 (it first runs on GitHub after the next push). Nothing deploys automatically. |
| CloudWatch monitoring | **No** | Remove it. Logging is Winston to local files. |

A version you can defend line by line:

> Built PropertyFlow, a property-management backend (Express, TypeScript, Prisma, PostgreSQL)
> with JWT auth and role-based access. Audited it in October 2026: fixed IDOR access-control
> bugs, added PostgreSQL row-level security as defense in depth, startup secret validation,
> login rate limiting and a GitHub Actions CI pipeline running 58 integration tests on Postgres.

## How to talk about it

- **Date it.** "In October 2026 I went back and audited it." Never imply these protections
  were there from the start or that real customers used it.
- **Lead with a finding, then the proof.** "I wrote the tests first; 13 of 21 failed, so a
  tenant could read other tenants' tickets." Interviewers trust a number and a test.
- **Name the trade-offs yourself:** RLS adds a small transaction per query; rate-limit counters
  live in memory (one server only); the 1-hour token means users log in again hourly.
- **Have a bug story ready:** the flaky upload test. A test failed once in a full run, I
  reproduced it every time by sending the upload in two halves 200 ms apart, found that
  multer lost the AsyncLocalStorage context, fixed it with `AsyncLocalStorage.bind`, and kept
  the test.

## Still not done (known gaps)

1. Files under `/uploads` are served to anyone with the link (random names, but no login check).
2. A worker can change the status of any ticket, and view other workers' profiles and stats.
3. Login says "Account is deactivated" before checking the password, and signup messages reveal
   which emails are whitelisted (account enumeration).
4. A deactivated user's token keeps working until it expires (up to 1 hour). No refresh tokens;
   the token is stored in `localStorage` (readable if there is ever an XSS bug).
5. Admin-created tenants get the default password `ChangeMe@123`, returned in the API response.
6. Rate-limit counters are in memory per server process (several servers need Redis).
7. Not under RLS: `users` (login must look users up first), `notifications`, and raw SQL queries.
8. Docker: **fixed 16 Oct 2026** (`b68e0a7`). Before, the backend image did not build ("tsc: not
   found") and `frontend/Dockerfile` did not exist. Now `docker compose up --build` starts
   Postgres, the backend (migrations and the RLS app role applied on start) and the frontend
   (nginx, forwards `/api` to the backend), using multi-stage builds on Node 22. Still missing:
   images are only built on this computer (CI does not build them, no registry), and in
   production mode the backend logs only to files, so `docker compose logs backend` shows just
   the startup steps.
9. CI covers the backend only (no frontend build), and there is no deployment (CD).
10. README listed "Audit logging", but the `audit_logs` table is never written to.
11. No AWS deployment and no CloudWatch monitoring.
