import { Request } from 'express';
import rateLimit from 'express-rate-limit';

// Stricter limits for POST /api/auth/login (October 2026).
//
// The general API limit (100 requests per 15 minutes per IP, in app.ts) would let an
// attacker try 100 passwords per window. Login gets two extra limits. Both count only
// FAILED attempts (any response with status 400 or higher), so real users who type their
// password correctly never use them up.

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const tooManyAttempts = {
  success: false,
  message: 'Too many failed login attempts. Please try again in 15 minutes.',
};

// "Alice@Test.local" and "alice@test.local" are the same account
const normalizedEmail = (req: Request) => String(req.body?.email ?? '').trim().toLowerCase();

const shared = {
  windowMs: FIFTEEN_MINUTES,
  skipSuccessfulRequests: true,
  // Send the standard RateLimit headers, plus Retry-After when someone is blocked
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  message: tooManyAttempts,
};

/**
 * The lock on one door: 5 failed logins for ONE account from ONE IP address.
 * The IP is part of the key, so an attacker somewhere else cannot lock the real
 * user out of their own account just by typing wrong passwords for them.
 */
export const loginAccountLimiter = rateLimit({
  ...shared,
  limit: 5,
  keyGenerator: (req) => `${req.ip}|${normalizedEmail(req)}`,
});

/**
 * The gate of the whole building: 20 failed logins from ONE IP address, across all
 * accounts. This stops "password spraying": one common password (like Summer2026!)
 * tried on many accounts, a few times each, to stay under the per-account limit.
 * It is looser than 5 because many tenants may share one IP (the building's Wi-Fi).
 */
export const loginIpLimiter = rateLimit({
  ...shared,
  limit: 20,
});
