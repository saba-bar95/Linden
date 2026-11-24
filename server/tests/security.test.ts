import { afterEach, describe, expect, it } from "vitest";
import {
  clerkAuthorizedParties,
  isProductionRuntime,
} from "../security.ts";

const keys = [
  "NODE_ENV",
  "VERCEL",
  "RAILWAY_ENVIRONMENT",
  "CORS_ORIGIN",
  "CLERK_AUTHORIZED_PARTIES",
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
});
