import "dotenv/config";
import { serve } from "@hono/node-server";
import { migratePostgres } from "./db/index.ts";
import { app } from "./index.ts";
import {
  assertProductionConfig,
  isProductionRuntime,
  requireLiveClerkKeys,
  serverClerkKeyKind,
} from "./security.ts";

const port = Number(process.env.PORT || 3001);
const dbMode = process.env.DATABASE_URL?.startsWith("postgres")
  ? "neon/postgres"
  : "sqlite";

const gate = assertProductionConfig();
if (!gate.ok) {
  console.error(`Linden API refused to start: ${gate.reason}`);
  process.exit(1);
}

const kind = serverClerkKeyKind();
if (
  isProductionRuntime() &&
  kind === "test" &&
  !requireLiveClerkKeys()
) {
  console.warn(
    "WARNING: CLERK_SECRET_KEY is sk_test_ on a production host. Set CLERK_REQUIRE_LIVE_KEYS=true with sk_live_ before real users.",
  );
}

await migratePostgres();
console.log(
  `Linden API http://localhost:${port} (${dbMode}, clerk=${kind})`,
);
serve({ fetch: app.fetch, port });
