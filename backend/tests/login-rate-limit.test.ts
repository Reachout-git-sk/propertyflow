import bcrypt from 'bcrypt';
import request from 'supertest';
import type { Express } from 'express';
import { ownerDb, resetDatabase } from './helpers';

// Login is where attackers guess passwords. The general API limit (100 requests per
// 15 minutes) would allow 100 guesses per window, so login gets its own, much stricter
// limits that count only FAILED attempts.

let app: Express;
let db: { $disconnect(): Promise<void> };
const PASSWORD = 'Correct-Horse-9!';

// Each test pretends to come from its own IP address, like separate visitors arriving
// through a load balancer, so the tests do not use up each other's attempts.
let ipCounter = 0;
const newIp = () => `203.0.113.${++ipCounter}`;

const login = (ip: string, email: string, password: string) =>
  request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send({ email, password });

beforeAll(async () => {
  // Load the app the way it runs behind one load balancer (see TRUST_PROXY in .env.example)
  process.env.TRUST_PROXY = '1';
  jest.isolateModules(() => {
    app = require('../src/app').default;
    db = require('../src/config/database').default;
  });
  delete process.env.TRUST_PROXY;

  await resetDatabase();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const name of ['alice', 'bob']) {
    await ownerDb.user.create({
      data: { email: `${name}@test.local`, passwordHash, role: 'TENANT', firstName: name, lastName: 'Test' },
    });
  }
});

afterAll(async () => {
  await db.$disconnect();
  await ownerDb.$disconnect();
});

it('blocks an account after 5 wrong passwords, even if the 6th try is right', async () => {
  const ip = newIp();
  for (let i = 0; i < 5; i++) {
    expect((await login(ip, 'alice@test.local', 'wrong-guess')).status).toBe(401);
  }
  const blocked = await login(ip, 'alice@test.local', PASSWORD);
  expect(blocked.status).toBe(429);
  expect(blocked.body).toEqual({
    success: false,
    message: 'Too many failed login attempts. Please try again in 15 minutes.',
  });
});

it('tells the client how long to wait (Retry-After header)', async () => {
  const ip = newIp();
  for (let i = 0; i < 5; i++) await login(ip, 'alice@test.local', 'wrong-guess');
  const blocked = await login(ip, 'alice@test.local', 'wrong-guess');
  expect(blocked.status).toBe(429);
  expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
});

it("does not lock Bob out because of failures on Alice's account", async () => {
  const ip = newIp(); // same building Wi-Fi, same IP
  for (let i = 0; i < 6; i++) await login(ip, 'alice@test.local', 'wrong-guess');
  expect((await login(ip, 'bob@test.local', PASSWORD)).status).toBe(200);
});

it('treats Alice@Test.local and alice@test.local as the same account', async () => {
  const ip = newIp();
  for (let i = 0; i < 5; i++) await login(ip, i % 2 ? 'ALICE@test.local' : 'alice@test.local', 'wrong');
  expect((await login(ip, 'Alice@Test.Local', 'wrong')).status).toBe(429);
});

it('does not count successful logins', async () => {
  const ip = newIp();
  for (let i = 0; i < 8; i++) {
    expect((await login(ip, 'bob@test.local', PASSWORD)).status).toBe(200);
  }
});

it('blocks password spraying: 20 failures across many accounts from one IP', async () => {
  // A "spray" tries one common password on many accounts, staying under the per-account limit
  const ip = newIp();
  for (let i = 0; i < 20; i++) {
    expect((await login(ip, `user${i}@test.local`, 'Summer2026!')).status).toBe(401);
  }
  expect((await login(ip, 'someone-else@test.local', 'Summer2026!')).status).toBe(429);
});

it('cannot be dodged with a fake X-Forwarded-For header when no proxy is configured', async () => {
  // Default setup (TRUST_PROXY unset): the header is ignored, so making up a new
  // "IP address" for every guess does not reset the counter.
  const directApp: Express = require('../src/app').default;
  // express-rate-limit also prints a warning about this header; capture it instead of printing
  const warning = jest.spyOn(console, 'error').mockImplementation(() => {});
  const tries = [];
  for (let i = 0; i < 6; i++) {
    tries.push(
      (
        await request(directApp)
          .post('/api/auth/login')
          .set('X-Forwarded-For', `198.51.100.${i}`)
          .send({ email: 'alice@test.local', password: 'wrong-guess' })
      ).status
    );
  }
  expect(tries).toEqual([401, 401, 401, 401, 401, 429]);
  expect(String(warning.mock.calls[0]?.[0])).toContain('ERR_ERL_UNEXPECTED_X_FORWARDED_FOR');
  warning.mockRestore();
  await require('../src/config/database').default.$disconnect();
});

it('keeps visitors from different IPs separate', async () => {
  const attacker = newIp();
  for (let i = 0; i < 6; i++) await login(attacker, 'alice@test.local', 'wrong-guess');
  // Alice herself, from her own connection, can still log in
  expect((await login(newIp(), 'alice@test.local', PASSWORD)).status).toBe(200);
});
