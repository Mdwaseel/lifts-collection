import { NextResponse } from 'next/server';
import { getSql, listEntries } from '@/lib/db';
import { cleanEntry } from '@/lib/fields';

export const dynamic = 'force-dynamic';

// Public: everyone with the form link sees all lifts.
export async function GET() {
  try {
    const rows = await listEntries();
    return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Listing entries failed:', err);
    return NextResponse.json({ error: 'Could not load the list right now.' }, { status: 500 });
  }
}

// Public: anyone with the form link can add an entry.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: the "website" input is hidden from people, so only bots fill it.
  if (body?.website) return NextResponse.json({ id: 0 });

  const { data, errors } = cleanEntry(body);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: 'Please fix the highlighted fields', errors }, { status: 400 });
  }

  try {
    const sql = await getSql();
    const [row] = await sql`INSERT INTO lift_entries (data) VALUES (${JSON.stringify(data)}::jsonb) RETURNING id`;
    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (err) {
    console.error('Saving entry failed:', err);
    return NextResponse.json({ error: 'Could not save right now. Please try again.' }, { status: 500 });
  }
}
