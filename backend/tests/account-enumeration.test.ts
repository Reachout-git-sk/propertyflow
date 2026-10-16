import bcrypt from 'bcrypt';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import * as passwordHash from '../src/utils/passwordHash';
import { ownerDb, resetDatabase, tokenFor } from './helpers';

// "Account enumeration" = finding out which emails have an account (or are approved to
// sign up) just from the error messages. An attacker then knows exactly whom to target
// with password guessing or phishing. So every failure must look the same from outside.

const PASSWORD = 'Correct-Horse-9!';
const loginFailed = { success: false, message: 'Invalid email or password' };
const signupRefused = {
  success: false,
  message: 'Sign-up is not available for this email. If you have an account, log in; otherwise ask your property manager.',
};

const login = (email: string, password: string) =>
  request(app).post('/api/auth/login').send({ email, password });
const signup = (email: string, inviteCode = 'made-up-code-made-up-cod') =>
  request(app)
    .post('/api/auth/signup')
    .send({ email, password: PASSWORD, firstName: 'New', lastName: 'Person', inviteCode });

let adminToken: string;

beforeAll(async () => {
  await resetDatabase();
  const hash = await bcrypt.hash(PASSWORD, 10);
  for (const [email, isActive] of [
    ['active@test.local', true],
    ['deactivated@test.local', false],
  ] as const) {
    await ownerDb.user.create({
      data: { email, passwordHash: hash, role: 'TENANT', firstName: 'Test', lastName: 'User', isActive },
    });
  }
  // approved, and already signed up
  await ownerDb.emailWhitelist.create({ data: { email: 'active@test.local', role: 'TENANT' } });
  const admin = await ownerDb.user.create({
    data: { email: 'admin@test.local', passwordHash: hash, role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
  });
  adminToken = tokenFor(admin);
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await ownerDb.$disconnect();
});

describe('POST /api/auth/login', () => {
  it('logs in an active user with the right password', async () => {
    const res = await login('active@test.local', PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('gives the same answer for a wrong password and for an email with no account', async () => {
    const wrongPassword = await login('active@test.local', 'Wrong-Guess-1!');
    const noAccount = await login('nobody@test.local', 'Wrong-Guess-1!');
    expect([wrongPassword.status, noAccount.status]).toEqual([401, 401]);
    expect(wrongPassword.body).toEqual(loginFailed);
    expect(noAccount.body).toEqual(loginFailed);
  });

  it('does not reveal a deactivated account to someone guessing a wrong password', async () => {
    const res = await login('deactivated@test.local', 'Wrong-Guess-1!');
    expect(res.status).toBe(401);
    expect(res.body).toEqual(loginFailed);
  });

  it('refuses a deactivated account with the same answer even when the password is right', async () => {
    // A different answer here would confirm "this password is correct" to someone
    // trying leaked passwords, and people reuse passwords on other sites.
    const res = await login('deactivated@test.local', PASSWORD);
    expect(res.status).toBe(401);
    expect(res.body).toEqual(loginFailed);
  });

  it('checks a password even when the email has no account, so the response time gives nothing away', async () => {
    // bcrypt is slow on purpose (tens of milliseconds). Skipping it for unknown emails
    // made those answers faster, so a stopwatch alone could tell which emails exist.
    const compare = jest.spyOn(passwordHash, 'comparePassword');
    await login('nobody-at-all@test.local', 'Wrong-Guess-1!');
    expect(compare).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/auth/signup', () => {
  it('creates an account for an invited email that has no account yet', async () => {
    const invite = await request(app)
      .post('/api/auth/invites')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ email: 'approved-new@test.local', role: 'TENANT' });
    const res = await signup('approved-new@test.local', invite.body.data.inviteCode);
    expect(res.status).toBe(201);
  });

  it('refuses an email that is not approved, without saying why', async () => {
    const res = await signup('stranger@test.local');
    expect(res.status).toBe(403);
    expect(res.body).toEqual(signupRefused);
  });

  it('refuses an email that already has an account with exactly the same answer', async () => {
    const res = await signup('active@test.local');
    expect(res.status).toBe(403);
    expect(res.body).toEqual(signupRefused);
  });
});
