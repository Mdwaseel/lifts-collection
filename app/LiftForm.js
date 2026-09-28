'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SECTIONS, FIELDS, STICKY_FIELDS, cleanEntry, priceTotals, inr } from '@/lib/fields';
import { formatDate } from '@/lib/csv';

const STICKY_KEY = 'lift-collector:you';
const blank = () => Object.fromEntries(FIELDS.map((f) => [f.key, f.type === 'lines' ? [] : '']));
const pickSticky = (values) => Object.fromEntries(STICKY_FIELDS.map((f) => [f.key, values[f.key]]));

// Stored entry -> form input values (inputs work with strings).
function toFormValues(data) {
  const v = blank();
  for (const f of FIELDS) {
    const x = data[f.key];
    if (x === undefined || x === null) continue;
    v[f.key] = f.type === 'lines' ? x.map((l) => ({ item: l.item, amount: String(l.amount) })) : String(x);
  }
  return v;
}

export default function LiftForm() {
  const [values, setValues] = useState(blank);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // { type: 'ok' | 'err', text }
  const [saving, setSaving] = useState(false);
  const [keepValues, setKeepValues] = useState(false);
  const [editing, setEditing] = useState(null); // { id, rev, model_name, submitted_by }
  const [entries, setEntries] = useState(null);
  const [listError, setListError] = useState('');
  const honeypot = useRef(null);
  const topRef = useRef(null);

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/entries', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const rows = await res.json();
      setEntries(rows);
      setListError('');
      return rows;
    } catch {
      setListError('Could not load the list. Check your connection and refresh.');
      return null;
    }
  }, []);

  // Remember the person's name/contact between entries and visits.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STICKY_KEY) || '{}');
      setValues((v) => ({ ...v, ...saved }));
    } catch {}
    loadEntries();
  }, [loadEntries]);

  function update(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function startEdit(entry) {
    setEditing({ id: entry.id, rev: entry.version, model_name: entry.data.model_name, submitted_by: entry.data.submitted_by });
    setValues((v) => ({ ...toFormValues(entry.data), ...pickSticky(v) }));
    setErrors({});
    setStatus(null);
    scrollTop();
  }

  function stopEdit() {
    setEditing(null);
    setValues((v) => ({ ...blank(), ...pickSticky(v) }));
    setErrors({});
    setStatus(null);
  }

  async function submit(e) {
    e.preventDefault();
    const { errors: found } = cleanEntry(values);
    if (Object.keys(found).length) {
      setErrors(found);
      setStatus({ type: 'err', text: 'Please fix the highlighted fields.' });
      document.getElementById(`f-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const payload = { ...values, website: honeypot.current?.value };
      const res = editing
        ? await fetch(`/api/entries/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, rev: editing.rev }),
          })
        : await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(body.errors || {});
        setStatus({ type: 'err', text: body.error || 'Could not save. Please try again.', conflict: res.status === 409 });
        scrollTop();
        return;
      }

      const sticky = pickSticky(values);
      try { localStorage.setItem(STICKY_KEY, JSON.stringify(sticky)); } catch {}

      if (editing) {
        setStatus({ type: 'ok', text: `Updated "${values.model_name}" (entry #${editing.id}).` });
        setEditing(null);
        setValues({ ...blank(), ...sticky });
      } else {
        setStatus({ type: 'ok', text: `Saved "${values.model_name}" (entry #${body.id}). Add the next lift below.` });
        if (!keepValues) setValues({ ...blank(), ...sticky });
      }
      setErrors({});
      scrollTop();
      loadEntries();
    } catch {
      setStatus({ type: 'err', text: 'No connection. Check your internet and try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function reloadConflicted() {
    const rows = await loadEntries();
    const fresh = rows?.find((r) => r.id === editing?.id);
    if (fresh) startEdit(fresh);
    else stopEdit();
  }

  const totals = useMemo(() => priceTotals(cleanEntry(values).data), [values]);

  return (
    <>
      <form onSubmit={submit} noValidate>
        <div ref={topRef} aria-live="polite">
          {editing && (
            <div className="notice edit">
              <span>
                Editing entry <b>#{editing.id}</b>, {editing.model_name}
                {editing.submitted_by && <>, added by {editing.submitted_by}</>}
              </span>
              <button type="button" className="btn secondary small" onClick={stopEdit}>Cancel editing</button>
            </div>
          )}
          {status && (
            <div className={`notice ${status.type}`}>
              <span>{status.text}</span>
              {status.conflict && <button type="button" className="btn secondary small" onClick={reloadConflicted}>Reload this lift</button>}
            </div>
          )}
        </div>

        {SECTIONS.map((section) => (
          <fieldset key={section.title} className="card">
            <legend>{section.title}</legend>
            {section.title === 'Your details' && editing && (
              <p className="hint" style={{ marginTop: 0 }}>This is you, the person making the edit. The original submitter stays on the entry.</p>
            )}
            <div className="grid">
              {section.fields.map((f) => (
                <Field key={f.key} field={f} value={values[f.key]} error={errors[f.key]} onChange={update} />
              ))}
            </div>
            {section.title === 'Prices' && (
              <div className="totals" aria-live="polite">
                <span>Subtotal <b>{inr(totals.subtotal)}</b></span>
                <span>GST <b>{inr(totals.gst)}</b></span>
                <span className="grand">Total <b>{inr(totals.total)}</b></span>
              </div>
            )}
          </fieldset>
        ))}

        <input ref={honeypot} className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

        <div className="actions">
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Save lift'}
          </button>
          {editing ? (
            <button type="button" className="btn secondary" onClick={stopEdit}>Cancel</button>
          ) : (
            <label className="check">
              <input type="checkbox" checked={keepValues} onChange={(e) => setKeepValues(e.target.checked)} />
              Keep these values for the next entry
            </label>
          )}
        </div>
      </form>

      <EntriesList entries={entries} error={listError} editingId={editing?.id} onEdit={startEdit} />
    </>
  );
}

function EntriesList({ entries, error, editingId, onEdit }) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!entries || !q) return entries;
    return entries.filter((e) =>
      [e.id, e.data.model_name, e.data.lift_type, e.data.version, e.data.submitted_by]
        .some((x) => String(x ?? '').toLowerCase().includes(q)));
  }, [entries, query]);

  return (
    <section className="list" aria-labelledby="all-lifts">
      <div className="list-head">
        <h2 id="all-lifts">All lifts{entries ? ` (${entries.length})` : ''}</h2>
        {entries?.length > 0 && (
          <input type="search" placeholder="Search model, type, name…" aria-label="Search lifts"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
      </div>

      {error && <div className="notice err">{error}</div>}
      {!entries && !error && <p className="hint">Loading…</p>}
      {entries?.length === 0 && <div className="card empty">No lifts yet. The first one you save will appear here.</div>}
      {shown?.length === 0 && entries.length > 0 && <p className="hint">No lifts match "{query}".</p>}

      {shown?.length > 0 && (
        <ul className="entries">
          {shown.map((e) => (
            <li key={e.id} className={e.id === editingId ? 'current' : undefined}>
              <div className="entry-main">
                <b>{e.data.model_name}</b>
                <span className="muted">
                  #{e.id} · {e.data.lift_type}{e.data.version ? ` · ${e.data.version}` : ''}
                </span>
                <span className="muted small">
                  Added by {e.data.submitted_by}
                  {e.updated_by && <> · edited by {e.updated_by}, {formatDate(e.updated_at)}</>}
                </span>
              </div>
              <span className="entry-total">{inr(priceTotals(e.data).total)}</span>
              <button type="button" className="btn secondary small" onClick={() => onEdit(e)}
                disabled={e.id === editingId}>
                {e.id === editingId ? 'Editing' : 'Edit'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Field({ field: f, value, error, onChange }) {
  const id = `f-${f.key}`;
  const describedBy = [f.hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  const common = {
    id,
    name: f.key,
    value,
    onChange: (e) => onChange(f.key, e.target.value),
    'aria-required': f.required || undefined,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
  };

  let control;
  if (f.type === 'lines') {
    control = <LinesField id={id} rows={value} onChange={(rows) => onChange(f.key, rows)} max={f.maxRows} invalid={Boolean(error)} />;
  } else if (f.type === 'select') {
    control = (
      <select {...common}>
        <option value="">Choose…</option>
        {f.options.map((o) => <option key={o}>{o}</option>)}
      </select>
    );
  } else if (f.type === 'textarea') {
    control = <textarea {...common} maxLength={f.max} />;
  } else if (f.type === 'number') {
    control = (
      <div className="with-unit">
        <input {...common} type="number" inputMode="decimal" min="0" max={f.maxValue} step={f.step || '1'} />
        {f.unit && <span className="unit">{f.unit}</span>}
      </div>
    );
  } else {
    control = <input {...common} type="text" maxLength={f.max ?? 200} />;
  }

  const wide = f.type === 'textarea' || f.type === 'lines';
  return (
    <div className={wide ? 'full' : undefined}>
      {f.type === 'lines' ? (
        <div className="label" id={`${id}-label`}>{f.label}</div>
      ) : (
        <label htmlFor={id}>
          {f.label}
          {f.required && <span className="req" aria-hidden="true">*</span>}
        </label>
      )}
      {control}
      {f.hint && <div id={`${id}-hint`} className="hint">{f.hint}</div>}
      {error && <div id={`${id}-err`} className="field-error">{error}</div>}
    </div>
  );
}

function LinesField({ id, rows, onChange, max, invalid }) {
  const set = (i, key, val) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: val } : r)));
  const add = () => {
    onChange([...rows, { item: '', amount: '' }]);
    // Focus the new row's name once it renders.
    setTimeout(() => document.getElementById(`${id}-item-${rows.length}`)?.focus());
  };

  return (
    <div className="lines" role="group" aria-labelledby={`${id}-label`}>
      {rows.map((r, i) => (
        <div className="line" key={i}>
          <input id={`${id}-item-${i}`} type="text" placeholder="Item, e.g. Glass panel, ARD, Transport" maxLength={100}
            aria-label={`Price ${i + 1} name`} aria-invalid={invalid && !r.item ? 'true' : undefined}
            value={r.item} onChange={(e) => set(i, 'item', e.target.value)} />
          <div className="with-unit">
            <input type="number" inputMode="decimal" min="0" placeholder="Amount" aria-label={`Price ${i + 1} amount`}
              aria-invalid={invalid && r.amount === '' ? 'true' : undefined}
              value={r.amount} onChange={(e) => set(i, 'amount', e.target.value)} />
            <span className="unit">₹</span>
          </div>
          <button type="button" className="btn danger" aria-label={`Remove price ${i + 1}`}
            onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      {rows.length < max && (
        <button type="button" id={id} className="btn secondary small" onClick={add}>+ Add price</button>
      )}
    </div>
  );
}
