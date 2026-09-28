import { neon } from '@neondatabase/serverless';

let sql;
let ready;

async function migrate(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS lift_entries (
      id          serial PRIMARY KEY,
      created_at  timestamptz NOT NULL DEFAULT now(),
      data        jsonb NOT NULL
    )`;
  // Edit tracking. "version" goes up on every save so two people editing the
  // same lift can't silently overwrite each other.
  await sql`
    ALTER TABLE lift_entries
      ADD COLUMN IF NOT EXISTS version     integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS updated_at  timestamptz,
      ADD COLUMN IF NOT EXISTS updated_by  text`;
}

// Returns the Neon query function, creating/updating the table on first use
// so there is no separate migration step.
export async function getSql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  sql ??= neon(process.env.DATABASE_URL);
  ready ??= migrate(sql).catch((err) => {
    ready = undefined;
    throw err;
  });
  await ready;
  return sql;
}

export async function listEntries() {
  const sql = await getSql();
  return sql`SELECT id, created_at, updated_at, updated_by, version, data FROM lift_entries ORDER BY id DESC`;
}
