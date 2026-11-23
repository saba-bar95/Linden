# Job Margin

Estimate vs actual job costing for custom workshops and crews — quote a job, log hours at a **loaded** labor rate, track committed vs actual costs, apply change orders, and see whether the job is still making money.

Built the same way as [COSTI](https://github.com/saba-bar95/costi): React + TypeScript on Vercel, Hono API on Railway, Postgres on Neon.

**Local demo needs no Clerk keys** — the API uses a `dev_local_user` shop automatically.

## Rules

1. Estimate lines become the budget.
2. Change orders move budget **cost** and **price**.
3. Labor actual = hours × loaded cost rate (snapshotted on the time entry).
4. Cost entries are `committed` (PO / promised) or `actual` (billed). Forecast = actuals + open commitments — no double count.
5. Margin = current budget price − forecast cost.
6. Every lari sits on one job.

## Stack

| Layer | Tech |
| ----- | ---- |
| UI | Vite, React 19, TypeScript, Tailwind CSS v4 |
| Auth | Clerk (optional locally) |
| API | Hono on Node (`/api`) |
| Local DB | SQLite (`data/job-margin.sqlite`) via Drizzle |
| Prod DB | Neon Postgres |
| Hosting | Vercel (UI + API backup) + Railway (always-on API) |

## Run locally

```bash
npm install
cp .env.example .env   # optional — add Clerk keys for real auth
npm run dev
```

- Web: http://localhost:5173
- API health: http://localhost:3001/api/health

```bash
npm test
npm run build
```

## Deploy (same pattern as COSTI)

See **[DEPLOY.md](./DEPLOY.md)**.

1. **Neon** — create DB → set `DATABASE_URL` → `npm run db:push:neon` (or rely on API migrate on boot)
2. **Railway** — deploy API (`npm start`), set `CLERK_SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGIN`
3. **Vercel** — deploy UI, set `VITE_CLERK_PUBLISHABLE_KEY`, and the same `DATABASE_URL` / `CLERK_SECRET_KEY` for the `/api` backup function
4. Point the browser at Railway first (set `VITE_API_BASE` to the Railway URL), or call same-origin `/api` on Vercel as backup

## Project layout

```
src/           React UI (jobs, workers, margin panels)
server/        Hono API, auth, margin math, Drizzle schemas
server/tests/  Vitest for margin rules
api/           Vercel Node function entry (backup API)
scripts/       API bundle for Vercel
```

## License

Private portfolio project.
