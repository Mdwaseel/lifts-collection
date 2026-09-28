# Lift Collector

A small app to collect lift specifications one at a time, plus a
password-protected dashboard to view them and download everything as CSV.

- **Form** (`/`): public. Share this link only with your team. The submitter's
  name is remembered between entries. Prices include fixed fields plus
  "+ Add price" rows for anything else, with a live subtotal, GST and total.
  Every lift added so far is listed under the form, and **anyone with the link
  can edit any lift**. The original submitter is kept, and the entry records who
  edited it last and when. If two people edit the same lift at once, the second
  save is stopped and they're asked to reload, so nobody's changes are silently
  lost. Only the dashboard can delete.
- **Dashboard** (`/dashboard`): password-protected. It shows a table of all
  entries (click a row for full details or to delete it) and has a
  **Download CSV** button (opens in Excel).

Stack: Next.js (frontend + API in one app) and Neon Postgres. Both are free.

## 1. Create the database (Neon)

1. Sign up at https://neon.tech and create a project.
2. Click **Connect** and copy the connection string
   (`postgresql://...neon.tech/neondb?sslmode=require`).

You don't need to create a table. The app creates `lift_entries` on the first request.

## 2. Run locally

```powershell
cd lift-collector
copy .env.example .env.local   # then paste your Neon URL and choose a password
npm install
npm run dev
```

Form: http://localhost:3000 · Dashboard: http://localhost:3000/dashboard

## 3. Deploy free (Vercel)

1. Push this folder to a GitHub repo (`.env.local` is git-ignored, so your
   secrets stay local).
2. At https://vercel.com, click **Add New → Project** and import the repo.
   Vercel detects Next.js automatically; leave the build settings as they are.
3. Under **Environment Variables**, add `DATABASE_URL` (your Neon URL) and
   `DASHBOARD_PASSWORD`. Without the password the dashboard can't be opened.
4. Click **Deploy**. Share `https://<your-app>.vercel.app` and keep
   `/dashboard` to yourself.

Functions run in Singapore (`sin1` in `vercel.json`) to sit next to the Neon
database. If your Neon project is in another region, change it to match.

## Changing the fields

All fields are defined in `lib/fields.js`. Add, remove or rename them there,
and the form, validation, dashboard and CSV all update. Entries are stored as
JSON, so you don't need a database migration. Old entries just show blanks
for new fields.
