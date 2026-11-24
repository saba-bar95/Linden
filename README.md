# Linden

Linden is job costing for a custom workshop. Quote a job, log hours at a loaded labor rate, track what is promised versus what has been billed, apply change orders, and see whether the job is still making money.

On localhost you can use the app with no sign-in. Leave the Clerk keys empty and the API runs as a single local shop.

## How a job is costed

1. Estimate lines are the starting budget.
2. Change orders move both budget cost and budget price.
3. Labor actual is hours times the loaded cost rate saved on that time entry.
4. Other costs are either committed (promised, not yet billed) or actual (billed). Forecast cost is actuals plus open commitments, so a cost is never counted twice.
5. Margin is the current budget price minus forecast cost.
6. Every amount belongs to one job.

## Stack

| Layer | Tech |
| ----- | ---- |
| UI | Vite, React 19, TypeScript, Tailwind CSS v4 |
| Auth | Clerk, optional on localhost |
| API | Hono on Node (`/api`) |
| Local database | SQLite (`data/job-margin.sqlite`) via Drizzle |
| Production database | Neon Postgres |
| Hosting | Vercel for the UI, Railway for the API |

## Run locally

```bash
npm install
cp .env.example .env   # optional — add Clerk keys to try real sign-in
npm run dev
```

- App: http://localhost:5173
- API health: http://localhost:3001/api/health

```bash
npm test
npm run build
```

## Deploy

Production setup is in **[DEPLOY.md](./DEPLOY.md)**.

1. **Neon** — create the database, set `DATABASE_URL`, then `npm run db:push:neon`. The API also creates tables on boot.
2. **Railway** — run `npm start`. Set `CLERK_SECRET_KEY`, `DATABASE_URL`, and `CORS_ORIGIN` to the exact Vercel URL.
3. **Vercel** — deploy the UI. Set `VITE_CLERK_PUBLISHABLE_KEY`. Set `DATABASE_URL` and `CLERK_SECRET_KEY` as well if you use the same-origin `/api` backup.
4. Set `VITE_API_BASE` to the Railway URL so the browser calls that API. Leave it empty to use `/api` on Vercel instead.

Use live Clerk keys (`pk_live_` / `sk_live_`) before real customers. Development keys are only for local and preview use.

## Project layout

```
src/           React UI: jobs, a job, and workers
server/        Hono API, auth, margin math, Drizzle schemas
server/tests/  Vitest coverage for the margin rules
api/           Vercel function that serves /api as a backup
scripts/       Bundles the API for that Vercel function
```

## License

Private project.
