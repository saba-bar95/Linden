# Deploy Job Margin (Neon + Railway + Vercel)

Same topology as COSTI.

```
Browser  →  Vercel (static Vite app)
               │
               ├─ API calls → Railway (always-on)   ← preferred
               └─ or same-origin /api on Vercel     ← backup
                       │
                       ▼
                  Neon Postgres
```

## 1. Neon

1. Create a project / database.
2. Copy the pooled or direct `postgresql://…` connection string into `.env` as `DATABASE_URL`.
3. Push schema:

```bash
npm run db:push:neon
```

The API also runs `migrate()` on startup and creates tables if missing.

## 2. Railway (API)

1. New project from this GitHub repo.
2. Start command: `npm start` (see `railway.toml`).
3. Health check: `/api/ready`.
4. Variables:

| Variable | Value |
| -------- | ----- |
| `DATABASE_URL` | Neon URL |
| `CLERK_SECRET_KEY` | `sk_live_…` (or `sk_test_` while wiring) |
| `CORS_ORIGIN` | Exact Vercel URL, e.g. `https://job-margin.vercel.app` |
| `PORT` | Railway sets this |

## 3. Clerk

1. Create an application.
2. Paths: sign-in/up as you prefer (UI can be extended later; local mode works without UI).
3. Put `pk_…` on Vercel as `VITE_CLERK_PUBLISHABLE_KEY`.
4. Put `sk_…` on Railway (and Vercel backup) as `CLERK_SECRET_KEY`.

## 4. Vercel (UI)

1. Import the GitHub repo.
2. Build uses `vercel.json` (`bundle-api` + `vite build`).
3. Variables:

| Variable | Where |
| -------- | ----- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Vercel |
| `VITE_API_BASE` | Railway API origin, e.g. `https://job-margin-production.up.railway.app` (no trailing slash) |
| `DATABASE_URL` | Vercel (for `/api` backup) |
| `CLERK_SECRET_KEY` | Vercel (for `/api` backup) |
| `CORS_ORIGIN` | Same Vercel URL (if the backup API serves browser calls) |

If `VITE_API_BASE` is empty, the UI calls same-origin `/api` (Vercel function).

## 5. Smoke check

1. `GET https://YOUR_RAILWAY/api/health`
2. `GET https://YOUR_RAILWAY/api/ready`
3. Open the Vercel URL, create a worker, create a job, add estimate lines, log time, add a committed cost, add a change order — margin should move.
