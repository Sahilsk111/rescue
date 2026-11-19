import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifyAdminToken } from '../lib/auth-token.ts';
import { getOrCreateFirebaseUser } from '../db/repository.ts';

export interface AuthenticatedAdmin {
  uid: string;
  email: string;
  role: 'admin';
  authMethod: 'password' | 'firebase';
}

export interface AuthRequest extends Request {
  adminUser?: AuthenticatedAdmin;
}

export async function resolveAdminFromHeader(
  authHeader: string | undefined
): Promise<AuthenticatedAdmin | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  // 1. Check backend-signed email/password admin session token
  const localPayload = verifyAdminToken(token);
  if (localPayload) {
    return {
      uid: localPayload.uid,
      email: localPayload.email,
      role: 'admin',
      authMethod: 'password',
    };
  }

  // 2. Fallback to Firebase Auth ID token verification
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email) return null;
    const dbUser = await getOrCreateFirebaseUser(decoded.uid, decoded.email);
    if (dbUser.role !== 'admin') return null;
    return {
      uid: dbUser.uid,
      email: dbUser.email,
      role: 'admin',
      authMethod: 'firebase',
    };
  } catch {
    return null;
  }
}

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin = await resolveAdminFromHeader(req.headers.authorization);
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized: Admin sign-in required.' });
    }
    req.adminUser = admin;
    return next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid credentials.' });
  }
};
