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
| 3 | GitHub Actions CI (install, build, migration check, tests on Postgres) | `396cc89` | green on GitHub since 16 Oct 2026: [run 38958850580](https://github.com/Reachout-git-sk/propertyflow/actions/runs/38958850580), 53 s, migration check and 58/58 tests |
| 4 | Ticket numbers from a database sequence instead of 4 random digits | `866789c` | 4 tests, **3 failed before** |
| 5 | App refuses to start without a real JWT secret; tokens last 1 hour, not 7 days | `c6705cc` | 10 tests; old setup let a forged ADMIN token in (HTTP 200) |
| 6 | Stricter login rate limits (failed attempts only) | `9fea054` | 8 tests, **4 failed before** |
| 7 | Uploaded files are private: no public `/uploads` folder, downloads only through logged-in, ownership-checked routes | `d4c0f4e` | 15 tests, **12 failed before** |
| 8 | Workers can only change tickets assigned to them, and only see their own profile and stats | `dc355b1` | 13 tests, **6 failed before** |
| 9 | Login and sign-up no longer reveal which emails have an account (account enumeration) | `f69dde0` | 8 tests, **5 failed before** |
| 10 | No default password for admin-created tenants; the password is never sent back | `2c28829` | 4 tests, **3 failed before** |
| 11 | A deactivated or deleted user is locked out on their next request, not up to 1 hour later | `2d7aee6` | 5 tests, **3 failed before** |
| 12 | Sign-up needs a one-time invite code from an admin, so knowing an approved email is no longer enough | `6a49d9b` | 13 new tests + 1 updated, **14 failed before** |

Rows 0–6 and 7–12 were all done on 16 October 2026 (7–12 in the evening, as a second pass
over the gaps the first pass found).

**116 tests in 11 files, all passing.** Run them with `docker compose up -d postgres`, then
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
tests against a PostgreSQL service container. Read-only token permissions. The first run on
GitHub (16 Oct 2026, commit `c3675a8`) passed every step in 53 seconds, with 58/58 tests. The
later commits (rows 7–11, 103 tests) are not pushed yet, so CI has not run them on GitHub.

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

**7. Private file downloads.** Ticket photos, rent receipts and lease documents were saved in
an `uploads` folder that Express served to the whole internet (`express.static`): anyone with
a file's link got the file, with no login. The names were random, but a link is easy to leak
(a forwarded email, browser history, a log). Now the folder is not served at all. Files come
only through three routes that need a login and use the same rules as the record they belong
to: `GET /api/tickets/:id/attachments/:attachmentId` (the attachment must also belong to that
ticket), `GET /api/payments/:id/receipt` and `GET /api/documents/:id/download`. Row-level
security still hides other tenants' files even if the code check is switched off (tested).
Two extra guards in `sendStoredFile()` (`src/utils/files.ts`): it only sends files inside the
upload folder, because the path comes from the database and a row can point anywhere (before,
a document row pointing at `package.json` downloaded it with 200); and it sends files as
"attachment", so the browser saves them instead of opening them, and an uploaded HTML file
cannot run scripts on our site. The frontend never linked to `/uploads`, so nothing broke.

**8. Worker scoping.** A worker could change the status of *any* ticket (for example mark
another worker's job COMPLETED) and read every worker's profile, phone number and stats. Now a
worker can only change the status of, or add photos to, tickets that have a row for them in
`ticket_assignments`. Otherwise they get 403. It is 403 and not 404 on purpose: workers may still *read* every
ticket (their job list), so pretending the ticket does not exist would hide nothing.
`GET /api/workers/:id` and `/:id/stats` only find the worker's own profile
(`ownWorkerProfile()` in `src/utils/access.ts`). Anyone else's answers 404, like a missing one.

**9. Account enumeration.** *Enumeration* means learning which emails have an account from the
error messages, which tells an attacker whom to target. Login said "Account is deactivated"
(403) *before* checking the password, so anyone could test emails without knowing any
password. It also skipped the password check for unknown emails. bcrypt (the slow password
hash) takes about 60 ms here, so those answers came back faster and a stopwatch revealed which
emails exist (a *timing leak*). Now login always runs bcrypt (against a throwaway hash for
unknown emails) and every failure gets the same answer: 401 "Invalid email or password". That
includes a deactivated account with the right password, because saying "deactivated" there
would confirm the password is correct, and people reuse passwords on other sites. Sign-up said
403 "not authorized" for emails not on the approved list and 400 "already exists" for
registered ones. Both now get the same 403 message.

**10. No default tenant password.** When an admin created a tenant without a password, the
account got `ChangeMe@123`, the same for everyone and printed in this public repo, and the API
returned the password in its response. Now the admin must set a password that follows the
sign-up rules (8+ characters, upper and lower case, a number, a symbol), and the response never
contains it. Trade-off: the admin knows the tenant's password and must hand it over in person.
I chose this over a server-generated one-time password because the admin form already asked
for a password, and a one-time password only helps if the app forces a change at first login,
which needs a new database column and a change-password screen. The best design is an emailed
invitation link (nobody but the tenant ever knows the password), but the app sends no email yet.

**11. Deactivation works at once.** A JWT is a signed note ("this is Bob, a tenant, valid until
15:00"). The server checked the signature but never asked the database, so a deactivated or
deleted user's token kept working for up to 1 hour. Now `authenticate` looks the user up by id
on every request (one primary-key lookup) and answers 401 if the account is missing or
inactive. The role also comes from the database now, not from the token, so an outdated role in
an older token no longer counts. Why one lookup per request is worth it: it is the cheapest
lookup a database can do, while the alternatives also cost something. Very short tokens plus
refresh tokens are more moving parts. A list of banned tokens needs a lookup too. I did not
benchmark the extra lookup.

**12. Sign-up needs an invite code.** Sign-up created an account for any email on the
approved list (`email_whitelist`) that had no account yet, with the role it was approved for,
and never checked that the caller owns that email. The seed approves `worker1@example.com` as a
WORKER, so anyone who knew or guessed it could claim a worker account and pick its password. The
test for this got 201 (account created) with a made-up code. Turning sign-up off was simpler, but
sign-up is the only way to create a WORKER account (there is no admin route for it), so I kept it
and made it invite-only. An admin calls `POST /api/auth/invites` with an email and a role and
gets a one-time code (16 random bytes, valid 7 days), shown once, to hand to that person; a new
invite replaces the old code. Sign-up now needs that code. Only its SHA-256 hash is stored, like
a password, so a database leak does not reveal live codes. (A fast hash is fine here because the
code is random and long; bcrypt's slowness is for short passwords people choose.) A missing code
gets 400; a wrong, expired, used, or other email's code gets the same 403 as every other refusal.
The code is *used up* in one `UPDATE` that also checks it is still there, so if two sign-ups
race with one code, PostgreSQL lets only one through. I checked that this test catches the
bug: with that step switched off, the second sign-up crashed with a 500. Trade-offs: the admin
must hand the code over (the app sends no email), and if creating the account fails after the
code was used up, the admin sends a new invite. The screens for both came later the same day
(see gap 2 below).

## Resume line check

> "a multi-tenant backend with row-level security and 8 authenticated, rate-limited REST
> APIs, deployed to AWS (EKS, RDS) with Docker and GitHub Actions CI/CD and CloudWatch monitoring"

| Claim | True now? | What to say instead |
|---|---|---|
| multi-tenant | Partly | "Tenants" are **renters** in one property company's system, not separate companies (SaaS tenants). Say so if asked. |
| row-level security | **Yes, since 16 Oct 2026** | Name the tables and the restricted role. |
| 8 authenticated APIs | Number is wrong | 46 endpoints in 11 route groups (43 before the two download routes and the invite route of 16 Oct 2026); all except signup and login require a JWT. |
| rate-limited | Yes | General limit from the start; strict login limits since 16 Oct 2026. |
| deployed to AWS (EKS, RDS) | **No** | Nothing is deployed. Remove it, or say "designed for" only after writing a plan. |
| Docker | Partly | Postgres for development runs in Docker. The full `docker compose up` stack does not build (see gaps). |
| GitHub Actions CI/CD | **CI yes, CD no** | CI has run green on GitHub since 16 Oct 2026 (run 38958850580: build, migration check, 58/58 tests). Nothing deploys automatically. |
| CloudWatch monitoring | **No** | Remove it. Logging is Winston to local files. |

A version you can defend line by line:

> Built PropertyFlow, a property-management backend (Express, TypeScript, Prisma, PostgreSQL)
> with JWT auth and role-based access. Audited it in October 2026: fixed IDOR and other
> access-control bugs (public file uploads, worker permissions, account enumeration, sign-up
> without proof of email ownership, tokens that outlived deactivation), added PostgreSQL
> row-level security as defense in depth, startup secret validation, login rate limiting and
> a GitHub Actions CI pipeline running 116 integration tests on Postgres.

## How to talk about it

- **Date it.** "In October 2026 I went back and audited it." Never imply these protections
  were there from the start or that real customers used it.
- **Lead with a finding, then the proof.** "I wrote the tests first; 13 of 21 failed, so a
  tenant could read other tenants' tickets." Interviewers trust a number and a test.
- **Name the trade-offs yourself:** RLS adds a small transaction per query; rate-limit counters
  live in memory (one server only); the 1-hour token means users log in again hourly; every
  request now does one extra user lookup; a deactivated user sees "Invalid email or password"
  and must ask the admin why; admins know the passwords they set for tenants; admins hand
  invite codes over themselves because the app sends no email.
- **Lines you can use for the 16 October 2026 second pass:**
  - "My first audit listed its own gaps. I fixed five of them the same day, test first: for
    example, the uploads folder was public, and a test showed a file came back with no login."
  - "I made login give one answer for every failure and always run bcrypt, because skipping it
    for unknown emails made those answers about 60 ms faster, a timing leak."
  - "Deactivating a user now works on their next request. It costs one primary-key lookup per
    request, which I chose over refresh tokens for an app this size."
  - "Sign-up trusted the approved-email list alone, so anyone who guessed an approved worker
    email could take that account. On 16 October 2026 I made it invite-only: the admin gets a
    one-time code, stored only as a hash, and it is used up in a single UPDATE, so even two
    sign-ups at the same moment make one account."
- **Have a bug story ready:** the flaky upload test. A test failed once in a full run, I
  reproduced it every time by sending the upload in two halves 200 ms apart, found that
  multer lost the AsyncLocalStorage context, fixed it with `AsyncLocalStorage.bind`, and kept
  the test.

## Still not done (known gaps)

Fixed on 16 Oct 2026 and moved to the table above (rows 7–12): public `/uploads`, workers
changing any ticket, login and sign-up account enumeration, the `ChangeMe@123` default
password, tokens that kept working after deactivation, and sign-up without proof of email
ownership. Found while fixing them: items 2–6 (item 2 is now fixed too).

1. No refresh tokens, and the token is stored in `localStorage` (readable if there is ever an
   XSS bug).
2. Sign-up email ownership: **fixed 16 Oct 2026** (`6a49d9b`, row 12). Sign-up now needs a
   one-time invite code from an admin. Still missing: no emailed invitation links (the app
   sends no email).
   Screens added the same day (`631e6b8`, `c31d6df`): admins create invites at `/admin/invites`
   (code shown once, with a Copy button) and people sign up with the code at `/signup`; 16
   Vitest tests (the frontend's first), all 16 failed before. Not yet tried end to end in a browser.
3. The rule "workers only change tickets assigned to them" is in the code only. Row-level
   security still lets the worker role update every ticket.
4. Workers can set any status, including CLOSED and CANCELLED, and the status value is not
   checked against the allowed list.
5. The admin password reset (`PATCH /api/tenants/:id`) does not run its validation schema, so it
   accepts weak passwords. Users cannot change their own password.
6. Upload responses still include the server's file path (`filePath`). Harmless now that the
   folder is private, but it shows internal details. If the frontend ever shows photos, it must
   download them with the token (a plain `<img src>` cannot send the Authorization header).
7. Rate-limit counters are in memory per server process (several servers need Redis).
8. Not under RLS: `users` (login must look users up first), `notifications`, and raw SQL queries.
9. Docker: **fixed 16 Oct 2026** (`b68e0a7`). Before, the backend image did not build ("tsc: not
   found") and `frontend/Dockerfile` did not exist. Now `docker compose up --build` starts
   Postgres, the backend (migrations and the RLS app role applied on start) and the frontend
   (nginx, forwards `/api` to the backend), using multi-stage builds on Node 22. Still missing:
   images are only built on this computer (CI does not build them, no registry), and in
   production mode the backend logs only to files, so `docker compose logs backend` shows just
   the startup steps.
10. CI frontend: **added 16 Oct 2026**. Before, CI covered the backend only. Now a second job
    (`frontend` in `ci.yml`) runs `npm ci`, the Vitest tests (16/16 when added) and
    `npm run build` (tsc and vite build) next to the backend job. Both pass on this computer,
    but the job has not run on GitHub yet because nothing has been pushed since. Still
    missing: no deployment (CD).
11. README listed "Audit logging", but the `audit_logs` table is never written to.
12. No AWS deployment and no CloudWatch monitoring.
