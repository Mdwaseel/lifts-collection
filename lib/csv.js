import { FIELDS, fieldHeading, formatValue, priceTotals } from './fields';

function cell(value) {
  if (value === undefined || value === null) return '';
  let s = String(value);
  // Stop Excel treating text like "=SUM(...)" as a formula.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function toCsv(rows) {
  const header = [
    'Entry #', 'Submitted (IST)', ...FIELDS.map(fieldHeading),
    'Subtotal (₹)', 'GST amount (₹)', 'Total (₹)', 'Last edited (IST)', 'Last edited by',
  ];
  const lines = rows.map((r) => {
    const t = priceTotals(r.data);
    return [
      r.id, formatDate(r.created_at),
      // Plain numbers stay numeric so Excel can sum them; lists become text.
      ...FIELDS.map((f) => (f.type === 'lines' ? formatValue(f, r.data[f.key]) : r.data[f.key])),
      t.subtotal, t.gst, t.total, formatDate(r.updated_at), r.updated_by,
    ];
  });
  // BOM so Excel opens it as UTF-8 (keeps ₹ and other symbols intact).
  return '﻿' + [header, ...lines].map((line) => line.map(cell).join(',')).join('\r\n');
}
