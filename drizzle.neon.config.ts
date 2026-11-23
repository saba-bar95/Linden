import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  throw new Error("DATABASE_URL must be a postgresql:// URL for Neon push");
}

export default defineConfig({
  schema: "./server/db/schema.pg.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
