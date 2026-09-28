import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'lc_session';

// The session token is derived from the password, so changing
// DASHBOARD_PASSWORD signs everyone out.
export function sessionToken() {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return null;
  return crypto.createHmac('sha256', password).update('lift-collector-dashboard').digest('hex');
}

function sameDigest(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkPassword(input) {
  const password = process.env.DASHBOARD_PASSWORD;
  return Boolean(password) && typeof input === 'string' && sameDigest(input, password);
}

export async function isAuthed() {
  const token = sessionToken();
  const value = (await cookies()).get(COOKIE)?.value;
  return Boolean(token && value) && sameDigest(value, token);
}
