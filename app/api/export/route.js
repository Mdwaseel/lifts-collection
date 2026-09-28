import { NextResponse } from 'next/server';
import { listEntries } from '@/lib/db';
import { isAuthed } from '@/lib/auth';
import { toCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!(await isAuthed())) return NextResponse.redirect(new URL('/dashboard', request.url));

  const rows = (await listEntries()).reverse();
  const date = new Date().toISOString().slice(0, 10);

  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="lift-specifications-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
