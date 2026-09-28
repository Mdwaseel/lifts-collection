// Single source of truth for what the form collects. The form, server
// validation, dashboard and CSV export are all generated from this list, so to
// add or change a field, edit it here only. Entries are stored as JSON, so no
// database migration is needed either.

export const SECTIONS = [
  {
    title: 'Your details',
    fields: [
      { key: 'submitted_by', label: 'Your name', type: 'text', required: true, sticky: true },
      { key: 'contact', label: 'Phone or email', type: 'text', sticky: true },
    ],
  },
  {
    title: 'Lift',
    fields: [
      { key: 'lift_type', label: 'Lift type', type: 'text', required: true },
      { key: 'model_name', label: 'Model name', type: 'text', required: true },
      { key: 'version', label: 'Version / variant', type: 'text' },
      { key: 'drive_type', label: 'Drive type', type: 'text' },
      { key: 'machine_room', label: 'Machine room', type: 'text' },
      { key: 'power_supply', label: 'Power supply', type: 'text' },
    ],
  },
  {
    title: 'Capacity & travel',
    fields: [
      { key: 'capacity_persons', label: 'Capacity', type: 'number', unit: 'persons' },
      { key: 'capacity_kg', label: 'Load', type: 'number', unit: 'kg' },
      { key: 'speed', label: 'Speed', type: 'number', unit: 'm/s', step: '0.01' },
      { key: 'stops', label: 'Stops', type: 'number' },
      { key: 'travel_height', label: 'Travel height', type: 'number', unit: 'm', step: '0.1' },
    ],
  },
  {
    title: 'Shaft',
    fields: [
      { key: 'shaft_type', label: 'Shaft type', type: 'text' },
      { key: 'shaft_width', label: 'Shaft width', type: 'number', unit: 'mm' },
      { key: 'shaft_depth', label: 'Shaft depth', type: 'number', unit: 'mm' },
      { key: 'pit_depth', label: 'Pit depth', type: 'number', unit: 'mm' },
      { key: 'overhead', label: 'Overhead', type: 'number', unit: 'mm' },
    ],
  },
  {
    title: 'Car (cabin)',
    fields: [
      { key: 'car_width', label: 'Car width', type: 'number', unit: 'mm' },
      { key: 'car_depth', label: 'Car depth', type: 'number', unit: 'mm' },
      { key: 'car_height', label: 'Car height', type: 'number', unit: 'mm' },
      { key: 'cabin_finish', label: 'Cabin finish', type: 'text' },
    ],
  },
  {
    title: 'Doors',
    fields: [
      { key: 'door_type', label: 'Door type', type: 'text' },
      { key: 'door_width', label: 'Door width', type: 'number', unit: 'mm' },
      { key: 'door_height', label: 'Door height', type: 'number', unit: 'mm' },
      { key: 'door_finish', label: 'Door finish', type: 'text' },
    ],
  },
  {
    title: 'Prices',
    fields: [
      { key: 'base_price', label: 'Base price', type: 'number', unit: '₹', inTotal: true },
      { key: 'shaft_price', label: 'Shaft price', type: 'number', unit: '₹', inTotal: true },
      { key: 'cabin_price', label: 'Cabin price', type: 'number', unit: '₹', inTotal: true },
      { key: 'door_price', label: 'Door price', type: 'number', unit: '₹', inTotal: true },
      { key: 'installation_price', label: 'Installation', type: 'number', unit: '₹', inTotal: true },
      { key: 'price_per_stop', label: 'Price per extra stop', type: 'number', unit: '₹', hint: 'A rate, so it is not added to the total' },
      { key: 'gst_percent', label: 'GST', type: 'number', unit: '%', step: '0.01', maxValue: 100 },
      { key: 'extra_prices', label: 'Other prices', type: 'lines', maxRows: 30 },
    ],
  },
  {
    title: 'Notes',
    fields: [
      { key: 'notes', label: 'Notes', type: 'textarea', max: 2000 },
    ],
  },
];

export const FIELDS = SECTIONS.flatMap((s) => s.fields);
export const STICKY_FIELDS = FIELDS.filter((f) => f.sticky);

export function fieldHeading(f) {
  return f.unit ? `${f.label} (${f.unit})` : f.label;
}

export function inr(n) {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// Subtotal of every ₹ field marked inTotal plus the "Other prices" lines, then GST on top.
export function priceTotals(data) {
  const fixed = FIELDS.filter((f) => f.inTotal).reduce((sum, f) => sum + (data[f.key] || 0), 0);
  const extra = (data.extra_prices || []).reduce((sum, line) => sum + (line.amount || 0), 0);
  const subtotal = fixed + extra;
  const gst = data.gst_percent ? Math.round(subtotal * data.gst_percent) / 100 : 0;
  return { subtotal, gst, total: subtotal + gst };
}

// Human-readable value for the dashboard, entries list and CSV.
export function formatValue(f, value) {
  if (value === undefined || value === null || value === '') return '';
  if (f.type === 'lines') return value.map((line) => `${line.item}: ${inr(line.amount)}`).join('; ');
  if (f.unit === '₹') return inr(value);
  return String(value);
}

function cleanLines(f, rows) {
  if (rows !== undefined && !Array.isArray(rows)) return { error: 'Invalid list' };
  if ((rows || []).length > f.maxRows) return { error: `Up to ${f.maxRows} items` };
  const out = [];
  for (const row of rows || []) {
    const item = String(row?.item ?? '').trim();
    const raw = typeof row?.amount === 'string' ? row.amount.trim() : row?.amount;
    if (!item && (raw === '' || raw == null)) continue; // untouched empty row
    const amount = Number(raw);
    if (!item) return { error: 'Each price needs a name' };
    if (item.length > 100) return { error: 'Keep price names under 100 characters' };
    if (raw === '' || raw == null || !Number.isFinite(amount) || amount < 0) return { error: `Enter an amount for "${item}"` };
    out.push({ item, amount });
  }
  return { value: out.length ? out : undefined };
}

// Validates and normalises one submission. Used on the server (authoritative)
// and in the browser (instant feedback).
export function cleanEntry(input) {
  const data = {};
  const errors = {};
  for (const f of FIELDS) {
    let v = input?.[f.key];
    if (f.type === 'lines') {
      const { value, error } = cleanLines(f, v);
      if (error) errors[f.key] = error;
      else if (value) data[f.key] = value;
      continue;
    }
    if (typeof v === 'string') v = v.trim();
    if (v === undefined || v === null || v === '') {
      if (f.required) errors[f.key] = 'Required';
      continue;
    }
    if (f.type === 'number') {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) errors[f.key] = 'Enter a number, 0 or more';
      else if (f.maxValue !== undefined && n > f.maxValue) errors[f.key] = `Must be ${f.maxValue} or less`;
      else data[f.key] = n;
    } else if (f.type === 'select') {
      if (!f.options.includes(v)) errors[f.key] = 'Pick an option from the list';
      else data[f.key] = v;
    } else {
      v = String(v);
      if (v.length > (f.max ?? 200)) errors[f.key] = `Keep it under ${f.max ?? 200} characters`;
      else data[f.key] = v;
    }
  }
  return { data, errors };
}
