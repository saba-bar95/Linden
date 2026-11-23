import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  real,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    role: text("role").notNull().default("owner"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("memberships_user_unique").on(t.userId)],
);

export const workers = sqliteTable(
  "workers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    /** Loaded cost per hour (wage + burden). */
    costRate: real("cost_rate").notNull(),
    /** Billing rate per hour charged to the client. */
    billRate: real("bill_rate").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("workers_org_idx").on(t.organizationId)],
);

/** draft | active | completed | cancelled */
export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    title: text("title").notNull(),
    clientName: text("client_name").notNull().default(""),
    status: text("status").notNull().default("draft"),
    notes: text("notes").notNull().default(""),
    invoicedAmount: real("invoiced_amount").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("jobs_org_idx").on(t.organizationId)],
);

/** labor | materials | subcontract | other */
export const estimateLines = sqliteTable(
  "estimate_lines",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id),
    category: text("category").notNull(),
    description: text("description").notNull(),
    quantity: real("quantity").notNull().default(1),
    unitCost: real("unit_cost").notNull().default(0),
    unitPrice: real("unit_price").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("estimate_lines_job_idx").on(t.organizationId, t.jobId)],
);

export const timeEntries = sqliteTable(
  "time_entries",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id),
    workerId: text("worker_id")
      .notNull()
      .references(() => workers.id),
    workDate: text("work_date").notNull(),
    hours: real("hours").notNull(),
    /** Snapshot of loaded cost rate at entry time. */
    costRate: real("cost_rate").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("time_entries_job_idx").on(t.organizationId, t.jobId)],
);

/** committed | actual */
export const costEntries = sqliteTable(
  "cost_entries",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id),
    category: text("category").notNull(),
    description: text("description").notNull(),
    amount: real("amount").notNull(),
    status: text("status").notNull().default("actual"),
    entryDate: text("entry_date").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("cost_entries_job_idx").on(t.organizationId, t.jobId)],
);

export const changeOrders = sqliteTable(
  "change_orders",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id),
    description: text("description").notNull(),
    costDelta: real("cost_delta").notNull().default(0),
    priceDelta: real("price_delta").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("change_orders_job_idx").on(t.organizationId, t.jobId)],
);
