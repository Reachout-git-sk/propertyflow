import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { createWorld, ownerDb, resetDatabase, World } from './helpers';

// Sign-up used to create an account for any email on the approved list (email_whitelist)
// that had no account yet, with the role it was approved for. It never checked that the
// person signing up owns that email, so anyone who knew or guessed an approved email (the
// seed approves worker1@example.com as a WORKER) could claim it and pick the password.
// Now an admin creates a one-time invite code for the email and hands it to that person,
// and sign-up only works with that code.

let w: World;
const PASSWORD = 'Correct-Horse-9!';
const signupRefused = {
  success: false,
  message: 'Sign-up is not available for this email. If you have an account, log in; otherwise ask your property manager.',
};

const invite = (email: string, role: string, token = w.tokens.admin) =>
  request(app).post('/api/auth/invites').set({ Authorization: `Bearer ${token}` }).send({ email, role });
const signup = (email: string, inviteCode?: string) =>
  request(app)
    .post('/api/auth/signup')
    .send({ email, password: PASSWORD, firstName: 'New', lastName: 'Person', inviteCode });
const codeFor = async (email: string, role = 'WORKER') => (await invite(email, role)).body.data.inviteCode as string;
const accountsWith = (email: string) => ownerDb.user.count({ where: { email } });

beforeAll(async () => {
  await resetDatabase();
  w = await createWorld();
});

afterAll(async () => {
  await prisma.$disconnect();
  await ownerDb.$disconnect();
});

describe('POST /api/auth/invites (admins only)', () => {
  it('gives an admin a code for the email, valid for 7 days', async () => {
    const res = await invite('new-worker@test.local', 'WORKER');
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: 'new-worker@test.local', role: 'WORKER' });
    // 16 random bytes, written as 22 URL-safe characters: far too many to guess
    expect(res.body.data.inviteCode).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const daysLeft = (new Date(res.body.data.expiresAt).getTime() - Date.now()) / 86_400_000;
    expect(daysLeft).toBeGreaterThan(6.99);
    expect(daysLeft).toBeLessThanOrEqual(7);
  });

  it('stores only a hash of the code, like a password', async () => {
    const code = await codeFor('hashed@test.local');
    const row = await ownerDb.emailWhitelist.findUniqueOrThrow({ where: { email: 'hashed@test.local' } });
    expect(row.inviteCodeHash).toBeTruthy();
    expect(JSON.stringify(row)).not.toContain(code);
  });

  it('refuses tenants and workers', async () => {
    const asTenant = await invite('sneaky@test.local', 'ADMIN', w.tokens.alice);
    const asWorker = await invite('sneaky@test.local', 'ADMIN', w.tokens.worker);
    expect([asTenant.status, asWorker.status]).toEqual([403, 403]);
    expect(await ownerDb.emailWhitelist.count({ where: { email: 'sneaky@test.local' } })).toBe(0);
  });

  it('refuses an email that already has an account', async () => {
    const res = await invite('alice@test.local', 'WORKER');
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/signup needs the invite code', () => {
  it('refuses an approved email that was never sent a code (the old hole)', async () => {
    await ownerDb.emailWhitelist.create({ data: { email: 'approved-only@test.local', role: 'WORKER' } });
    const res = await signup('approved-only@test.local', 'made-up-code-made-up-cod');
    expect(res.status).toBe(403);
    expect(res.body).toEqual(signupRefused);
    expect(await accountsWith('approved-only@test.local')).toBe(0);
  });

  it('asks for the code when none is sent', async () => {
    await codeFor('no-code@test.local');
    const res = await signup('no-code@test.local');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('inviteCode');
    expect(await accountsWith('no-code@test.local')).toBe(0);
  });

  it('refuses a wrong code with the usual answer', async () => {
    await codeFor('wrong-code@test.local');
    const res = await signup('wrong-code@test.local', 'made-up-code-made-up-cod');
    expect(res.status).toBe(403);
    expect(res.body).toEqual(signupRefused);
    expect(await accountsWith('wrong-code@test.local')).toBe(0);
  });

  it('refuses a code that was made for a different email', async () => {
    const codeForMallory = await codeFor('mallory@test.local', 'TENANT');
    await codeFor('victim@test.local', 'WORKER');
    const res = await signup('victim@test.local', codeForMallory);
    expect(res.status).toBe(403);
    expect(res.body).toEqual(signupRefused);
    expect(await accountsWith('victim@test.local')).toBe(0);
  });

  it('refuses an expired code', async () => {
    const code = await codeFor('expired@test.local');
    await ownerDb.emailWhitelist.update({
      where: { email: 'expired@test.local' },
      data: { inviteExpiresAt: new Date(Date.now() - 1000) },
    });
    const res = await signup('expired@test.local', code);
    expect(res.status).toBe(403);
    expect(res.body).toEqual(signupRefused);
  });

  it('creates the account with the invited role when the code is right', async () => {
    const code = await codeFor('walter-two@test.local', 'WORKER');
    const res = await signup('walter-two@test.local', code);
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('WORKER');
    expect(await ownerDb.worker.count({ where: { userId: res.body.data.user.id } })).toBe(1);
  });

  it('uses the code up: it does not work a second time, even if the account is deleted', async () => {
    const code = await codeFor('once@test.local', 'TENANT');
    expect((await signup('once@test.local', code)).status).toBe(201);
    await ownerDb.user.delete({ where: { email: 'once@test.local' } });
    const again = await signup('once@test.local', code);
    expect(again.status).toBe(403);
    expect(again.body).toEqual(signupRefused);
  });

  it('makes exactly one account when two sign-ups race with the same code', async () => {
    const code = await codeFor('race@test.local', 'TENANT');
    const results = await Promise.all([signup('race@test.local', code), signup('race@test.local', code)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 403]);
    expect(await accountsWith('race@test.local')).toBe(1);
  });

  it('a new invite replaces the old code', async () => {
    const oldCode = await codeFor('resent@test.local');
    const newCode = await codeFor('resent@test.local');
    expect((await signup('resent@test.local', oldCode)).status).toBe(403);
    expect((await signup('resent@test.local', newCode)).status).toBe(201);
  });
});
