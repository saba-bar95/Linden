import { afterEach, describe, expect, it } from "vitest";
import {
  assertCorsOrigin,
  assertProductionConfig,
  assertServerClerkKeys,
  clerkAuthorizedParties,
  isProductionRuntime,
  requireLiveClerkKeys,
} from "../security.ts";

const keys = [
  "NODE_ENV",
  "VERCEL",
  "RAILWAY_ENVIRONMENT",
  "CORS_ORIGIN",
  "CLERK_AUTHORIZED_PARTIES",
  "CLERK_SECRET_KEY",
  "CLERK_REQUIRE_LIVE_KEYS",
] as const;
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("production auth gate", () => {
  it("treats Railway, Vercel, and NODE_ENV=production as production", () => {
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.VERCEL;
    process.env.NODE_ENV = "test";
    expect(isProductionRuntime()).toBe(false);

    process.env.NODE_ENV = "production";
    expect(isProductionRuntime()).toBe(true);

    process.env.NODE_ENV = "test";
    process.env.VERCEL = "1";
    expect(isProductionRuntime()).toBe(true);
  });

  it("locks Clerk tokens to explicit origins and ignores a wildcard", () => {
    delete process.env.CLERK_AUTHORIZED_PARTIES;
    process.env.CORS_ORIGIN = "*";
    expect(clerkAuthorizedParties()).toBeUndefined();

    process.env.CORS_ORIGIN = "https://linden.vercel.app/,localhost:5173";
    expect(clerkAuthorizedParties()).toEqual([
      "https://linden.vercel.app",
      "https://localhost:5173",
    ]);

    process.env.CLERK_AUTHORIZED_PARTIES =
      "http://localhost:5173,https://linden.vercel.app";
    expect(clerkAuthorizedParties()).toEqual([
      "http://localhost:5173",
      "https://linden.vercel.app",
    ]);
  });

  it("fails production when CORS_ORIGIN is wildcard", () => {
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.VERCEL;
    process.env.NODE_ENV = "production";
    delete process.env.CORS_ORIGIN;
    expect(assertCorsOrigin().ok).toBe(false);

    process.env.CORS_ORIGIN = "https://linden2.vercel.app";
    expect(assertCorsOrigin()).toEqual({ ok: true });
  });

  it("requires live Clerk keys on Railway/Vercel by default", () => {
    delete process.env.CLERK_REQUIRE_LIVE_KEYS;
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.VERCEL;
    process.env.NODE_ENV = "test";
    expect(requireLiveClerkKeys()).toBe(false);

    process.env.VERCEL = "1";
    process.env.CLERK_SECRET_KEY = "sk_test_abc";
    expect(requireLiveClerkKeys()).toBe(true);
    expect(assertServerClerkKeys().ok).toBe(false);

    process.env.CLERK_REQUIRE_LIVE_KEYS = "false";
    expect(requireLiveClerkKeys()).toBe(false);
    expect(assertServerClerkKeys()).toEqual({ ok: true });

    process.env.CLERK_REQUIRE_LIVE_KEYS = "true";
    process.env.CLERK_SECRET_KEY = "sk_live_abc";
    expect(assertServerClerkKeys()).toEqual({ ok: true });
  });

  it("combines CORS and Clerk into assertProductionConfig", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    process.env.CORS_ORIGIN = "*";
    process.env.CLERK_SECRET_KEY = "sk_live_abc";
    expect(assertProductionConfig().ok).toBe(false);

    process.env.CORS_ORIGIN = "https://linden2.vercel.app";
    expect(assertProductionConfig()).toEqual({ ok: true });
  });
});
