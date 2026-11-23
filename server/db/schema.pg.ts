import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  doublePrecision,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

export const memberships = pgTable(
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
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("memberships_user_unique").on(t.userId)],
);

export const workers = pgTable(
  "workers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    costRate: doublePrecision("cost_rate").notNull(),
    billRate: doublePrecision("bill_rate").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("workers_org_idx").on(t.organizationId)],
);

export const jobs = pgTable(
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
    invoicedAmount: doublePrecision("invoiced_amount").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("jobs_org_idx").on(t.organizationId)],
);

export const estimateLines = pgTable(
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
    quantity: doublePrecision("quantity").notNull().default(1),
    unitCost: doublePrecision("unit_cost").notNull().default(0),
    unitPrice: doublePrecision("unit_price").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("estimate_lines_job_idx").on(t.organizationId, t.jobId)],
);

export const timeEntries = pgTable(
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
    hours: doublePrecision("hours").notNull(),
    costRate: doublePrecision("cost_rate").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("time_entries_job_idx").on(t.organizationId, t.jobId)],
);

export const costEntries = pgTable(
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
    amount: doublePrecision("amount").notNull(),
    status: text("status").notNull().default("actual"),
    entryDate: text("entry_date").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("cost_entries_job_idx").on(t.organizationId, t.jobId)],
);

export const changeOrders = pgTable(
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
    costDelta: doublePrecision("cost_delta").notNull().default(0),
    priceDelta: doublePrecision("price_delta").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("change_orders_job_idx").on(t.organizationId, t.jobId)],
);
