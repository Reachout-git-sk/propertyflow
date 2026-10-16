// JWT settings, checked once when the app starts (October 2026).
//
// The JWT secret is the key that signs login tokens. Anyone who knows it can make their own
// token saying "I am an ADMIN". So the app refuses to start unless the secret is real:
// set, long enough to be unguessable, and not one of the example values from the docs.

// Example values that appear in this repository's docs and docker-compose.yml.
// They are public, so they are as good as no secret at all.
const PUBLIC_PLACEHOLDERS = [
  'your-super-secret-jwt-key-change-this',
  'your-super-secret-jwt-key-change-this-in-production',
  'CHANGE-THIS-TO-RANDOM-SECRET-KEY',
  'abc123xyz789-REPLACE-THIS-WITH-RANDOM-STRING',
];

const MIN_SECRET_LENGTH = 32;

// How long a login token stays valid. A JWT cannot be cancelled once issued, so a stolen
// token works until it expires. 1 hour keeps that window small; when it runs out, the
// frontend sends the user back to the login page.
const DEFAULT_EXPIRES_IN = '1h';

const HOW_TO_GENERATE =
  'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"';

export function loadJwtConfig(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.JWT_SECRET;

  if (!secret) {
    throw new Error(`JWT_SECRET is not set. ${HOW_TO_GENERATE}`);
  }
  if (PUBLIC_PLACEHOLDERS.includes(secret)) {
    throw new Error(`JWT_SECRET is still a public placeholder value. ${HOW_TO_GENERATE}`);
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters. ${HOW_TO_GENERATE}`);
  }

  // jsonwebtoken reads a bare number string as MILLISECONDS ("3600" = 3.6 seconds),
  // so insist on a unit: s, m, h or d (for example 15m, 1h, 8h).
  const expiresIn = env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN;
  if (!/^\d+[smhd]$/.test(expiresIn)) {
    throw new Error(`JWT_EXPIRES_IN must be a number with a unit (s, m, h or d), like 1h. Got "${expiresIn}".`);
  }

  return { secret, expiresIn };
}

export const jwtConfig = loadJwtConfig();
