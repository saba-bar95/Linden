export type JobMargin = {
  budgetCost: number;
  budgetPrice: number;
  forecastCost: number;
  margin: number;
  marginPct: number | null;
  overBudget: boolean;
  actualLabor: number;
  actualOther: number;
  committed: number;
  invoicedAmount: number;
  unbilled: number;
  byCategory: Record<
    string,
    { budgetCost: number; budgetPrice: number; actual: number; committed: number }
  >;
};

export type Job = {
  id: string;
  title: string;
  clientName: string;
  status: string;
  notes: string;
  invoicedAmount: number;
  margin?: JobMargin;
};

export type Worker = {
  id: string;
  name: string;
  costRate: number;
  billRate: number;
  active: boolean;
};

export type JobBundle = {
  job: Job;
  lines: Array<{
    id: string;
    category: string;
    description: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
  }>;
  timeEntries: Array<{
    id: string;
    workerId: string;
    workDate: string;
    hours: number;
    costRate: number;
    note: string;
  }>;
  costEntries: Array<{
    id: string;
    category: string;
    description: string;
    amount: number;
    status: string;
    entryDate: string;
  }>;
  changeOrders: Array<{
    id: string;
    description: string;
    costDelta: number;
    priceDelta: number;
  }>;
  margin: JobMargin;
};

function normalizeApiBase(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/\/$/, "");
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  // Host-only values become relative paths in the browser (HTML SPA → JSON parse error).
  return `https://${value}`;
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE);

let authToken: string | null = null;
let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  authTokenGetter = null;
}

/** Prefer this with Clerk so each request gets a fresh JWT. */
export function setAuthTokenGetter(getter: (() => Promise<string | null>) | null) {
  authTokenGetter = getter;
  authToken = null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = authTokenGetter ? await authTokenGetter() : authToken;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let body: { error?: string } = {};
  try {
    body = text ? (JSON.parse(text) as { error?: string }) : {};
  } catch {
    throw new Error(
      `API returned non-JSON from ${API_BASE || "(same origin)"}${path}. Set VITE_API_BASE to a full URL including https://`,
    );
  }
  if (!res.ok) {
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return body as T;
}

export const api = {
  me: () =>
    request<{
      userId: string;
      organization: { id: string; name: string } | null;
      authMode: string;
    }>("/api/me"),
  jobs: () => request<{ jobs: Job[] }>("/api/jobs"),
  job: (id: string) => request<JobBundle>(`/api/jobs/${id}`),
  createJob: (body: { title: string; clientName?: string }) =>
    request<{ id: string }>("/api/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchJob: (id: string, body: Record<string, unknown>) =>
    request<JobBundle>(`/api/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteJob: (id: string) =>
    request<{ ok: true }>(`/api/jobs/${id}`, { method: "DELETE" }),
  addEstimateLine: (jobId: string, body: Record<string, unknown>) =>
    request<JobBundle>(`/api/jobs/${jobId}/estimate-lines`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchEstimateLine: (
    jobId: string,
    lineId: string,
    body: Record<string, unknown>,
  ) =>
    request<JobBundle>(`/api/jobs/${jobId}/estimate-lines/${lineId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteEstimateLine: (jobId: string, lineId: string) =>
    request<JobBundle>(`/api/jobs/${jobId}/estimate-lines/${lineId}`, {
      method: "DELETE",
    }),
  addTime: (jobId: string, body: Record<string, unknown>) =>
    request<JobBundle>(`/api/jobs/${jobId}/time-entries`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchTime: (jobId: string, entryId: string, body: Record<string, unknown>) =>
    request<JobBundle>(`/api/jobs/${jobId}/time-entries/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteTime: (jobId: string, entryId: string) =>
    request<JobBundle>(`/api/jobs/${jobId}/time-entries/${entryId}`, {
      method: "DELETE",
    }),
  addCost: (jobId: string, body: Record<string, unknown>) =>
    request<JobBundle>(`/api/jobs/${jobId}/cost-entries`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchCost: (jobId: string, entryId: string, body: Record<string, unknown>) =>
    request<JobBundle>(`/api/jobs/${jobId}/cost-entries/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteCost: (jobId: string, entryId: string) =>
    request<JobBundle>(`/api/jobs/${jobId}/cost-entries/${entryId}`, {
      method: "DELETE",
    }),
  addChangeOrder: (jobId: string, body: Record<string, unknown>) =>
    request<JobBundle>(`/api/jobs/${jobId}/change-orders`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchChangeOrder: (
    jobId: string,
    coId: string,
    body: Record<string, unknown>,
  ) =>
    request<JobBundle>(`/api/jobs/${jobId}/change-orders/${coId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteChangeOrder: (jobId: string, coId: string) =>
    request<JobBundle>(`/api/jobs/${jobId}/change-orders/${coId}`, {
      method: "DELETE",
    }),
  workers: () => request<{ workers: Worker[] }>("/api/workers"),
  createWorker: (body: {
    name: string;
    costRate: number;
    billRate: number;
  }) =>
    request<{ id: string }>("/api/workers", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchWorker: (id: string, body: Record<string, unknown>) =>
    request<{ ok: true }>(`/api/workers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteWorker: (id: string) =>
    request<{ ok: true }>(`/api/workers/${id}`, { method: "DELETE" }),
};

export function money(n: number): string {
  return new Intl.NumberFormat("en-GE", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
