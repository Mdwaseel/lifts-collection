import { isAuthed } from '@/lib/auth';
import { listEntries } from '@/lib/db';
import { formatDate } from '@/lib/csv';
import LoginForm from './LoginForm';
import EntriesTable from './EntriesTable';
import LogoutButton from './LogoutButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard · Lift Specifications', robots: { index: false } };

export default async function Dashboard() {
  if (!(await isAuthed())) return <LoginForm />;

  const rows = await listEntries();
  const entries = rows.map((r) => ({
    id: r.id,
    created: formatDate(r.created_at),
    edited: r.updated_at ? `${formatDate(r.updated_at)} by ${r.updated_by}` : '',
    data: r.data,
  }));
  const people = new Set(rows.map((r) => r.data.submitted_by?.toLowerCase())).size;

  return (
    <main className="page wide">
      <div className="toolbar">
        <div>
          <h1>Lift specifications</h1>
          <p className="lead" style={{ margin: 0 }}>Every entry from the form. Click a row to see all its details.</p>
        </div>
        <div className="actions">
          <a className="btn" href="/api/export" download>Download CSV</a>
          <LogoutButton />
        </div>
      </div>

      <div className="stats">
        <div className="stat"><b>{rows.length}</b><span>entries</span></div>
        <div className="stat"><b>{people}</b><span>people submitting</span></div>
        <div className="stat"><b style={{ fontSize: '1rem' }}>{entries[0]?.created ?? '—'}</b><span>latest entry</span></div>
      </div>

      <EntriesTable entries={entries} />
    </main>
  );
}
