import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import {
  api,
  money,
  type Job,
  type JobBundle,
  type Worker,
} from "./lib/api.ts";

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-8 flex items-end justify-between border-b border-stone-200 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
            job margin
          </p>
          <h1 className="font-serif text-3xl text-stone-900">
            Estimate vs actual
          </h1>
        </div>
        <nav className="flex gap-4 text-sm text-stone-600">
          <Link className="hover:text-stone-900" to="/">
            Jobs
          </Link>
          <Link className="hover:text-stone-900" to="/workers">
            Workers
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}

function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const data = await api.jobs();
    setJobs(data.jobs);
  }

  useEffect(() => {
    void refresh().catch((e: Error) => setError(e.message));
  }, []);

  async function createJob(e: FormEvent) {
    e.preventDefault();
    await api.createJob({ title, clientName });
    setTitle("");
    setClientName("");
    await refresh();
  }

  return (
    <Shell>
      {error && <p className="mb-4 text-sm text-red-800">{error}</p>}
      <form
        onSubmit={createJob}
        className="mb-8 grid gap-3 rounded-xl border border-stone-200 bg-white/70 p-4 md:grid-cols-[1fr_1fr_auto]"
      >
        <input
          className="rounded-lg border border-stone-300 px-3 py-2"
          placeholder="Job title (e.g. Stair rail — Saburtalo)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="rounded-lg border border-stone-300 px-3 py-2"
          placeholder="Client"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-4 py-2 text-white"
        >
          New job
        </button>
      </form>

      <div className="space-y-3">
        {jobs.map((job) => (
          <Link
            key={job.id}
            to={`/jobs/${job.id}`}
            className="block rounded-xl border border-stone-200 bg-white/80 p-4 transition hover:border-stone-400"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900">{job.title}</p>
                <p className="text-sm text-stone-500">
                  {job.clientName || "No client"} · {job.status}
                </p>
              </div>
              {job.margin && (
                <div className="text-right text-sm">
                  <p
                    className={
                      job.margin.overBudget ? "text-red-800" : "text-green-800"
                    }
                  >
                    Margin {money(job.margin.margin)}
                    {job.margin.marginPct != null
                      ? ` (${job.margin.marginPct}%)`
                      : ""}
                  </p>
                  <p className="text-stone-500">
                    Forecast {money(job.margin.forecastCost)} / budget{" "}
                    {money(job.margin.budgetCost)}
                  </p>
                </div>
              )}
            </div>
          </Link>
        ))}
        {jobs.length === 0 && (
          <p className="text-sm text-stone-500">
            No jobs yet. Create one to build an estimate.
          </p>
        )}
      </div>
    </Shell>
  );
}

function JobDetailPage() {
  const { id } = useParams();
  const [bundle, setBundle] = useState<JobBundle | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!id) return;
    const [job, w] = await Promise.all([api.job(id), api.workers()]);
    setBundle(job);
    setWorkers(w.workers.filter((x) => x.active));
  }

  useEffect(() => {
    void refresh().catch((e: Error) => setError(e.message));
  }, [id]);

  if (!bundle) {
    return (
      <Shell>
        <p className="text-sm text-stone-500">{error ?? "Loading…"}</p>
      </Shell>
    );
  }

  const { job, lines, timeEntries, costEntries, changeOrders, margin } = bundle;

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-stone-500 hover:text-stone-800">
            ← Jobs
          </Link>
          <h2 className="mt-2 font-serif text-2xl">{job.title}</h2>
          <p className="text-stone-500">
            {job.clientName || "No client"} · {job.status}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white/80 p-4 text-sm">
          <p className="text-stone-500">Current margin</p>
          <p
            className={`text-2xl font-medium ${
              margin.overBudget ? "text-red-800" : "text-green-800"
            }`}
          >
            {money(margin.margin)}
            {margin.marginPct != null ? ` · ${margin.marginPct}%` : ""}
          </p>
          <p className="mt-1 text-stone-600">
            Budget {money(margin.budgetPrice)} price / {money(margin.budgetCost)}{" "}
            cost
          </p>
          <p className="text-stone-600">
            Forecast cost {money(margin.forecastCost)}
            {margin.overBudget ? " · over budget" : ""}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["draft", "active", "completed"] as const).map((status) => (
          <button
            key={status}
            type="button"
            className={`rounded-full border px-3 py-1 text-sm ${
              job.status === status
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white"
            }`}
            onClick={() =>
              void api
                .patchJob(job.id, { status })
                .then(setBundle)
                .catch((e: Error) => setError(e.message))
            }
          >
            {status}
          </button>
        ))}
      </div>

      <section className="mb-8 rounded-xl border border-stone-200 bg-white/80 p-4">
        <h3 className="mb-3 font-medium">Estimate / budget</h3>
        <ul className="mb-4 space-y-2 text-sm">
          {lines.map((line) => (
            <li
              key={line.id}
              className="flex items-center justify-between gap-3 border-b border-stone-100 pb-2"
            >
              <span>
                <span className="text-stone-500">{line.category}</span> ·{" "}
                {line.description} · {line.quantity} × {money(line.unitCost)} /{" "}
                {money(line.unitPrice)}
              </span>
              <button
                type="button"
                className="text-stone-400 hover:text-red-700"
                onClick={() =>
                  void api.deleteEstimateLine(job.id, line.id).then(setBundle)
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <EstimateForm
          onSubmit={async (body) =>
            setBundle(await api.addEstimateLine(job.id, body))
          }
        />
      </section>

      <section className="mb-8 rounded-xl border border-stone-200 bg-white/80 p-4">
        <h3 className="mb-3 font-medium">Time (loaded cost rate)</h3>
        <ul className="mb-4 space-y-2 text-sm">
          {timeEntries.map((t) => (
            <li
              key={t.id}
              className="flex justify-between border-b border-stone-100 pb-2"
            >
              <span>
                {t.workDate} · {t.hours}h × {money(t.costRate)} ={" "}
                {money(t.hours * t.costRate)}
              </span>
              <button
                type="button"
                className="text-stone-400 hover:text-red-700"
                onClick={() => void api.deleteTime(job.id, t.id).then(setBundle)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <TimeForm
          workers={workers}
          onSubmit={async (body) => setBundle(await api.addTime(job.id, body))}
        />
      </section>

      <section className="mb-8 rounded-xl border border-stone-200 bg-white/80 p-4">
        <h3 className="mb-3 font-medium">Costs (committed / actual)</h3>
        <ul className="mb-4 space-y-2 text-sm">
          {costEntries.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2"
            >
              <span>
                {e.entryDate} · {e.category} · {e.description} · {money(e.amount)}{" "}
                · <em>{e.status}</em>
              </span>
              <span className="flex gap-2">
                {e.status === "committed" && (
                  <button
                    type="button"
                    className="text-amber-800 hover:underline"
                    onClick={() =>
                      void api
                        .patchCost(job.id, e.id, { status: "actual" })
                        .then(setBundle)
                    }
                  >
                    Mark actual
                  </button>
                )}
                <button
                  type="button"
                  className="text-stone-400 hover:text-red-700"
                  onClick={() =>
                    void api.deleteCost(job.id, e.id).then(setBundle)
                  }
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
        <CostForm
          onSubmit={async (body) => setBundle(await api.addCost(job.id, body))}
        />
      </section>

      <section className="mb-8 rounded-xl border border-stone-200 bg-white/80 p-4">
        <h3 className="mb-3 font-medium">Change orders</h3>
        <ul className="mb-4 space-y-2 text-sm">
          {changeOrders.map((co) => (
            <li
              key={co.id}
              className="flex justify-between border-b border-stone-100 pb-2"
            >
              <span>
                {co.description} · cost {money(co.costDelta)} · price{" "}
                {money(co.priceDelta)}
              </span>
              <button
                type="button"
                className="text-stone-400 hover:text-red-700"
                onClick={() =>
                  void api.deleteChangeOrder(job.id, co.id).then(setBundle)
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <ChangeOrderForm
          onSubmit={async (body) =>
            setBundle(await api.addChangeOrder(job.id, body))
          }
        />
      </section>

      <section className="rounded-xl border border-stone-200 bg-white/80 p-4">
        <h3 className="mb-3 font-medium">Invoiced</h3>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void api
              .patchJob(job.id, {
                invoicedAmount: Number(fd.get("invoiced")),
              })
              .then(setBundle);
          }}
        >
          <input
            name="invoiced"
            type="number"
            step="0.01"
            min="0"
            defaultValue={job.invoicedAmount}
            className="rounded-lg border border-stone-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-stone-900 px-4 py-2 text-white"
          >
            Save
          </button>
        </form>
        <p className="mt-2 text-sm text-stone-500">
          Unbilled vs current budget price: {money(margin.unbilled)}
        </p>
      </section>
    </Shell>
  );
}

function EstimateForm({
  onSubmit,
}: {
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <form
      className="grid gap-2 md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        void onSubmit({
          category: fd.get("category"),
          description: fd.get("description"),
          quantity: Number(fd.get("quantity")),
          unitCost: Number(fd.get("unitCost")),
          unitPrice: Number(fd.get("unitPrice")),
        }).then(() => e.currentTarget.reset());
      }}
    >
      <select
        name="category"
        className="rounded-lg border border-stone-300 px-2 py-2"
        defaultValue="labor"
      >
        <option value="labor">labor</option>
        <option value="materials">materials</option>
        <option value="subcontract">subcontract</option>
        <option value="other">other</option>
      </select>
      <input
        name="description"
        required
        placeholder="Description"
        className="rounded-lg border border-stone-300 px-2 py-2 md:col-span-2"
      />
      <input
        name="quantity"
        type="number"
        step="0.01"
        min="0.01"
        defaultValue={1}
        className="rounded-lg border border-stone-300 px-2 py-2"
      />
      <input
        name="unitCost"
        type="number"
        step="0.01"
        min="0"
        placeholder="Unit cost"
        required
        className="rounded-lg border border-stone-300 px-2 py-2"
      />
      <input
        name="unitPrice"
        type="number"
        step="0.01"
        min="0"
        placeholder="Unit price"
        required
        className="rounded-lg border border-stone-300 px-2 py-2"
      />
      <button
        type="submit"
        className="rounded-lg border border-stone-900 px-3 py-2 md:col-span-6 md:justify-self-start"
      >
        Add estimate line
      </button>
    </form>
  );
}

function TimeForm({
  workers,
  onSubmit,
}: {
  workers: Worker[];
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  if (workers.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        Add a worker first (Workers page) so hours can use a loaded cost rate.
      </p>
    );
  }
  return (
    <form
      className="grid gap-2 md:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        void onSubmit({
          workerId: fd.get("workerId"),
          hours: Number(fd.get("hours")),
          workDate: fd.get("workDate") || undefined,
          note: fd.get("note") || undefined,
        }).then(() => e.currentTarget.reset());
      }}
    >
      <select
        name="workerId"
        className="rounded-lg border border-stone-300 px-2 py-2"
        required
      >
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({money(w.costRate)}/h cost)
          </option>
        ))}
      </select>
      <input
        name="hours"
        type="number"
        step="0.25"
        min="0.25"
        placeholder="Hours"
        required
        className="rounded-lg border border-stone-300 px-2 py-2"
      />
      <input
        name="workDate"
        type="date"
        className="rounded-lg border border-stone-300 px-2 py-2"
      />
      <button
        type="submit"
        className="rounded-lg border border-stone-900 px-3 py-2"
      >
        Log time
      </button>
    </form>
  );
}

function CostForm({
  onSubmit,
}: {
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <form
      className="grid gap-2 md:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        void onSubmit({
          category: fd.get("category"),
          description: fd.get("description"),
          amount: Number(fd.get("amount")),
          status: fd.get("status"),
        }).then(() => e.currentTarget.reset());
      }}
    >
      <select
        name="category"
        defaultValue="materials"
        className="rounded-lg border border-stone-300 px-2 py-2"
      >
        <option value="materials">materials</option>
        <option value="subcontract">subcontract</option>
        <option value="other">other</option>
        <option value="labor">labor</option>
      </select>
      <input
        name="description"
        required
        placeholder="Description"
        className="rounded-lg border border-stone-300 px-2 py-2"
      />
      <input
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        required
        placeholder="Amount"
        className="rounded-lg border border-stone-300 px-2 py-2"
      />
      <select
        name="status"
        defaultValue="actual"
        className="rounded-lg border border-stone-300 px-2 py-2"
      >
        <option value="committed">committed</option>
        <option value="actual">actual</option>
      </select>
      <button
        type="submit"
        className="rounded-lg border border-stone-900 px-3 py-2"
      >
        Add cost
      </button>
    </form>
  );
}

function ChangeOrderForm({
  onSubmit,
}: {
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <form
      className="grid gap-2 md:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        void onSubmit({
          description: fd.get("description"),
          costDelta: Number(fd.get("costDelta")),
          priceDelta: Number(fd.get("priceDelta")),
        }).then(() => e.currentTarget.reset());
      }}
    >
      <input
        name="description"
        required
        placeholder="Change description"
        className="rounded-lg border border-stone-300 px-2 py-2 md:col-span-2"
      />
      <input
        name="costDelta"
        type="number"
        step="0.01"
        required
        placeholder="Cost Δ"
        className="rounded-lg border border-stone-300 px-2 py-2"
      />
      <input
        name="priceDelta"
        type="number"
        step="0.01"
        required
        placeholder="Price Δ"
        className="rounded-lg border border-stone-300 px-2 py-2"
      />
      <button
        type="submit"
        className="rounded-lg border border-stone-900 px-3 py-2 md:col-span-4 md:justify-self-start"
      >
        Add change order
      </button>
    </form>
  );
}

function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setWorkers((await api.workers()).workers);
  }

  useEffect(() => {
    void refresh().catch((e: Error) => setError(e.message));
  }, []);

  return (
    <Shell>
      {error && <p className="mb-4 text-sm text-red-800">{error}</p>}
      <form
        className="mb-6 grid gap-2 rounded-xl border border-stone-200 bg-white/80 p-4 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void api
            .createWorker({
              name: String(fd.get("name")),
              costRate: Number(fd.get("costRate")),
              billRate: Number(fd.get("billRate")),
            })
            .then(() => refresh())
            .then(() => e.currentTarget.reset())
            .catch((err: Error) => setError(err.message));
        }}
      >
        <input
          name="name"
          required
          placeholder="Name"
          className="rounded-lg border border-stone-300 px-3 py-2"
        />
        <input
          name="costRate"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="Loaded cost / hour"
          className="rounded-lg border border-stone-300 px-3 py-2"
        />
        <input
          name="billRate"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="Bill rate / hour"
          className="rounded-lg border border-stone-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-4 py-2 text-white"
        >
          Add worker
        </button>
      </form>
      <ul className="space-y-2">
        {workers.map((w) => (
          <li
            key={w.id}
            className="rounded-xl border border-stone-200 bg-white/80 px-4 py-3 text-sm"
          >
            <strong>{w.name}</strong> · cost {money(w.costRate)}/h · bill{" "}
            {money(w.billRate)}/h · {w.active ? "active" : "inactive"}
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<JobsPage />} />
      <Route path="/jobs/:id" element={<JobDetailPage />} />
      <Route path="/workers" element={<WorkersPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
