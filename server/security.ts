export function isProductionRuntime(): boolean {
  return (
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.VERCEL) ||
    process.env.NODE_ENV === "production"
  );
}

export function normalizeOrigin(raw: string): string {
  const value = raw.trim().replace(/\/$/, "");
  if (!value || value === "*") return value;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/** Frontend origins allowed to present a Clerk session token. */
export function clerkAuthorizedParties(): string[] | undefined {
  const raw = (
    process.env.CLERK_AUTHORIZED_PARTIES ??
    process.env.CORS_ORIGIN ??
    ""
  ).trim();
  if (!raw || raw === "*") return undefined;
  const parties = raw
    .split(",")
    .map(normalizeOrigin)
    .filter((origin) => /^https?:\/\//i.test(origin));
  return parties.length > 0 ? parties : undefined;
}

export function serverClerkKeyKind(): "live" | "test" | "missing" {
  const key = process.env.CLERK_SECRET_KEY ?? "";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "missing";
}

export function requireClerkAuth(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

/** True on Railway/Vercel unless CLERK_REQUIRE_LIVE_KEYS=false. */
export function requireLiveClerkKeys(): boolean {
  if (process.env.CLERK_REQUIRE_LIVE_KEYS === "true") return true;
  if (process.env.CLERK_REQUIRE_LIVE_KEYS === "false") return false;
  return (
    Boolean(process.env.RAILWAY_ENVIRONMENT) || Boolean(process.env.VERCEL)
  );
}

export function assertCorsOrigin(): { ok: true } | { ok: false; reason: string } {
  const cors = (process.env.CORS_ORIGIN ?? "*").trim();
  if (isProductionRuntime() && cors === "*") {
    return {
      ok: false,
      reason:
        "CORS_ORIGIN=* is not allowed in production. Set CORS_ORIGIN to your exact frontend origin (e.g. https://linden2.vercel.app).",
    };
  }
  return { ok: true };
}

export function assertServerClerkKeys(): { ok: true } | { ok: false; reason: string } {
  const kind = serverClerkKeyKind();
  const looksProd = isProductionRuntime();
  const requireLive = requireLiveClerkKeys();

  if (looksProd && kind === "missing") {
    return {
      ok: false,
      reason: "CLERK_SECRET_KEY is required in production (Railway/Vercel).",
    };
  }
  if (requireLive && kind !== "live") {
    return {
      ok: false,
      reason:
        "Live Clerk keys are required on Railway/Vercel (or when CLERK_REQUIRE_LIVE_KEYS=true). Set sk_live_ or CLERK_REQUIRE_LIVE_KEYS=false for staging.",
    };
  }
  return { ok: true };
}

/** Fail-fast production gates: CORS allowlist + Clerk keys. */
export function assertProductionConfig():
  | { ok: true }
  | { ok: false; reason: string } {
  const cors = assertCorsOrigin();
  if (!cors.ok) return cors;
  return assertServerClerkKeys();
}

export function clerkPublishableKind(
  key: string | undefined,
): "live" | "test" | "missing" {
  if (!key) return "missing";
  if (key.startsWith("pk_live_")) return "live";
  if (key.startsWith("pk_test_")) return "test";
  return "missing";
}
