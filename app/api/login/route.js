import { NextResponse } from 'next/server';
import { COOKIE, checkPassword, sessionToken } from '@/lib/auth';

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));

  if (!checkPassword(password)) {
    // Slow down password guessing.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
