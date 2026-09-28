import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { isAuthed } from '@/lib/auth';
import { cleanEntry } from '@/lib/fields';

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Public: anyone with the form link can edit a lift. "Your details" in the
// request is the person editing; the original submitter is kept on the entry.
export async function PUT(request, { params }) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || body.website) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { data, errors } = cleanEntry(body);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: 'Please fix the highlighted fields', errors }, { status: 400 });
  }
  // "rev" is the edit counter the client loaded (not the lift's "version" field).
  const version = Number(body.rev);
  if (!Number.isInteger(version)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const editedBy = data.submitted_by;
  delete data.submitted_by;
  delete data.contact;

  try {
    const sql = await getSql();
    const [row] = await sql`
      UPDATE lift_entries
         SET data = ${JSON.stringify(data)}::jsonb
                    || jsonb_strip_nulls(jsonb_build_object('submitted_by', data->'submitted_by', 'contact', data->'contact')),
             version = version + 1,
             updated_at = now(),
             updated_by = ${editedBy}
       WHERE id = ${id} AND version = ${version}
       RETURNING id, version`;
    if (row) return NextResponse.json(row);

    const [exists] = await sql`SELECT 1 FROM lift_entries WHERE id = ${id}`;
    return exists
      ? NextResponse.json({ error: 'Someone else changed this lift while you were editing. Reload it to see their changes, then edit again.' }, { status: 409 })
      : NextResponse.json({ error: 'This lift was deleted.' }, { status: 404 });
  } catch (err) {
    console.error('Updating entry failed:', err);
    return NextResponse.json({ error: 'Could not save right now. Please try again.' }, { status: 500 });
  }
}

// Dashboard only.
export async function DELETE(_request, { params }) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  try {
    const sql = await getSql();
    await sql`DELETE FROM lift_entries WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Deleting entry failed:', err);
    return NextResponse.json({ error: 'Could not delete right now. Please try again.' }, { status: 500 });
  }
}
