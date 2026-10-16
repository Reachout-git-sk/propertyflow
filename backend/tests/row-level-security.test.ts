import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import app from '../src/app';
import prisma, { runAsSystem, runWithDbContext } from '../src/config/database';
import * as access from '../src/utils/access';
import { createWorld, fakePng, ownerDb, resetDatabase, World } from './helpers';

// These tests talk to PostgreSQL through the app's own connection (the restricted
// propertyflow_app role) and check that the DATABASE enforces "tenants see only their
// own rows", even when the application code forgets to.

let w: World;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const asUser = <T>(user: { id: string; role: string }, fn: () => Promise<T>) =>
  runWithDbContext({ userId: user.id, role: user.role }, fn);

beforeAll(async () => {
  await resetDatabase();
  w = await createWorld();
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await ownerDb.$disconnect();
});

describe('the code-level check is removed, the database still says no', () => {
  it("returns 404 for another tenant's ticket even when ownedBy() filters nothing", async () => {
    // Simulate a developer forgetting the ownership check: ownedBy() now returns
    // an empty filter for everyone, so the code asks for the ticket by id only.
    const spy = jest.spyOn(access, 'ownedBy').mockReturnValue({});

    const res = await request(app).get(`/api/tickets/${w.ticketA.id}`).set(auth(w.tokens.bob));

    expect(spy).toHaveBeenCalled(); // the "check" ran, but filtered nothing
    expect(res.status).toBe(404); // RLS hid Alice's ticket from Bob
    expect(JSON.stringify(res.body)).not.toContain('Alice');
  });

  it("hides Alice's ticket from a plain findUnique by id (the original IDOR query)", async () => {
    const ticket = await asUser(w.bob, () => prisma.ticket.findUnique({ where: { id: w.ticketA.id } }));
    expect(ticket).toBeNull();
  });

  it('still lets Alice read her own ticket the same way', async () => {
    const ticket = await asUser(w.alice, () => prisma.ticket.findUnique({ where: { id: w.ticketA.id } }));
    expect(ticket?.id).toBe(w.ticketA.id);
  });
});

describe('what each role can see', () => {
  it("shows a tenant only their own rows in every protected table, even with no filter", async () => {
    const seen = await asUser(w.bob, async () => ({
      tickets: await prisma.ticket.findMany(),
      tenancies: await prisma.tenancy.findMany(),
      payments: await prisma.paymentRecord.findMany(),
      documents: await prisma.document.findMany(),
    }));

    expect(seen.tickets.length).toBeGreaterThan(0);
    expect(seen.tickets.every((t) => t.tenantId === w.bob.id)).toBe(true);
    expect(seen.tenancies.map((t) => t.id)).toEqual([w.tenancyB.id]);
    expect(seen.payments.every((p) => p.tenancyId === w.tenancyB.id)).toBe(true);
    expect(seen.documents).toEqual([]); // the only document belongs to Alice
  });

  it("hides rows that hang off another tenant's ticket (activity log, attachments)", async () => {
    await ownerDb.ticketActivityLog.create({
      data: { ticketId: w.ticketA.id, action: 'NOTE', notes: "Alice's private note" },
    });
    const logs = await asUser(w.bob, () =>
      prisma.ticketActivityLog.findMany({ where: { ticketId: w.ticketA.id } })
    );
    expect(logs).toEqual([]);
  });

  it('lets admins see every ticket and every tenancy', async () => {
    const seen = await asUser(w.admin, async () => ({
      tickets: await prisma.ticket.count(),
      tenancies: await prisma.tenancy.count(),
    }));
    expect(seen.tickets).toBe(await ownerDb.ticket.count());
    expect(seen.tenancies).toBe(2);
  });

  it('lets workers see every ticket but no leases, payments or documents', async () => {
    const seen = await asUser(w.workerUser, async () => ({
      tickets: await prisma.ticket.count(),
      tenancies: await prisma.tenancy.count(),
      payments: await prisma.paymentRecord.count(),
      documents: await prisma.document.count(),
    }));
    expect(seen.tickets).toBe(await ownerDb.ticket.count());
    expect(seen).toMatchObject({ tenancies: 0, payments: 0, documents: 0 });
  });

  it('lets background jobs (SYSTEM) see every ticket', async () => {
    const count = await runAsSystem(() => prisma.ticket.count());
    expect(count).toBe(await ownerDb.ticket.count());
  });
});

describe('writes are checked too', () => {
  it("refuses to let a tenant create a ticket in another tenant's name", async () => {
    const attempt = asUser(w.bob, () =>
      prisma.ticket.create({
        data: {
          ticketNumber: 'TKT-RLS-FORGED',
          tenantId: w.alice.id, // pretending to be Alice
          unitId: w.unitA.id,
          title: 'Forged ticket',
          description: 'Created by Bob in Alice’s name',
          category: 'GENERAL',
        },
      })
    );
    await expect(attempt).rejects.toThrow(/row-level security/);
    expect(await ownerDb.ticket.count({ where: { ticketNumber: 'TKT-RLS-FORGED' } })).toBe(0);
  });

  it("cannot change another tenant's ticket (the row is invisible, so nothing is updated)", async () => {
    const result = await asUser(w.bob, () =>
      prisma.ticket.updateMany({ where: { id: w.ticketA.id }, data: { title: 'Hacked' } })
    );
    expect(result.count).toBe(0);
    const ticket = await ownerDb.ticket.findUnique({ where: { id: w.ticketA.id } });
    expect(ticket?.title).not.toBe('Hacked');
  });
});

describe('safety of the setup itself', () => {
  it('runs the app as the restricted role, which is not a superuser and cannot bypass RLS', async () => {
    const [role] = await prisma.$queryRaw<{ name: string; rolsuper: boolean; rolbypassrls: boolean }[]>`
      SELECT current_user AS name, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
    expect(role).toEqual({ name: 'propertyflow_app', rolsuper: false, rolbypassrls: false });
  });

  it('fails closed: a query with no user set sees no tenant-owned rows', async () => {
    // e.g. a new route someone forgot to put behind `authenticate`
    expect(await prisma.ticket.findMany()).toEqual([]);
    expect(await prisma.tenancy.findMany()).toEqual([]);
  });

  it("does not leak one request's user into the next query on the same connection", async () => {
    // The test app uses a single pooled connection (connection_limit=1), so both
    // queries below run on the SAME connection.
    await asUser(w.bob, () => prisma.ticket.findMany());
    const [after] = await prisma.$queryRaw<{ user_id: string | null; role: string | null }[]>`
      SELECT current_setting('app.user_id', true) AS user_id, current_setting('app.role', true) AS role`;
    expect(after.user_id || null).toBeNull();
    expect(after.role || null).toBeNull();
  });

  it('shows the owner connection sees everything (why the app must never use it)', async () => {
    expect(await ownerDb.ticket.count()).toBeGreaterThanOrEqual(2);
  });

  it('keeps the logged-in user when an upload arrives slowly (multer)', async () => {
    // Like a phone on a slow network: the second half of the file arrives 200 ms later.
    // multer finishes reading inside that later network event. If the request's database
    // context were lost there, RLS would hide Alice's own ticket and she would get 404.
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const boundary = 'propertyflow-test-boundary';
    const firstHalf = Buffer.from(
      `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="file"; filename="slow.png"\r\n' +
        'Content-Type: image/png\r\n\r\n' +
        'first half of the picture, '
    );
    const secondHalf = Buffer.from(`second half of the picture\r\n--${boundary}--\r\n`);

    try {
      const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.request(
          {
            port,
            method: 'POST',
            path: `/api/tickets/${w.ticketA.id}/attachments`,
            headers: {
              ...auth(w.tokens.alice),
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': firstHalf.length + secondHalf.length,
            },
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => resolve({ status: res.statusCode!, body }));
          }
        );
        req.on('error', reject);
        req.write(firstHalf);
        setTimeout(() => req.end(secondHalf), 200);
      });

      expect(response).toMatchObject({ status: 201 });
    } finally {
      server.close();
    }
  });
});
