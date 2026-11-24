import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { authMiddleware, getOrg, renameOrg, type AuthVars } from "./auth.ts";
import { db, isPostgres, migrate, newId, s, todayYmd } from "./db/index.ts";
import {
  computeJobMargin,
  type CostCategory,
} from "./margin.ts";
import { rateLimit } from "./rate-limit.ts";
import {
  assertProductionConfig,
  isProductionRuntime,
  normalizeOrigin,
  requireClerkAuth,
} from "./security.ts";

const categorySchema = z.enum(["labor", "materials", "subcontract", "other"]);
const statusSchema = z.enum(["draft", "active", "completed", "cancelled"]);
const costStatusSchema = z.enum(["committed", "actual"]);
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const money = z.number().finite().nonnegative().max(1_000_000_000);
const rate = z.number().finite().nonnegative().max(10_000_000);
const signedMoney = z.number().finite().min(-1_000_000_000).max(1_000_000_000);
const hours = z.number().finite().positive().max(1_000);
const quantity = z.number().finite().positive().max(1_000_000);

export const app = new Hono<{ Variables: AuthVars }>();

const corsOriginRaw = process.env.CORS_ORIGIN ?? "*";
const corsOrigins =
  corsOriginRaw.trim() === "*"
    ? ("*" as const)
    : corsOriginRaw
        .split(",")
        .map(normalizeOrigin)
        .filter(Boolean);

app.use(
  "*",
  secureHeaders({
    // The UI on Vercel calls this API on Railway. same-origin would block that.
    crossOriginResourcePolicy: "cross-origin",
    crossOriginEmbedderPolicy: false,
    xFrameOptions: "DENY",
    referrerPolicy: "strict-origin-when-cross-origin",
    permissionsPolicy: {
      camera: false,
      microphone: false,
      geolocation: false,
      payment: false,
      usb: false,
    },
  }),
);
app.use(
  "*",
  bodyLimit({
    maxSize: 100 * 1024,
    onError: (c) => c.json({ error: "Payload too large" }, 413),
  }),
);
app.use("*", rateLimit());
app.use(
  "*",
  cors({
    origin:
      corsOrigins === "*"
        ? "*"
        : (origin) => (origin && corsOrigins.includes(origin) ? origin : null),
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use("*", async (c, next) => {
  const gate = assertProductionConfig();
  if (!gate.ok) {
    return c.json({ error: gate.reason }, 503);
  }
  await next();
});

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    db: isPostgres ? "postgres" : "sqlite",
  }),
);

app.get("/api/ready", async (c) => {
  try {
    await migrate();
    if (isProductionRuntime() && !requireClerkAuth()) {
      return c.json({ ok: false, reason: "auth_not_configured" }, 503);
    }
    return c.json({ ok: true });
  } catch (e) {
    console.error(e);
    return c.json({ ok: false, reason: "not_ready" }, 503);
  }
});

app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/health" || c.req.path === "/api/ready") {
    await next();
    return;
  }
  return authMiddleware(c, next);
});

function asCategory(v: string): CostCategory {
  return categorySchema.parse(v);
}

function marginFromChildren(
  invoicedAmount: number,
  lines: Array<{
    category: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
  }>,
  timeEntries: Array<{ hours: number; costRate: number }>,
  costEntries: Array<{ category: string; amount: number; status: string }>,
  changeOrders: Array<{ costDelta: number; priceDelta: number }>,
) {
  return computeJobMargin({
    lines: lines.map((l) => ({
      category: asCategory(l.category),
      quantity: l.quantity,
      unitCost: l.unitCost,
      unitPrice: l.unitPrice,
    })),
    timeEntries: timeEntries.map((t) => ({
      hours: t.hours,
      costRate: t.costRate,
    })),
    costEntries: costEntries.map((e) => ({
      category: asCategory(e.category),
      amount: e.amount,
      status: costStatusSchema.parse(e.status),
    })),
    changeOrders: changeOrders.map((co) => ({
      costDelta: co.costDelta,
      priceDelta: co.priceDelta,
    })),
    invoicedAmount,
  });
}

function groupByJobId<T extends { jobId: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.jobId);
    if (list) list.push(row);
    else map.set(row.jobId, [row]);
  }
  return map;
}

/** Org-scoped job detail. Exported for isolation tests. */
export async function loadJobBundle(orgId: string, jobId: string) {
  const jobRows = await db
    .select()
    .from(s.jobs)
    .where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, jobId)))
    .limit(1);
  const job = jobRows[0];
  if (!job) throw new HTTPException(404, { message: "Job not found" });

  const [lines, timeEntries, costEntries, changeOrders] = await Promise.all([
    db
      .select()
      .from(s.estimateLines)
      .where(
        and(
          eq(s.estimateLines.organizationId, orgId),
          eq(s.estimateLines.jobId, jobId),
        ),
      ),
    db
      .select()
      .from(s.timeEntries)
      .where(
        and(
          eq(s.timeEntries.organizationId, orgId),
          eq(s.timeEntries.jobId, jobId),
        ),
      ),
    db
      .select()
      .from(s.costEntries)
      .where(
        and(
          eq(s.costEntries.organizationId, orgId),
          eq(s.costEntries.jobId, jobId),
        ),
      ),
    db
      .select()
      .from(s.changeOrders)
      .where(
        and(
          eq(s.changeOrders.organizationId, orgId),
          eq(s.changeOrders.jobId, jobId),
        ),
      ),
  ]);

  const margin = marginFromChildren(
    job.invoicedAmount,
    lines,
    timeEntries,
    costEntries,
    changeOrders,
  );

  return { job, lines, timeEntries, costEntries, changeOrders, margin };
}

/** Jobs list with margin — one child query set for the whole org (no N+1). */
async function loadJobSummaries(orgId: string) {
  const jobs = await db
    .select()
    .from(s.jobs)
    .where(eq(s.jobs.organizationId, orgId))
    .orderBy(desc(s.jobs.updatedAt));

  if (jobs.length === 0) return [];

  const jobIds = jobs.map((job: { id: string }) => job.id);

  const [lines, timeEntries, costEntries, changeOrders] = await Promise.all([
    db
      .select()
      .from(s.estimateLines)
      .where(
        and(
          eq(s.estimateLines.organizationId, orgId),
          inArray(s.estimateLines.jobId, jobIds),
        ),
      ),
    db
      .select()
      .from(s.timeEntries)
      .where(
        and(
          eq(s.timeEntries.organizationId, orgId),
          inArray(s.timeEntries.jobId, jobIds),
        ),
      ),
    db
      .select()
      .from(s.costEntries)
      .where(
        and(
          eq(s.costEntries.organizationId, orgId),
          inArray(s.costEntries.jobId, jobIds),
        ),
      ),
    db
      .select()
      .from(s.changeOrders)
      .where(
        and(
          eq(s.changeOrders.organizationId, orgId),
          inArray(s.changeOrders.jobId, jobIds),
        ),
      ),
  ]);

  const linesByJob = groupByJobId<{
    jobId: string;
    category: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
  }>(lines);
  const timeByJob = groupByJobId<{
    jobId: string;
    hours: number;
    costRate: number;
  }>(timeEntries);
  const costsByJob = groupByJobId<{
    jobId: string;
    category: string;
    amount: number;
    status: string;
  }>(costEntries);
  const cosByJob = groupByJobId<{
    jobId: string;
    costDelta: number;
    priceDelta: number;
  }>(changeOrders);

  return jobs.map((job: { id: string; invoicedAmount: number }) => ({
    ...job,
    margin: marginFromChildren(
      job.invoicedAmount,
      linesByJob.get(job.id) ?? [],
      timeByJob.get(job.id) ?? [],
      costsByJob.get(job.id) ?? [],
      cosByJob.get(job.id) ?? [],
    ),
  }));
}

app.get("/api/me", async (c) => {
  const orgId = getOrg(c);
  const orgs = await db
    .select()
    .from(s.organizations)
    .where(eq(s.organizations.id, orgId))
    .limit(1);
  return c.json({
    userId: c.get("userId"),
    organization: orgs[0] ?? null,
    authMode: process.env.CLERK_SECRET_KEY ? "clerk" : "local",
  });
});

app.patch("/api/org", async (c) => {
  const body = z.object({ name: requiredText(120) }).parse(await c.req.json());
  await renameOrg(getOrg(c), body.name);
  return c.json({ ok: true });
});

app.get("/api/workers", async (c) => {
  const orgId = getOrg(c);
  const rows = await db
    .select()
    .from(s.workers)
    .where(eq(s.workers.organizationId, orgId))
    .orderBy(desc(s.workers.createdAt));
  return c.json({ workers: rows });
});

app.post("/api/workers", async (c) => {
  const body = z
    .object({
      name: requiredText(120),
      costRate: rate,
      billRate: rate,
      active: z.boolean().optional(),
    })
    .parse(await c.req.json());
  const id = newId("wkr");
  await db.insert(s.workers).values({
    id,
    organizationId: getOrg(c),
    name: body.name,
    costRate: body.costRate,
    billRate: body.billRate,
    active: body.active ?? true,
  });
  return c.json({ id }, 201);
});

app.patch("/api/workers/:id", async (c) => {
  const orgId = getOrg(c);
  const id = c.req.param("id");
  const body = z
    .object({
      name: requiredText(120).optional(),
      costRate: rate.optional(),
      billRate: rate.optional(),
      active: z.boolean().optional(),
    })
    .parse(await c.req.json());

  const existing = await db
    .select()
    .from(s.workers)
    .where(and(eq(s.workers.organizationId, orgId), eq(s.workers.id, id)))
    .limit(1);
  if (!existing[0]) throw new HTTPException(404, { message: "Worker not found" });

  await db
    .update(s.workers)
    .set({
      name: body.name ?? existing[0].name,
      costRate: body.costRate ?? existing[0].costRate,
      billRate: body.billRate ?? existing[0].billRate,
      active: body.active ?? existing[0].active,
    })
    .where(and(eq(s.workers.organizationId, orgId), eq(s.workers.id, id)));

  return c.json({ ok: true });
});

app.delete("/api/workers/:id", async (c) => {
  const orgId = getOrg(c);
  const id = c.req.param("id");
  const existing = await db
    .select()
    .from(s.workers)
    .where(and(eq(s.workers.organizationId, orgId), eq(s.workers.id, id)))
    .limit(1);
  if (!existing[0]) throw new HTTPException(404, { message: "Worker not found" });

  const logged = await db
    .select({ id: s.timeEntries.id })
    .from(s.timeEntries)
    .where(
      and(eq(s.timeEntries.organizationId, orgId), eq(s.timeEntries.workerId, id)),
    )
    .limit(1);
  if (logged[0]) {
    throw new HTTPException(409, {
      message: "This worker has hours on a job. Remove those time entries first.",
    });
  }

  await db
    .delete(s.workers)
    .where(and(eq(s.workers.organizationId, orgId), eq(s.workers.id, id)));
  return c.json({ ok: true });
});

app.get("/api/jobs", async (c) => {
  const jobs = await loadJobSummaries(getOrg(c));
  return c.json({ jobs });
});

app.post("/api/jobs", async (c) => {
  const body = z
    .object({
      title: requiredText(200),
      clientName: optionalText(200),
      notes: optionalText(2000),
    })
    .parse(await c.req.json());
  const id = newId("job");
  const now = new Date().toISOString();
  await db.insert(s.jobs).values({
    id,
    organizationId: getOrg(c),
    title: body.title,
    clientName: body.clientName ?? "",
    notes: body.notes ?? "",
    status: "draft",
    invoicedAmount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return c.json({ id }, 201);
});

app.get("/api/jobs/:id", async (c) => {
  const bundle = await loadJobBundle(getOrg(c), c.req.param("id"));
  return c.json(bundle);
});

app.patch("/api/jobs/:id", async (c) => {
  const orgId = getOrg(c);
  const id = c.req.param("id");
  const body = z
    .object({
      title: requiredText(200).optional(),
      clientName: optionalText(200).optional(),
      notes: optionalText(2000).optional(),
      status: statusSchema.optional(),
      invoicedAmount: money.optional(),
    })
    .parse(await c.req.json());

  const existing = await db
    .select()
    .from(s.jobs)
    .where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, id)))
    .limit(1);
  if (!existing[0]) throw new HTTPException(404, { message: "Job not found" });

  await db
    .update(s.jobs)
    .set({
      title: body.title ?? existing[0].title,
      clientName: body.clientName ?? existing[0].clientName,
      notes: body.notes ?? existing[0].notes,
      status: body.status ?? existing[0].status,
      invoicedAmount: body.invoicedAmount ?? existing[0].invoicedAmount,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, id)));

  return c.json(await loadJobBundle(orgId, id));
});

app.delete("/api/jobs/:id", async (c) => {
  const orgId = getOrg(c);
  const id = c.req.param("id");
  const existing = await db
    .select({ id: s.jobs.id })
    .from(s.jobs)
    .where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, id)))
    .limit(1);
  if (!existing[0]) throw new HTTPException(404, { message: "Job not found" });

  const removeRows = (tx: typeof db) => [
    tx
      .delete(s.estimateLines)
      .where(
        and(eq(s.estimateLines.organizationId, orgId), eq(s.estimateLines.jobId, id)),
      ),
    tx
      .delete(s.timeEntries)
      .where(and(eq(s.timeEntries.organizationId, orgId), eq(s.timeEntries.jobId, id))),
    tx
      .delete(s.costEntries)
      .where(and(eq(s.costEntries.organizationId, orgId), eq(s.costEntries.jobId, id))),
    tx
      .delete(s.changeOrders)
      .where(
        and(eq(s.changeOrders.organizationId, orgId), eq(s.changeOrders.jobId, id)),
      ),
    tx.delete(s.jobs).where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, id))),
  ];

  if (isPostgres) {
    await db.transaction(async (tx: typeof db) => {
      for (const statement of removeRows(tx)) await statement;
    });
  } else {
    // better-sqlite3 rejects an async transaction callback.
    db.transaction((tx: typeof db) => {
      for (const statement of removeRows(tx)) statement.run();
    });
  }

  return c.json({ ok: true });
});

app.post("/api/jobs/:id/estimate-lines", async (c) => {
  const orgId = getOrg(c);
  const jobId = c.req.param("id");
  await loadJobBundle(orgId, jobId);
  const body = z
    .object({
      category: categorySchema,
      description: requiredText(300),
      quantity,
      unitCost: money,
      unitPrice: money,
    })
    .parse(await c.req.json());

  const id = newId("est");
  await db.insert(s.estimateLines).values({
    id,
    organizationId: orgId,
    jobId,
    category: body.category,
    description: body.description,
    quantity: body.quantity,
    unitCost: body.unitCost,
    unitPrice: body.unitPrice,
    sortOrder: 0,
  });
  await db
    .update(s.jobs)
    .set({ updatedAt: new Date().toISOString() })
    .where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, jobId)));
  return c.json(await loadJobBundle(orgId, jobId), 201);
});

app.patch("/api/jobs/:jobId/estimate-lines/:lineId", async (c) => {
  const orgId = getOrg(c);
  const { jobId, lineId } = c.req.param();
  const body = z
    .object({
      category: categorySchema.optional(),
      description: requiredText(300).optional(),
      quantity: quantity.optional(),
      unitCost: money.optional(),
      unitPrice: money.optional(),
    })
    .parse(await c.req.json());

  const rows = await db
    .select()
    .from(s.estimateLines)
    .where(
      and(
        eq(s.estimateLines.organizationId, orgId),
        eq(s.estimateLines.jobId, jobId),
        eq(s.estimateLines.id, lineId),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new HTTPException(404, { message: "Estimate line not found" });

  await db
    .update(s.estimateLines)
    .set({
      category: body.category ?? rows[0].category,
      description: body.description ?? rows[0].description,
      quantity: body.quantity ?? rows[0].quantity,
      unitCost: body.unitCost ?? rows[0].unitCost,
      unitPrice: body.unitPrice ?? rows[0].unitPrice,
    })
    .where(
      and(
        eq(s.estimateLines.organizationId, orgId),
        eq(s.estimateLines.id, lineId),
      ),
    );
  await db
    .update(s.jobs)
    .set({ updatedAt: new Date().toISOString() })
    .where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, jobId)));
  return c.json(await loadJobBundle(orgId, jobId));
});

app.delete("/api/jobs/:jobId/estimate-lines/:lineId", async (c) => {
  const orgId = getOrg(c);
  const { jobId, lineId } = c.req.param();
  await db
    .delete(s.estimateLines)
    .where(
      and(
        eq(s.estimateLines.organizationId, orgId),
        eq(s.estimateLines.jobId, jobId),
        eq(s.estimateLines.id, lineId),
      ),
    );
  return c.json(await loadJobBundle(orgId, jobId));
});

app.post("/api/jobs/:id/time-entries", async (c) => {
  const orgId = getOrg(c);
  const jobId = c.req.param("id");
  await loadJobBundle(orgId, jobId);
  const body = z
    .object({
      workerId: requiredText(80),
      hours,
      workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      note: z.string().trim().max(500).optional(),
    })
    .parse(await c.req.json());

  const workers = await db
    .select()
    .from(s.workers)
    .where(
      and(eq(s.workers.organizationId, orgId), eq(s.workers.id, body.workerId)),
    )
    .limit(1);
  if (!workers[0]) throw new HTTPException(404, { message: "Worker not found" });

  const id = newId("time");
  await db.insert(s.timeEntries).values({
    id,
    organizationId: orgId,
    jobId,
    workerId: body.workerId,
    workDate: body.workDate ?? todayYmd(),
    hours: body.hours,
    costRate: workers[0].costRate,
    note: body.note ?? "",
  });
  await db
    .update(s.jobs)
    .set({ updatedAt: new Date().toISOString() })
    .where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, jobId)));
  return c.json(await loadJobBundle(orgId, jobId), 201);
});

app.patch("/api/jobs/:jobId/time-entries/:entryId", async (c) => {
  const orgId = getOrg(c);
  const { jobId, entryId } = c.req.param();
  const body = z
    .object({
      hours: hours.optional(),
      workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      note: z.string().trim().max(500).optional(),
      costRate: rate.optional(),
    })
    .parse(await c.req.json());

  const rows = await db
    .select()
    .from(s.timeEntries)
    .where(
      and(
        eq(s.timeEntries.organizationId, orgId),
        eq(s.timeEntries.jobId, jobId),
        eq(s.timeEntries.id, entryId),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new HTTPException(404, { message: "Time entry not found" });

  await db
    .update(s.timeEntries)
    .set({
      hours: body.hours ?? rows[0].hours,
      workDate: body.workDate ?? rows[0].workDate,
      note: body.note ?? rows[0].note,
      costRate: body.costRate ?? rows[0].costRate,
    })
    .where(
      and(eq(s.timeEntries.organizationId, orgId), eq(s.timeEntries.id, entryId)),
    );
  await db
    .update(s.jobs)
    .set({ updatedAt: new Date().toISOString() })
    .where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, jobId)));
  return c.json(await loadJobBundle(orgId, jobId));
});

app.delete("/api/jobs/:jobId/time-entries/:entryId", async (c) => {
  const orgId = getOrg(c);
  const { jobId, entryId } = c.req.param();
  await db
    .delete(s.timeEntries)
    .where(
      and(
        eq(s.timeEntries.organizationId, orgId),
        eq(s.timeEntries.jobId, jobId),
        eq(s.timeEntries.id, entryId),
      ),
    );
  return c.json(await loadJobBundle(orgId, jobId));
});

app.post("/api/jobs/:id/cost-entries", async (c) => {
  const orgId = getOrg(c);
  const jobId = c.req.param("id");
  await loadJobBundle(orgId, jobId);
  const body = z
    .object({
      category: categorySchema,
      description: requiredText(300),
      amount: money.positive(),
      status: costStatusSchema.default("actual"),
      entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    .parse(await c.req.json());

  const id = newId("cost");
  await db.insert(s.costEntries).values({
    id,
    organizationId: orgId,
    jobId,
    category: body.category,
    description: body.description,
    amount: body.amount,
    status: body.status,
    entryDate: body.entryDate ?? todayYmd(),
  });
  await db
    .update(s.jobs)
    .set({ updatedAt: new Date().toISOString() })
    .where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, jobId)));
  return c.json(await loadJobBundle(orgId, jobId), 201);
});

app.patch("/api/jobs/:jobId/cost-entries/:entryId", async (c) => {
  const orgId = getOrg(c);
  const { jobId, entryId } = c.req.param();
  const body = z
    .object({
      status: costStatusSchema.optional(),
      amount: money.positive().optional(),
      description: requiredText(300).optional(),
    })
    .parse(await c.req.json());

  const rows = await db
    .select()
    .from(s.costEntries)
    .where(
      and(
        eq(s.costEntries.organizationId, orgId),
        eq(s.costEntries.jobId, jobId),
        eq(s.costEntries.id, entryId),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new HTTPException(404, { message: "Cost entry not found" });

  await db
    .update(s.costEntries)
    .set({
      status: body.status ?? rows[0].status,
      amount: body.amount ?? rows[0].amount,
      description: body.description ?? rows[0].description,
    })
    .where(
      and(
        eq(s.costEntries.organizationId, orgId),
        eq(s.costEntries.id, entryId),
      ),
    );
  return c.json(await loadJobBundle(orgId, jobId));
});

app.delete("/api/jobs/:jobId/cost-entries/:entryId", async (c) => {
  const orgId = getOrg(c);
  const { jobId, entryId } = c.req.param();
  await db
    .delete(s.costEntries)
    .where(
      and(
        eq(s.costEntries.organizationId, orgId),
        eq(s.costEntries.jobId, jobId),
        eq(s.costEntries.id, entryId),
      ),
    );
  return c.json(await loadJobBundle(orgId, jobId));
});

app.post("/api/jobs/:id/change-orders", async (c) => {
  const orgId = getOrg(c);
  const jobId = c.req.param("id");
  await loadJobBundle(orgId, jobId);
  const body = z
    .object({
      description: requiredText(300),
      costDelta: signedMoney,
      priceDelta: signedMoney,
    })
    .parse(await c.req.json());

  const id = newId("co");
  await db.insert(s.changeOrders).values({
    id,
    organizationId: orgId,
    jobId,
    description: body.description,
    costDelta: body.costDelta,
    priceDelta: body.priceDelta,
  });
  await db
    .update(s.jobs)
    .set({ updatedAt: new Date().toISOString() })
    .where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, jobId)));
  return c.json(await loadJobBundle(orgId, jobId), 201);
});

app.patch("/api/jobs/:jobId/change-orders/:coId", async (c) => {
  const orgId = getOrg(c);
  const { jobId, coId } = c.req.param();
  const body = z
    .object({
      description: requiredText(300).optional(),
      costDelta: signedMoney.optional(),
      priceDelta: signedMoney.optional(),
    })
    .parse(await c.req.json());

  const rows = await db
    .select()
    .from(s.changeOrders)
    .where(
      and(
        eq(s.changeOrders.organizationId, orgId),
        eq(s.changeOrders.jobId, jobId),
        eq(s.changeOrders.id, coId),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new HTTPException(404, { message: "Change order not found" });

  await db
    .update(s.changeOrders)
    .set({
      description: body.description ?? rows[0].description,
      costDelta: body.costDelta ?? rows[0].costDelta,
      priceDelta: body.priceDelta ?? rows[0].priceDelta,
    })
    .where(
      and(
        eq(s.changeOrders.organizationId, orgId),
        eq(s.changeOrders.id, coId),
      ),
    );
  await db
    .update(s.jobs)
    .set({ updatedAt: new Date().toISOString() })
    .where(and(eq(s.jobs.organizationId, orgId), eq(s.jobs.id, jobId)));
  return c.json(await loadJobBundle(orgId, jobId));
});

app.delete("/api/jobs/:jobId/change-orders/:coId", async (c) => {
  const orgId = getOrg(c);
  const { jobId, coId } = c.req.param();
  await db
    .delete(s.changeOrders)
    .where(
      and(
        eq(s.changeOrders.organizationId, orgId),
        eq(s.changeOrders.jobId, jobId),
        eq(s.changeOrders.id, coId),
      ),
    );
  return c.json(await loadJobBundle(orgId, jobId));
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof z.ZodError) {
    return c.json({ error: "validation_error", details: err.issues }, 400);
  }
  console.error(err);
  return c.json({ error: "server_error" }, 500);
});

export { migrate, migratePostgres } from "./db/index.ts";
