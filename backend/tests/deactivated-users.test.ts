import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { createWorld, ownerDb, resetDatabase, tokenFor, World } from './helpers';

// A JWT is a signed note: "this is Bob, a TENANT, valid until 15:00". The server used to
// trust the note without asking the database, so it could not be taken back. When an admin
// deactivated Bob (he moved out, or a worker left the company), his token kept working
// for up to an hour. Now every request checks the account in the database first.

let w: World;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const sessionEnded = { success: false, message: 'Your session has ended. Please log in again.' };
const myTickets = (token: string) => request(app).get('/api/tickets').set(auth(token));

beforeAll(async () => {
  await resetDatabase();
  w = await createWorld();
});

afterAll(async () => {
  await prisma.$disconnect();
  await ownerDb.$disconnect();
});

it('lets an active user in', async () => {
  expect((await myTickets(w.tokens.bob)).status).toBe(200);
});

it('locks Bob out at once when an admin deactivates him, although his token has not expired', async () => {
  const deactivate = await request(app)
    .delete(`/api/tenants/${w.bob.id}/deactivate`)
    .set(auth(w.tokens.admin));
  expect(deactivate.status).toBe(200);

  const res = await myTickets(w.tokens.bob);
  expect(res.status).toBe(401);
  expect(res.body).toEqual(sessionEnded);
});

it('lets the same token work again if the admin reactivates Bob (it is a live check)', async () => {
  await ownerDb.user.update({ where: { id: w.bob.id }, data: { isActive: true } });
  expect((await myTickets(w.tokens.bob)).status).toBe(200);
});

it('refuses the token of a user who was deleted', async () => {
  const gone = await ownerDb.user.create({
    data: { email: 'gone@test.local', passwordHash: 'x', role: 'TENANT', firstName: 'Gone', lastName: 'Test' },
  });
  const token = tokenFor(gone);
  await ownerDb.user.delete({ where: { id: gone.id } });

  const res = await myTickets(token);
  expect(res.status).toBe(401);
  expect(res.body).toEqual(sessionEnded);
});

it('uses the role stored in the database, not the role written in an older token', async () => {
  // For example a token issued while someone was still an admin
  const oldAdminToken = tokenFor({ ...w.bob, role: 'ADMIN' });
  const res = await request(app).get('/api/tickets/stats').set(auth(oldAdminToken));
  expect(res.status).toBe(403);
});
