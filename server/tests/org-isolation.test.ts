import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HTTPException } from "hono/http-exception";
import { and, eq } from "drizzle-orm";
import { db, migrate, newId, s } from "../db/index.ts";
import { loadJobBundle } from "../index.ts";

/**
 * Org isolation: loadJobBundle (and every job child query) scopes by
 * organizationId. A job that exists for org B must 404 for org A.
 */
describe("org isolation", () => {
  const orgA = newId("org");
  const orgB = newId("org");
  const jobB = newId("job");
  const now = new Date().toISOString();

  beforeAll(async () => {
    await migrate();
    await db.insert(s.organizations).values([
      { id: orgA, name: "Shop A", ownerUserId: "user_a_isolation" },
      { id: orgB, name: "Shop B", ownerUserId: "user_b_isolation" },
    ]);
    await db.insert(s.jobs).values({
      id: jobB,
      organizationId: orgB,
      title: "Foreign job",
      clientName: "Other shop",
      status: "active",
      notes: "",
      invoicedAmount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  afterAll(async () => {
    await db
      .delete(s.jobs)
      .where(and(eq(s.jobs.id, jobB), eq(s.jobs.organizationId, orgB)));
    await db.delete(s.organizations).where(eq(s.organizations.id, orgA));
    await db.delete(s.organizations).where(eq(s.organizations.id, orgB));
  });

  it("returns 404 when org A requests org B's job by id", async () => {
    await expect(loadJobBundle(orgA, jobB)).rejects.toBeInstanceOf(HTTPException);
    try {
      await loadJobBundle(orgA, jobB);
    } catch (err) {
      expect(err).toBeInstanceOf(HTTPException);
      expect((err as HTTPException).status).toBe(404);
    }
  });

  it("loads the job when requested by its owning org", async () => {
    const bundle = await loadJobBundle(orgB, jobB);
    expect(bundle.job.id).toBe(jobB);
    expect(bundle.job.organizationId).toBe(orgB);
    expect(bundle.margin.budgetPrice).toBe(0);
  });
});
