import jwt from 'jsonwebtoken';
import request from 'supertest';
import type { Express } from 'express';
import { loadJwtConfig } from '../src/config/jwt';
import app from '../src/app';
import prisma from '../src/config/database';
import { ownerDb } from './helpers';

// The old code used this string whenever JWT_SECRET was missing. It is in the public
// GitHub repo (and docker-compose.yml set exactly this value), so anyone could sign
// their own tokens with it, including tokens that say role: ADMIN.
const PUBLIC_PLACEHOLDER = 'your-super-secret-jwt-key-change-this';
const GOOD_SECRET = 'k3J9v2Qx7Lm4Tz8Wp1Rb6Ny5Hd0Gc3Fs-long-random-secret';

afterAll(async () => {
  await prisma.$disconnect();
  await ownerDb.$disconnect();
});

// Loads a fresh copy of the whole app with JWT_SECRET set the way docker-compose.yml
// used to set it, then tries an ADMIN token the attacker signed with that public string.
// Returns 'refused to start' or the HTTP status the attacker got.
// (Before this fix the attacker got 200 and the admin dashboard.)
async function tryForgedAdminTokenWithPublicSecret(): Promise<'refused to start' | number> {
  const savedSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = PUBLIC_PLACEHOLDER;
  let freshApp: Express | undefined;
  let freshDb: { $disconnect(): Promise<void> } | undefined;
  try {
    jest.isolateModules(() => {
      freshApp = require('../src/app').default;
      freshDb = require('../src/config/database').default;
    });
  } catch {
    return 'refused to start';
  } finally {
    process.env.JWT_SECRET = savedSecret;
  }

  const forged = jwt.sign({ id: 'attacker', email: 'attacker@evil.test', role: 'ADMIN' }, PUBLIC_PLACEHOLDER);
  const res = await request(freshApp!).get('/api/analytics/dashboard').set('Authorization', `Bearer ${forged}`);
  await freshDb?.$disconnect();
  return res.status;
}

describe('starting the app', () => {
  it('refuses to start with the public placeholder secret, so nobody can forge an admin token', async () => {
    expect(await tryForgedAdminTokenWithPublicSecret()).toBe('refused to start');
  });
});

describe('loadJwtConfig', () => {
  it('rejects a missing secret', () => {
    expect(() => loadJwtConfig({})).toThrow(/JWT_SECRET is not set/);
  });

  it('rejects the placeholder values from the docs and docker-compose', () => {
    for (const placeholder of [PUBLIC_PLACEHOLDER, 'CHANGE-THIS-TO-RANDOM-SECRET-KEY']) {
      expect(() => loadJwtConfig({ JWT_SECRET: placeholder })).toThrow(/placeholder/);
    }
  });

  it('rejects a short secret that could be guessed', () => {
    expect(() => loadJwtConfig({ JWT_SECRET: 'abc123' })).toThrow(/at least 32 characters/);
  });

  it('uses a 1 hour token lifetime by default', () => {
    expect(loadJwtConfig({ JWT_SECRET: GOOD_SECRET }).expiresIn).toBe('1h');
  });

  it('rejects a lifetime without a unit ("3600" would silently mean 3.6 seconds)', () => {
    expect(() => loadJwtConfig({ JWT_SECRET: GOOD_SECRET, JWT_EXPIRES_IN: '3600' })).toThrow(/unit/);
  });

  it('accepts a lifetime like 15m or 8h', () => {
    expect(loadJwtConfig({ JWT_SECRET: GOOD_SECRET, JWT_EXPIRES_IN: '15m' }).expiresIn).toBe('15m');
    expect(loadJwtConfig({ JWT_SECRET: GOOD_SECRET, JWT_EXPIRES_IN: '8h' }).expiresIn).toBe('8h');
  });
});

describe('checking tokens on requests', () => {
  const payload = { id: 'someone', email: 'someone@test.local', role: 'ADMIN' };
  const get = (token: string) =>
    request(app).get('/api/analytics/dashboard').set('Authorization', `Bearer ${token}`);

  it('rejects a token signed with the old public placeholder', async () => {
    expect((await get(jwt.sign(payload, PUBLIC_PLACEHOLDER))).status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '-10s' });
    expect((await get(expired)).status).toBe(401);
  });

  it('rejects an unsigned token (alg "none")', async () => {
    const unsigned = jwt.sign(payload, '', { algorithm: 'none' });
    expect((await get(unsigned)).status).toBe(401);
  });
});
