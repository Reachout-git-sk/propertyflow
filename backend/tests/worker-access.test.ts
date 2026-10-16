import fs from 'fs';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { createWorld, fakePng, ownerDb, resetDatabase, tokenFor, World } from './helpers';

// Workers may READ every ticket (that is their job list), but may only CHANGE tickets
// an admin assigned to them, and may only see their own worker profile and stats.
// Before, any worker could change any ticket (for example mark another worker's job
// COMPLETED) and read every other worker's profile, phone number and job history.

let w: World;
let wendy: { workerId: string; token: string };
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const missingId = '00000000-0000-0000-0000-000000000000';

const setStatus = (ticketId: string, token: string, status: string) =>
  request(app).patch(`/api/tickets/${ticketId}/status`).set(auth(token)).send({ status });
const statusOf = async (ticketId: string) =>
  (await ownerDb.ticket.findUniqueOrThrow({ where: { id: ticketId } })).status;

beforeAll(async () => {
  await resetDatabase();
  w = await createWorld();

  // A second worker, Wendy
  const wendyUser = await ownerDb.user.create({
    data: {
      email: 'wendy@test.local',
      passwordHash: 'not-used-in-these-tests',
      role: 'WORKER',
      firstName: 'Wendy',
      lastName: 'Test',
      phone: '555-0199',
    },
  });
  const wendyWorker = await ownerDb.worker.create({ data: { userId: wendyUser.id, skills: ['HVAC'] } });
  wendy = { workerId: wendyWorker.id, token: tokenFor(wendyUser) };

  // The admin assigned Alice's ticket to Walter. Bob's ticket is not assigned to anyone.
  await ownerDb.ticketAssignment.create({
    data: { ticketId: w.ticketA.id, workerId: w.worker.id, assignedBy: w.admin.id },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await ownerDb.$disconnect();
});

describe('PATCH /api/tickets/:id/status', () => {
  it('lets Walter update a ticket assigned to him', async () => {
    const res = await setStatus(w.ticketA.id, w.tokens.worker, 'IN_PROGRESS');
    expect(res.status).toBe(200);
    expect(await statusOf(w.ticketA.id)).toBe('IN_PROGRESS');
  });

  it("does not let Walter change Bob's ticket, which is not assigned to him", async () => {
    const before = await statusOf(w.ticketB.id);
    const res = await setStatus(w.ticketB.id, w.tokens.worker, 'COMPLETED');
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('You can only update tickets assigned to you');
    expect(await statusOf(w.ticketB.id)).toBe(before);
    expect(await ownerDb.ticketActivityLog.count({ where: { ticketId: w.ticketB.id } })).toBe(0);
  });

  it("does not let Wendy change Walter's ticket", async () => {
    const res = await setStatus(w.ticketA.id, wendy.token, 'COMPLETED');
    expect(res.status).toBe(403);
    expect(await statusOf(w.ticketA.id)).not.toBe('COMPLETED');
  });

  it('lets admins update any ticket', async () => {
    const res = await setStatus(w.ticketB.id, w.tokens.admin, 'ON_HOLD');
    expect(res.status).toBe(200);
    expect(await statusOf(w.ticketB.id)).toBe('ON_HOLD');
  });

  it('still answers 404 for a ticket that does not exist', async () => {
    const res = await setStatus(missingId, w.tokens.worker, 'IN_PROGRESS');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tickets/:id/attachments by a worker', () => {
  it('lets Walter add a photo to his assigned ticket', async () => {
    const res = await request(app)
      .post(`/api/tickets/${w.ticketA.id}/attachments`)
      .set(auth(w.tokens.worker))
      .attach('file', fakePng.buffer, fakePng.options);
    expect(res.status).toBe(201);
  });

  it('does not let Walter add photos to a ticket that is not his', async () => {
    const filesBefore = fs.readdirSync(process.env.UPLOAD_DIR!).length;
    const res = await request(app)
      .post(`/api/tickets/${w.ticketB.id}/attachments`)
      .set(auth(w.tokens.worker))
      .attach('file', fakePng.buffer, fakePng.options);
    expect(res.status).toBe(403);
    expect(await ownerDb.ticketAttachment.count({ where: { ticketId: w.ticketB.id } })).toBe(0);
    // the rejected file was deleted from disk, not left behind
    expect(fs.readdirSync(process.env.UPLOAD_DIR!).length).toBe(filesBefore);
  });
});

describe('GET /api/workers/:id', () => {
  it('lets Walter read his own profile', async () => {
    const res = await request(app).get(`/api/workers/${w.worker.id}`).set(auth(w.tokens.worker));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(w.worker.id);
  });

  it("returns 404 when Walter asks for Wendy's profile", async () => {
    const res = await request(app).get(`/api/workers/${wendy.workerId}`).set(auth(w.tokens.worker));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Worker not found');
    expect(JSON.stringify(res.body)).not.toContain('555-0199');
  });

  it('lets admins read any worker profile', async () => {
    const res = await request(app).get(`/api/workers/${wendy.workerId}`).set(auth(w.tokens.admin));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/workers/:id/stats', () => {
  it('lets Walter read his own stats', async () => {
    const res = await request(app).get(`/api/workers/${w.worker.id}/stats`).set(auth(w.tokens.worker));
    expect(res.status).toBe(200);
    expect(res.body.data.totalAssignments).toBe(1);
  });

  it("returns 404 when Walter asks for Wendy's stats", async () => {
    const res = await request(app).get(`/api/workers/${wendy.workerId}/stats`).set(auth(w.tokens.worker));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Worker not found');
  });

  it('returns 404 for a worker that does not exist (it used to answer with zeros)', async () => {
    const res = await request(app).get(`/api/workers/${missingId}/stats`).set(auth(w.tokens.admin));
    expect(res.status).toBe(404);
  });
});
