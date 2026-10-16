import fs from 'fs';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { createWorld, fakePng, ownerDb, resetDatabase, World } from './helpers';

// IDOR = "Insecure Direct Object Reference": a logged-in user changes an id in the URL
// (or in the request body) and gets someone else's record.
// The rule we test: other people's records answer 404, exactly like records that do not exist.

let w: World;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await resetDatabase();
  w = await createWorld();
});

afterAll(async () => {
  await prisma.$disconnect();
  await ownerDb.$disconnect();
});

describe('GET /api/tickets/:id', () => {
  it('lets a tenant read their own ticket', async () => {
    const res = await request(app).get(`/api/tickets/${w.ticketA.id}`).set(auth(w.tokens.alice));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(w.ticketA.id);
  });

  it("returns 404 when a tenant asks for another tenant's ticket", async () => {
    const res = await request(app).get(`/api/tickets/${w.ticketA.id}`).set(auth(w.tokens.bob));
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('Alice');
  });

  it('gives the same answer for a ticket that does not exist', async () => {
    const res = await request(app)
      .get('/api/tickets/00000000-0000-0000-0000-000000000000')
      .set(auth(w.tokens.bob));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Ticket not found');
  });

  it('lets admins and workers read any ticket', async () => {
    for (const token of [w.tokens.admin, w.tokens.worker]) {
      const res = await request(app).get(`/api/tickets/${w.ticketA.id}`).set(auth(token));
      expect(res.status).toBe(200);
    }
  });
});

describe('POST /api/tickets/:id/attachments', () => {
  it("returns 404 when a tenant uploads to another tenant's ticket", async () => {
    const filesBefore = fs.readdirSync(process.env.UPLOAD_DIR!).length;
    const res = await request(app)
      .post(`/api/tickets/${w.ticketA.id}/attachments`)
      .set(auth(w.tokens.bob))
      .attach('file', fakePng.buffer, fakePng.options);
    expect(res.status).toBe(404);
    expect(await ownerDb.ticketAttachment.count({ where: { ticketId: w.ticketA.id } })).toBe(0);
    // the rejected file was deleted from disk, not left behind
    expect(fs.readdirSync(process.env.UPLOAD_DIR!).length).toBe(filesBefore);
  });

  it('lets a tenant upload to their own ticket', async () => {
    const res = await request(app)
      .post(`/api/tickets/${w.ticketA.id}/attachments`)
      .set(auth(w.tokens.alice))
      .attach('file', fakePng.buffer, fakePng.options);
    expect(res.status).toBe(201);
  });
});

describe('POST /api/tickets', () => {
  it("returns 404 when a tenant files a ticket for someone else's unit", async () => {
    const res = await request(app).post('/api/tickets').set(auth(w.tokens.bob)).send({
      unitId: w.unitA.id,
      title: 'Not my unit',
      description: 'Trying to file a ticket for unit 101',
      category: 'GENERAL',
    });
    expect(res.status).toBe(404);
  });

  it('lets a tenant file a ticket for their own unit', async () => {
    const res = await request(app).post('/api/tickets').set(auth(w.tokens.bob)).send({
      unitId: w.unitB.id,
      title: 'Heater again',
      description: 'The heater stopped working again',
      category: 'HVAC',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.tenantId).toBe(w.bob.id);
  });
});

describe('/api/tenants', () => {
  it('shows a tenant only their own record in the list', async () => {
    const res = await request(app).get('/api/tenants').set(auth(w.tokens.bob));
    expect(res.status).toBe(200);
    const ids = res.body.data.tenants.map((t: { id: string }) => t.id);
    expect(ids).toEqual([w.bob.id]);
  });

  it("returns 404 when a tenant asks for another tenant's profile", async () => {
    const res = await request(app).get(`/api/tenants/${w.alice.id}`).set(auth(w.tokens.bob));
    expect(res.status).toBe(404);
  });

  it('lets a tenant read their own profile', async () => {
    const res = await request(app).get(`/api/tenants/${w.bob.id}`).set(auth(w.tokens.bob));
    expect(res.status).toBe(200);
  });

  it('does not let workers list tenants', async () => {
    const res = await request(app).get('/api/tenants').set(auth(w.tokens.worker));
    expect(res.status).toBe(403);
  });

  it('lets admins list every tenant', async () => {
    const res = await request(app).get('/api/tenants').set(auth(w.tokens.admin));
    expect(res.status).toBe(200);
    expect(res.body.data.tenants).toHaveLength(2);
  });
});

describe('GET /api/units', () => {
  it("does not show tenants the full unit list with other tenants' names and emails", async () => {
    const res = await request(app).get('/api/units').set(auth(w.tokens.bob));
    expect(res.status).toBe(403);
  });
});

describe('/api/payments', () => {
  it("returns 404 when a tenant records a payment on another tenant's tenancy", async () => {
    const res = await request(app).post('/api/payments').set(auth(w.tokens.bob)).send({
      tenancyId: w.tenancyA.id,
      amount: 1,
      paymentType: 'RENT',
      paymentDate: '2026-10-05T00:00:00.000Z',
    });
    expect(res.status).toBe(404);
  });

  it('lets a tenant record a payment on their own tenancy', async () => {
    const res = await request(app).post('/api/payments').set(auth(w.tokens.bob)).send({
      tenancyId: w.tenancyB.id,
      amount: 1000,
      paymentType: 'RENT',
      paymentDate: '2026-10-05T00:00:00.000Z',
    });
    expect(res.status).toBe(201);
  });

  it("returns 404 when a tenant uploads a receipt to another tenant's payment", async () => {
    const res = await request(app)
      .post(`/api/payments/${w.paymentA.id}/receipt`)
      .set(auth(w.tokens.bob))
      .attach('receipt', fakePng.buffer, fakePng.options);
    expect(res.status).toBe(404);
    const payment = await ownerDb.paymentRecord.findUnique({ where: { id: w.paymentA.id } });
    expect(payment?.receiptPath).toBeNull();
  });

  it('does not let workers see rent payments', async () => {
    const res = await request(app).get('/api/payments').set(auth(w.tokens.worker));
    expect(res.status).toBe(403);
  });
});

describe('/api/documents', () => {
  it("returns 404 when a tenant uploads a document to another tenant's tenancy", async () => {
    const res = await request(app)
      .post('/api/documents')
      .set(auth(w.tokens.bob))
      .field('tenancyId', w.tenancyA.id)
      .field('documentType', 'LEASE')
      .attach('document', fakePng.buffer, fakePng.options);
    expect(res.status).toBe(404);
    // Alice's lease must still be her current one
    const doc = await ownerDb.document.findUnique({ where: { id: w.documentA.id } });
    expect(doc?.isCurrent).toBe(true);
  });

  it("returns 404 (not 403) when a tenant downloads another tenant's document", async () => {
    const res = await request(app)
      .get(`/api/documents/${w.documentA.id}/download`)
      .set(auth(w.tokens.bob));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Document not found');
  });

  it('does not let workers see tenant documents', async () => {
    const res = await request(app).get('/api/documents').set(auth(w.tokens.worker));
    expect(res.status).toBe(403);
  });
});
