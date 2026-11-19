import crypto from 'node:crypto';

const DEFAULT_FALLBACK_SECRET = 'rescue-paws-jammu-session-secret-v1';

function getSigningSecret(): string {
  return process.env.ADMIN_TOKEN_SECRET || process.env.SQL_PASSWORD || DEFAULT_FALLBACK_SECRET;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export interface AdminTokenPayload {
  uid: string;
  email: string;
  role: 'admin';
  exp: number;
}

export function signAdminToken(payload: Omit<AdminTokenPayload, 'exp'>): string {
  const fullPayload: AdminTokenPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(body)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AdminTokenPayload;
    if (!parsed || parsed.role !== 'admin' || typeof parsed.exp !== 'number') {
      return null;
    }
    if (Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
