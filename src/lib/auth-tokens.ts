import crypto from 'node:crypto';

export interface AdminSessionPayload {
  uid: string;
  email: string;
  role: string;
  exp: number;
}

function getSigningSecret(): string {
  if (process.env.ADMIN_TOKEN_SECRET) {
    return process.env.ADMIN_TOKEN_SECRET;
  }
  const seed = process.env.SQL_PASSWORD || process.env.GEMINI_API_KEY || 'rescue-paws-jammu-dev-secret';
  return crypto.createHash('sha256').update(`${seed}:rescue-paws-jammu-token-v1`).digest('hex');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function signAdminToken(payload: Omit<AdminSessionPayload, 'exp'>, ttlMs = 1000 * 60 * 60 * 24 * 7): string {
  const fullPayload: AdminSessionPayload = {
    ...payload,
    exp: Date.now() + ttlMs,
  };
  const body = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSigningSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyAdminToken(token: string): AdminSessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', getSigningSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AdminSessionPayload;
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    if (!parsed.uid || !parsed.email || parsed.role !== 'admin') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
