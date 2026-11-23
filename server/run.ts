import "dotenv/config";
import { serve } from "@hono/node-server";
import { migratePostgres } from "./db/index.ts";
import { app } from "./index.ts";
import {
  assertServerClerkKeys,
  requireClerkAuth,
  serverClerkKeyKind,
} from "./security.ts";

const port = Number(process.env.PORT || 3001);
const dbMode = process.env.DATABASE_URL?.startsWith("postgres")
  ? "neon/postgres"
  : "sqlite";

const keyGate = assertServerClerkKeys();
if (!keyGate.ok) {
  console.error(`Job Margin API refused to start: ${keyGate.reason}`);
  process.exit(1);
}

const kind = serverClerkKeyKind();
if (kind === "test" && requireClerkAuth()) {
  console.warn(
    "WARNING: CLERK_SECRET_KEY is sk_test_ on a production-like host. Use sk_live_ before shipping.",
  );
}

await migratePostgres();
console.log(
  `Job Margin API http://localhost:${port} (${dbMode}, clerk=${kind})`,
);
serve({ fetch: app.fetch, port });
