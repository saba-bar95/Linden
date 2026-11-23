import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { db, newId, s } from "./db/index.ts";

export type AuthVars = {
  userId: string;
  organizationId: string;
};

async function ensureMembership(userId: string, orgName?: string) {
  const existing = await db
    .select()
    .from(s.memberships)
    .where(eq(s.memberships.userId, userId))
    .limit(1);

  if (existing[0]) {
    return existing[0].organizationId;
  }

  const orgId = newId("org");
  const memId = newId("mem");
  await db.insert(s.organizations).values({
    id: orgId,
    name: orgName ?? "My shop",
    ownerUserId: userId,
  });
  await db.insert(s.memberships).values({
    id: memId,
    userId,
    organizationId: orgId,
    role: "owner",
  });
  return orgId;
}

export const authMiddleware = createMiddleware<{
  Variables: AuthVars;
}>(async (c, next) => {
  const secret = process.env.CLERK_SECRET_KEY;

  if (!secret) {
    const orgId = await ensureMembership("dev_local_user", "Local shop");
    c.set("userId", "dev_local_user");
    c.set("organizationId", orgId);
    await next();
    return;
  }

  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing bearer token" });
  }
  const token = header.slice("Bearer ".length);

  let userId: string;
  try {
    const payload = await verifyToken(token, { secretKey: secret });
    userId = payload.sub;
    if (!userId) throw new Error("no sub");
  } catch {
    throw new HTTPException(401, { message: "Invalid token" });
  }

  const orgId = await ensureMembership(userId);
  c.set("userId", userId);
  c.set("organizationId", orgId);
  await next();
});

export function getOrg(c: { get: (k: "organizationId") => string }): string {
  return c.get("organizationId");
}

export async function renameOrg(organizationId: string, name: string) {
  await db
    .update(s.organizations)
    .set({ name })
    .where(eq(s.organizations.id, organizationId));
}

export function clerkClientOrNull() {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return null;
  return createClerkClient({ secretKey: secret });
}
