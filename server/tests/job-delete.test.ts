import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db, migrate, newId, s } from "../db/index.ts";
import { app, deleteJobCascade, loadJobBundle } from "../index.ts";

describe("deleteJobCascade", () => {
  const orgId = newId("org");
  const jobId = newId("job");
  const workerId = newId("wkr");
  const now = new Date().toISOString();

  beforeAll(async () => {
    await migrate();
    await db.insert(s.organizations).values({
      id: orgId,
      name: "Delete test shop",
      ownerUserId: "user_delete_test",
    });
    await db.insert(s.workers).values({
      id: workerId,
      organizationId: orgId,
      name: "Crew",
      costRate: 35,
      billRate: 70,
      active: true,
    });
    await db.insert(s.jobs).values({
      id: jobId,
      organizationId: orgId,
      title: "Rail to delete",
      clientName: "Client",
      status: "active",
      notes: "",
      invoicedAmount: 100,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(s.estimateLines).values({
      id: newId("est"),
      organizationId: orgId,
      jobId,
      category: "labor",
      description: "Fab",
      quantity: 10,
      unitCost: 35,
      unitPrice: 70,
      sortOrder: 0,
    });
    await db.insert(s.timeEntries).values({
      id: newId("time"),
      organizationId: orgId,
      jobId,
      workerId,
      workDate: "2026-11-24",
      hours: 2,
      costRate: 35,
      note: "",
    });
    await db.insert(s.costEntries).values({
      id: newId("cost"),
      organizationId: orgId,
      jobId,
      category: "materials",
      description: "Steel",
      amount: 200,
      status: "actual",
      entryDate: "2026-11-24",
    });
    await db.insert(s.changeOrders).values({
      id: newId("co"),
      organizationId: orgId,
      jobId,
      description: "Extra bracket",
      costDelta: 50,
      priceDelta: 80,
    });
  });

  afterAll(async () => {
    // Idempotent cleanup if a test failed mid-way.
    await deleteJobCascade(orgId, jobId).catch(() => undefined);
    await db
      .delete(s.workers)
      .where(and(eq(s.workers.organizationId, orgId), eq(s.workers.id, workerId)));
    await db.delete(s.organizations).where(eq(s.organizations.id, orgId));
  });

  it("removes the job and all child rows without throwing", async () => {
    const before = await loadJobBundle(orgId, jobId);
    expect(before.lines.length).toBe(1);
    expect(before.timeEntries.length).toBe(1);
    expect(before.costEntries.length).toBe(1);
    expect(before.changeOrders.length).toBe(1);

    await expect(deleteJobCascade(orgId, jobId)).resolves.toBeUndefined();

    await expect(loadJobBundle(orgId, jobId)).rejects.toBeInstanceOf(
      HTTPException,
    );

    const leftovers = await Promise.all([
      db
        .select({ id: s.estimateLines.id })
        .from(s.estimateLines)
        .where(eq(s.estimateLines.jobId, jobId)),
      db
        .select({ id: s.timeEntries.id })
        .from(s.timeEntries)
        .where(eq(s.timeEntries.jobId, jobId)),
      db
        .select({ id: s.costEntries.id })
        .from(s.costEntries)
        .where(eq(s.costEntries.jobId, jobId)),
      db
        .select({ id: s.changeOrders.id })
        .from(s.changeOrders)
        .where(eq(s.changeOrders.jobId, jobId)),
    ]);
    expect(leftovers.every((rows) => rows.length === 0)).toBe(true);
  });
});

describe("DELETE /api/jobs/:id (local auth)", () => {
  it("returns 404 for an unknown job id without 500", async () => {
    await migrate();
    const res = await app.request(`/api/jobs/${newId("job")}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/not found/i);
  });
});
