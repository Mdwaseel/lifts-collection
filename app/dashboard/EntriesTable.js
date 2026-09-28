'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FIELDS, fieldHeading, formatValue, priceTotals, inr } from '@/lib/fields';

const COLUMNS = ['submitted_by', 'lift_type', 'model_name', 'drive_type', 'capacity_persons', 'capacity_kg', 'stops'];
const byKey = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

function show(field, value) {
  return formatValue(field, value) || '—';
}

export default function EntriesTable({ entries }) {
  const router = useRouter();
  const [open, setOpen] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function remove(entry) {
    if (!confirm(`Delete entry #${entry.id} (${entry.data.model_name})? This can't be undone.`)) return;
    setDeleting(entry.id);
    const res = await fetch(`/api/entries/${entry.id}`, { method: 'DELETE' }).catch(() => null);
    setDeleting(null);
    if (res?.ok) router.refresh();
    else alert('Could not delete. Please try again.');
  }

  if (!entries.length) {
    return <div className="table-wrap"><div className="empty">No entries yet. Share the form link to start collecting.</div></div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Submitted</th>
            {COLUMNS.map((k) => <th key={k}>{fieldHeading(byKey[k])}</th>)}
            <th>Total</th>
            <th>Last edited</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <Fragment key={e.id}>
              <tr
                className="row"
                tabIndex={0}
                aria-expanded={open === e.id}
                onClick={() => setOpen(open === e.id ? null : e.id)}
                onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), setOpen(open === e.id ? null : e.id))}
              >
                <td className="num">{e.id}</td>
                <td>{e.created}</td>
                {COLUMNS.map((k) => (
                  <td key={k} className={byKey[k].type === 'number' ? 'num' : undefined}>{show(byKey[k], e.data[k])}</td>
                ))}
                <td className="num">{inr(priceTotals(e.data).total)}</td>
                <td>{e.edited || '—'}</td>
              </tr>
              {open === e.id && (
                <tr className="detail">
                  <td colSpan={COLUMNS.length + 4}>
                    <dl className="detail-grid">
                      {FIELDS.map((f) => (
                        <div key={f.key}>
                          <dt>{fieldHeading(f)}</dt>
                          <dd>{show(f, e.data[f.key])}</dd>
                        </div>
                      ))}
                      <Totals data={e.data} />
                    </dl>
                    <button className="btn danger" disabled={deleting === e.id} onClick={() => remove(e)}>
                      {deleting === e.id ? 'Deleting…' : 'Delete entry'}
                    </button>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Totals({ data }) {
  const { subtotal, gst, total } = priceTotals(data);
  return (
    <div>
      <dt>Subtotal / GST / Total</dt>
      <dd>{inr(subtotal)} / {inr(gst)} / {inr(total)}</dd>
    </div>
  );
}
