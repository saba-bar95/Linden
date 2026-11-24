import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientKey(header: (name: string) => string | undefined): string {
  const forwarded = header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || header("x-real-ip") || "local";
}

export function rateLimit() {
  return createMiddleware(async (c, next) => {
    const path = c.req.path;
    if (
      c.req.method === "OPTIONS" ||
      path === "/api/health" ||
      path === "/api/ready"
    ) {
      await next();
      return;
    }

    const write =
      c.req.method === "POST" ||
      c.req.method === "PATCH" ||
      c.req.method === "DELETE";
    const limit = write ? 60 : 240;
    const windowMs = 60_000;
    const now = Date.now();
    if (buckets.size > 10_000) buckets.clear();

    const key = `${write ? "w" : "r"}:${clientKey((name) => c.req.header(name))}`;
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }
    if (bucket.count >= limit) {
      throw new HTTPException(429, { message: "Too many requests" });
    }
    bucket.count += 1;
    await next();
  });
}
