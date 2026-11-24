import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

const EPHEMERAL_SIGNING_SECRET = crypto.randomBytes(32).toString('hex');

function getSigningSecret(): string {
  return process.env.SESSION_SECRET?.trim() || EPHEMERAL_SIGNING_SECRET;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export interface SessionPayload {
  sub: string;
  email: string;
  role: 'customer' | 'admin';
  exp: number;
}

export function signToken(payload: Omit<SessionPayload, 'exp'>, ttlSeconds = 60 * 60 * 24 * 7): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyToken(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;
  try {
    const expectedSig = crypto
      .createHmac('sha256', getSigningSecret())
      .update(encoded)
      .digest('base64url');
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function signOrderReceiptToken(orderCode: string): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const data = Buffer.from(JSON.stringify({ orderCode, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', getSigningSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyOrderReceiptToken(token: string | undefined, orderCode: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [data, sig] = parts;
  try {
    const expected = crypto.createHmac('sha256', getSigningSecret()).update(data).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return false;
    }
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as {
      orderCode: string;
      exp: number;
    };
    return parsed.orderCode === orderCode && parsed.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_NAME = 'tay_session';

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) {
      try {
        cookies[k] = decodeURIComponent(v);
      } catch {
        cookies[k] = v;
      }
    }
  }
  return cookies;
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production';

  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${60 * 60 * 24 * 7}`,
  ];
  if (isHttps) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(req: Request, res: Response): void {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production';

  const parts = [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'Max-Age=0'];
  if (isHttps) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export interface AuthedRequest extends Request {
  authUser?: SessionPayload;
}

function extractToken(req: Request): { token: string | null; viaCookie: boolean } {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { token: authHeader.slice(7).trim(), viaCookie: false };
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE_NAME]) {
    return { token: cookies[SESSION_COOKIE_NAME], viaCookie: true };
  }
  return { token: null, viaCookie: false };
}

function verifyMutationCsrf(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return true;
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] || req.headers.host) as string | undefined;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }
  return false;
}

export function attachOptionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const { token } = extractToken(req);
  const payload = verifyToken(token);
  if (payload) {
    req.authUser = payload;
  }
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const { token, viaCookie } = extractToken(req);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  if (viaCookie && !verifyMutationCsrf(req)) {
    res.status(403).json({ error: 'CSRF check failed.' });
    return;
  }
  req.authUser = payload;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const { token, viaCookie } = extractToken(req);
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  if (viaCookie && !verifyMutationCsrf(req)) {
    res.status(403).json({ error: 'CSRF check failed.' });
    return;
  }
  req.authUser = payload;
  next();
}

export function isAdminConfigured(): { configured: boolean; viaEnv: boolean; adminEmail: string | null } {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass && envPass.length > 0) {
    return { configured: true, viaEnv: true, adminEmail: 'totealleyy1@gmail.com' };
  }
  const row = db.prepare('SELECT email FROM admin_credentials LIMIT 1').get() as
    | { email: string }
    | undefined;
  if (row) {
    return { configured: true, viaEnv: false, adminEmail: row.email };
  }
  return { configured: false, viaEnv: false, adminEmail: null };
}

export function verifyAdminPasscode(password: string, email?: string): { ok: boolean; email: string } {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass && envPass.length > 0) {
    const a = Buffer.from(password);
    const b = Buffer.from(envPass);
    const match = a.length === b.length && crypto.timingSafeEqual(a, b);
    return { ok: match, email: email?.trim() || 'totealleyy1@gmail.com' };
  }
  const row = db.prepare('SELECT email, password_hash FROM admin_credentials LIMIT 1').get() as
    | { email: string; password_hash: string }
    | undefined;
  if (!row) {
    return { ok: false, email: '' };
  }
  if (email && email.trim().toLowerCase() !== row.email.toLowerCase()) {
    return { ok: false, email: '' };
  }
  return { ok: verifyPassword(password, row.password_hash), email: row.email };
}
