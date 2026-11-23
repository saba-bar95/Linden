export function serverClerkKeyKind(): "live" | "test" | "missing" {
  const key = process.env.CLERK_SECRET_KEY ?? "";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "missing";
}

export function requireClerkAuth(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

export function assertServerClerkKeys(): { ok: true } | { ok: false; reason: string } {
  const kind = serverClerkKeyKind();
  const requireLive = process.env.CLERK_REQUIRE_LIVE_KEYS === "true";
  const looksProd =
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.VERCEL) ||
    process.env.NODE_ENV === "production";

  if (looksProd && kind === "missing") {
    return {
      ok: false,
      reason: "CLERK_SECRET_KEY is required in production (Railway/Vercel).",
    };
  }
  if (requireLive && kind !== "live") {
    return {
      ok: false,
      reason: "CLERK_REQUIRE_LIVE_KEYS=true but CLERK_SECRET_KEY is not sk_live_.",
    };
  }
  return { ok: true };
}

export function clerkPublishableKind(
  key: string | undefined,
): "live" | "test" | "missing" {
  if (!key) return "missing";
  if (key.startsWith("pk_live_")) return "live";
  if (key.startsWith("pk_test_")) return "test";
  return "missing";
}
