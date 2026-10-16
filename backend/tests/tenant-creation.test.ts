import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { createWorld, ownerDb, resetDatabase, World } from './helpers';

// Admins create tenant accounts (POST /api/tenants). Before, if the admin left the password
// empty, the account got the default password ChangeMe@123, which is printed in this public
// repository, so anyone could log in to every such account. The API also sent the password
// back in its response, where it can end up in logs and browser developer tools.

let w: World;
let unitId: string;
const STRONG_PASSWORD = 'Maple-Street-42!';

const createTenant = (email: string, password?: string) =>
  request(app)
    .post('/api/tenants')
    .set({ Authorization: `Bearer ${w.tokens.admin}` })
    .send({
      email,
      password,
      firstName: 'Nina',
      lastName: 'Newcomer',
      unitId,
      leaseStart: '2026-11-01T00:00:00.000Z',
      leaseEnd: '2027-11-01T00:00:00.000Z',
      rentAmount: 1200,
    });
const accountsWith = (email: string) => ownerDb.user.count({ where: { email } });

beforeAll(async () => {
  await resetDatabase();
  w = await createWorld();
  const property = await ownerDb.property.findFirstOrThrow();
  unitId = (await ownerDb.unit.create({ data: { propertyId: property.id, unitNumber: '103' } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
  await ownerDb.$disconnect();
});

it('refuses to create a tenant without a password (no shared default any more)', async () => {
  const res = await createTenant('no-password@test.local');
  expect(res.status).toBe(400);
  expect(res.body.message).toContain('password');
  expect(await accountsWith('no-password@test.local')).toBe(0);
});

it('refuses a weak password, with the same rules as sign-up', async () => {
  const res = await createTenant('weak@test.local', 'password');
  expect(res.status).toBe(400);
  expect(await accountsWith('weak@test.local')).toBe(0);
});

it('creates the tenant with the password the admin set, and does not send it back', async () => {
  const res = await createTenant('nina@test.local', STRONG_PASSWORD);
  expect(res.status).toBe(201);
  expect(JSON.stringify(res.body)).not.toContain(STRONG_PASSWORD);
  expect(res.body.data).not.toHaveProperty('temporaryPassword');
});

it('lets the new tenant log in with that password', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nina@test.local', password: STRONG_PASSWORD });
  expect(res.status).toBe(200);
});
