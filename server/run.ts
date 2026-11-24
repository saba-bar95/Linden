import "dotenv/config";
import { serve } from "@hono/node-server";
import { migratePostgres } from "./db/index.ts";
import { app } from "./index.ts";
import {
  assertServerClerkKeys,
  isProductionRuntime,
  serverClerkKeyKind,
} from "./security.ts";

const port = Number(process.env.PORT || 3001);
const dbMode = process.env.DATABASE_URL?.startsWith("postgres")
  ? "neon/postgres"
  : "sqlite";

const keyGate = assertServerClerkKeys();
if (!keyGate.ok) {
  console.error(`Linden API refused to start: ${keyGate.reason}`);
  process.exit(1);
}

const kind = serverClerkKeyKind();
if (isProductionRuntime() && kind === "test") {
  console.warn(
    "WARNING: CLERK_SECRET_KEY is sk_test_ on a production host. Use sk_live_ before real users.",
  );
}
if (isProductionRuntime() && (process.env.CORS_ORIGIN ?? "*").trim() === "*") {
  console.warn(
    "WARNING: CORS_ORIGIN is *. Set it to your exact Vercel URL so other sites cannot call the API.",
  );
}

await migratePostgres();
console.log(
  `Linden API http://localhost:${port} (${dbMode}, clerk=${kind})`,
);
serve({ fetch: app.fetch, port });
