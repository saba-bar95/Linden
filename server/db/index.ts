import type Database from "better-sqlite3";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as sqliteSchema from "./schema.ts";
import * as pgSchema from "./schema.pg.ts";

const rawUrl = process.env.DATABASE_URL;
export const isPostgres = Boolean(rawUrl?.startsWith("postgres"));

function openSqlite(filename: string): {
  database: Database.Database;
  db: any;
} {
  const require = createRequire(path.join(process.cwd(), "package.json"));
  const Sqlite = require("better-sqlite3") as new (
    filename: string,
  ) => Database.Database;
  const { drizzle } = require("drizzle-orm/better-sqlite3") as {
    drizzle: (
      database: Database.Database,
      config: { schema: typeof sqliteSchema },
    ) => any;
  };
  const database = new Sqlite(filename);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  return { database, db: drizzle(database, { schema: sqliteSchema }) };
}

function sqliteFilename(): string {
  const dataDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../data",
  );
  fs.mkdirSync(dataDir, { recursive: true });
  if (!rawUrl) return path.join(dataDir, "job-margin.sqlite");
  if (rawUrl.startsWith("file:")) return rawUrl.slice(5);
  return rawUrl;
}

const sqliteBundle = isPostgres ? undefined : openSqlite(sqliteFilename());
const sqlite = sqliteBundle?.database;

function openNeon(url: string): any {
  const client = neon(url);
  return drizzleNeon(client, { schema: pgSchema });
}

/** Untyped on purpose — SQLite and Neon Drizzle clients don't share a union. */
export const db: any = isPostgres ? openNeon(rawUrl!) : sqliteBundle!.db;
export const s: any = isPostgres ? pgSchema : sqliteSchema;
export const rawSqlite = sqlite;

const SQLITE_DDL = `
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS memberships_user_unique ON memberships(user_id);
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  cost_rate REAL NOT NULL,
  bill_rate REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS workers_org_idx ON workers(organization_id);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT NOT NULL DEFAULT '',
  invoiced_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS jobs_org_idx ON jobs(organization_id);
CREATE TABLE IF NOT EXISTS estimate_lines (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_cost REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS estimate_lines_job_idx ON estimate_lines(organization_id, job_id);
CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  worker_id TEXT NOT NULL REFERENCES workers(id),
  work_date TEXT NOT NULL,
  hours REAL NOT NULL,
  cost_rate REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS time_entries_job_idx ON time_entries(organization_id, job_id);
CREATE TABLE IF NOT EXISTS cost_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'actual',
  entry_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS cost_entries_job_idx ON cost_entries(organization_id, job_id);
CREATE TABLE IF NOT EXISTS change_orders (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  description TEXT NOT NULL,
  cost_delta REAL NOT NULL DEFAULT 0,
  price_delta REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS change_orders_job_idx ON change_orders(organization_id, job_id);
`;

const PG_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT now()::text
)`,
  `CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT now()::text
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS memberships_user_unique ON memberships(user_id)`,
  `CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  cost_rate DOUBLE PRECISION NOT NULL,
  bill_rate DOUBLE PRECISION NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL DEFAULT now()::text
)`,
  `CREATE INDEX IF NOT EXISTS workers_org_idx ON workers(organization_id)`,
  `CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT NOT NULL DEFAULT '',
  invoiced_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT now()::text,
  updated_at TEXT NOT NULL DEFAULT now()::text
)`,
  `CREATE INDEX IF NOT EXISTS jobs_org_idx ON jobs(organization_id)`,
  `CREATE TABLE IF NOT EXISTS estimate_lines (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
)`,
  `CREATE INDEX IF NOT EXISTS estimate_lines_job_idx ON estimate_lines(organization_id, job_id)`,
  `CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  worker_id TEXT NOT NULL REFERENCES workers(id),
  work_date TEXT NOT NULL,
  hours DOUBLE PRECISION NOT NULL,
  cost_rate DOUBLE PRECISION NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT now()::text
)`,
  `CREATE INDEX IF NOT EXISTS time_entries_job_idx ON time_entries(organization_id, job_id)`,
  `CREATE TABLE IF NOT EXISTS cost_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'actual',
  entry_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT now()::text
)`,
  `CREATE INDEX IF NOT EXISTS cost_entries_job_idx ON cost_entries(organization_id, job_id)`,
  `CREATE TABLE IF NOT EXISTS change_orders (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  description TEXT NOT NULL,
  cost_delta DOUBLE PRECISION NOT NULL DEFAULT 0,
  price_delta DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT now()::text
)`,
  `CREATE INDEX IF NOT EXISTS change_orders_job_idx ON change_orders(organization_id, job_id)`,
];

let migrated = false;

export async function migrate(): Promise<void> {
  if (migrated) return;
  if (isPostgres) {
    for (const statement of PG_STATEMENTS) {
      await db.execute(sql.raw(statement));
    }
  } else if (sqlite) {
    sqlite.exec(SQLITE_DDL);
  }
  migrated = true;
}

export async function migratePostgres(): Promise<void> {
  await migrate();
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}
