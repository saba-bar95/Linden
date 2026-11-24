import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  api,
  money,
  type Job,
  type JobBundle,
  type Worker,
} from "./lib/api.ts";
import { AccountMenu } from "./components/AccountMenu.tsx";
import {
  guideWasSeen,
  HowItWorks,
  markGuideSeen,
} from "./components/HowItWorks.tsx";
import { Logo } from "./components/Logo.tsx";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  MarginMeter,
  Panel,
  Select,
  StatusBadge,
  TextArea,
} from "./components/ui.tsx";
import { SsoCallback } from "./SsoCallback.tsx";
import { validateForm } from "./lib/form.ts";

const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

type PageHeader = { title?: string; eyebrow?: string };

const PageHeaderContext = createContext<(next: PageHeader) => void>(() => {});
const PageActionsContext = createContext<HTMLElement | null>(null);

function usePageHeader(title?: string, eyebrow?: string, active = true) {
  const setHeader = useContext(PageHeaderContext);
  useLayoutEffect(() => {
    if (!active) return;
    setHeader({ title, eyebrow });
  }, [active, eyebrow, setHeader, title]);
}

function PageActions({
  children,
  active = true,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  const target = useContext(PageActionsContext);
  if (!target || !active) return null;
  return createPortal(children, target);
}

function AppLayout() {
  const { pathname } = useLocation();
  const onWorkers = pathname === "/workers";
  const onJob = pathname.startsWith("/jobs/");
  const [header, setHeader] = useState<PageHeader>({});
  const [actionsEl, setActionsEl] = useState<HTMLDivElement | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (!guideWasSeen()) setGuideOpen(true);
  }, []);

  function closeGuide() {
    markGuideSeen();
    setGuideOpen(false);
  }

  return (
    <PageHeaderContext.Provider value={setHeader}>
      <PageActionsContext.Provider value={actionsEl}>
        <header className="jm-appbar">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3 sm:px-4">
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <Logo className="h-8 w-8 shrink-0" />
              <span className="font-display truncate text-lg font-bold tracking-tight text-[var(--ink)]">
                Linden
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                className="jm-help"
                aria-haspopup="dialog"
                onClick={() => setGuideOpen(true)}
              >
                <span className="jm-help-mark" aria-hidden>
                  ?
                </span>
                How it works
              </button>
              {hasClerk ? <AccountMenu /> : null}
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
          <div className="mb-5">
            <h1 className="font-display jm-break text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
              {header.title ?? "Estimate vs actual"}
            </h1>
            <p className="jm-break mt-1 max-w-2xl text-sm text-[var(--muted)]">
              {header.eyebrow ??
                "Track budget, labor, and change orders in one place."}
            </p>
          </div>
          <div className="jm-toolbar mb-6">
            <nav className="flex min-w-0 flex-1 gap-1 rounded-xl bg-[#e8eef4] p-1 sm:flex-none">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition sm:flex-none ${
                    isActive
                      ? "bg-white text-[var(--ink)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`
                }
              >
                Jobs
              </NavLink>
              <NavLink
                to="/workers"
                className={({ isActive }) =>
                  `flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition sm:flex-none ${
                    isActive
                      ? "bg-white text-[var(--ink)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`
                }
              >
                Workers
              </NavLink>
            </nav>
            <div
              ref={setActionsEl}
              className="jm-shell-actions flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto"
            />
          </div>
          {/* Keep both lists mounted so tab changes do not refetch or replay them. */}
          <div hidden={onWorkers || onJob}>
            <JobsPage />
          </div>
          <div hidden={!onWorkers}>
            <WorkersPage />
          </div>
          {onJob ? <Outlet /> : null}
          <HowItWorks open={guideOpen} onClose={closeGuide} />
        </div>
      </PageActionsContext.Provider>
    </PageHeaderContext.Provider>
  );
}

function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmJobId, setConfirmJobId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const jobsActive = useLocation().pathname === "/";
  usePageHeader(undefined, undefined, jobsActive);

  async function refresh() {
    const data = await api.jobs();
    setJobs(data.jobs);
  }

  useEffect(() => {
    if (!jobsActive) return;
    void refresh().catch((e: Error) => setError(e.message));
  }, [jobsActive]);

  async function createJob(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createJob({ title, clientName });
      setTitle("");
      setClientName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create job");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageActions active={jobsActive}>
        <Button
          type="button"
          variant="secondary"
          className="min-h-10 flex-1 sm:flex-none"
          onClick={() =>
            void refresh().catch((e: Error) => setError(e.message))
          }
        >
          Refresh
        </Button>
      </PageActions>
      {error && <ErrorBanner message={error} />}

      <Panel title="New job" className="mb-6">
        <form
          noValidate
          onSubmit={(e) => {
            if (!validateForm(e.currentTarget)) {
              e.preventDefault();
              return;
            }
            void createJob(e);
          }}
          className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_auto]"
        >
          <Field
            name="title"
            data-label="Job title"
            placeholder="Job title (e.g. Stair rail — Saburtalo)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="sm:col-span-2 md:col-span-1"
          />
          <Field
            name="clientName"
            data-label="Client"
            placeholder="Client"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? "Creating…" : "Create job"}
          </Button>
        </form>
      </Panel>

      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          body="Create a job to build an estimate, log time, and watch margin move as costs land."
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="jm-row jm-surface p-3 sm:p-4">
              <Link to={`/jobs/${job.id}`} className="block">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-display jm-break text-base font-semibold text-[var(--ink)] sm:text-lg">
                        {job.title}
                      </p>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="jm-break text-sm text-[var(--muted)]">
                      {job.clientName || "No client"}
                    </p>
                  </div>
                  {job.margin && (
                    <div className="shrink-0 text-left text-sm sm:min-w-40 sm:text-right">
                      <p
                        className={`font-display text-xl font-bold ${
                          job.margin.overBudget
                            ? "text-[var(--bad)]"
                            : "text-[var(--ok)]"
                        }`}
                      >
                        {money(job.margin.margin)}
                        {job.margin.marginPct != null
                          ? ` · ${job.margin.marginPct}%`
                          : ""}
                      </p>
                      <p className="text-[var(--muted)]">
                        Forecast {money(job.margin.forecastCost)} / budget{" "}
                        {money(job.margin.budgetCost)}
                      </p>
                    </div>
                  )}
                </div>
                {job.margin && (
                  <div className="mt-3">
                    <MarginMeter
                      budgetCost={job.margin.budgetCost}
                      forecastCost={job.margin.forecastCost}
                      overBudget={job.margin.overBudget}
                    />
                  </div>
                )}
              </Link>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                {confirmJobId === job.id ? (
                  <>
                    <p className="mr-auto text-sm text-[var(--muted)]">
                      Deletes the estimate, time, costs, and change orders.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={deletingId === job.id}
                      onClick={() => setConfirmJobId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={deletingId === job.id}
                      onClick={() => {
                        setDeletingId(job.id);
                        setError(null);
                        void api
                          .deleteJob(job.id)
                          .then(() => refresh())
                          .then(() => setConfirmJobId(null))
                          .catch((e: Error) => setError(e.message))
                          .finally(() => setDeletingId(null));
                      }}
                    >
                      {deletingId === job.id ? "Deleting…" : "Delete job"}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setConfirmJobId(job.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<JobBundle | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaClient, setMetaClient] = useState("");
  const [metaNotes, setMetaNotes] = useState("");
  const onThisJob = useLocation().pathname.startsWith("/jobs/");
  usePageHeader(
    bundle?.job.title,
    bundle
      ? `${bundle.job.clientName || "No client"} · live margin`
      : undefined,
    onThisJob && bundle != null,
  );

  async function refresh() {
    if (!id) return;
    const [job, w] = await Promise.all([api.job(id), api.workers()]);
    setBundle(job);
    setWorkers(w.workers.filter((x) => x.active));
    setMetaTitle(job.job.title);
    setMetaClient(job.job.clientName);
    setMetaNotes(job.job.notes ?? "");
  }

  useEffect(() => {
    void refresh().catch((e: Error) => setError(e.message));
  }, [id]);

  if (!bundle) {
    return (
      <p className="text-sm text-[var(--muted)]">{error ?? "Loading job…"}</p>
    );
  }

  const { job, lines, timeEntries, costEntries, changeOrders, margin } = bundle;

  async function saveMeta() {
    setBundle(
      await api.patchJob(job.id, {
        title: metaTitle,
        clientName: metaClient,
        notes: metaNotes,
      }),
    );
    setEditingMeta(false);
  }

  return (
    <>
      <PageActions>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 flex-1 sm:flex-none"
            onClick={() =>
              void refresh().catch((e: Error) => setError(e.message))
            }
          >
            Refresh
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 flex-1 sm:flex-none"
            onClick={() => setEditingMeta((v) => !v)}
          >
            {editingMeta ? "Cancel edit" : "Edit details"}
          </Button>
          {confirmDelete ? (
            <>
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 flex-1 sm:flex-none"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                className="min-h-10 flex-1 sm:flex-none"
                disabled={deleting}
                onClick={() => {
                  setDeleting(true);
                  setError(null);
                  void api
                    .deleteJob(job.id)
                    .then(() => navigate("/"))
                    .catch((e: Error) => {
                      setError(e.message);
                      setDeleting(false);
                    });
                }}
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="danger"
              className="min-h-10 flex-1 sm:flex-none"
              onClick={() => setConfirmDelete(true)}
            >
              Delete job
            </Button>
          )}
      </PageActions>
      {error && <ErrorBanner message={error} />}

      <div className="mb-4">
        <Link
          to="/"
          className="text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)]"
        >
          ← All jobs
        </Link>
        {confirmDelete && (
          <p className="mt-2 text-sm text-[var(--bad)]">
            This removes the job and its estimate, time, costs, and change orders.
          </p>
        )}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Job status">
          <div className="jm-status-grid mb-4">
            {(["draft", "active", "completed", "cancelled"] as const).map(
              (status) => (
                <Button
                  key={status}
                  type="button"
                  variant={job.status === status ? "primary" : "secondary"}
                  className="!capitalize !px-3 !py-2"
                  onClick={() =>
                    void api
                      .patchJob(job.id, { status })
                      .then(setBundle)
                      .catch((e: Error) => setError(e.message))
                  }
                >
                  {status}
                </Button>
              ),
            )}
          </div>
          {editingMeta ? (
            <div className="space-y-3">
              <Field
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Title"
              />
              <Field
                value={metaClient}
                onChange={(e) => setMetaClient(e.target.value)}
                placeholder="Client"
              />
              <TextArea
                value={metaNotes}
                onChange={(e) => setMetaNotes(e.target.value)}
                placeholder="Notes"
              />
              <Button type="button" onClick={() => void saveMeta()}>
                Save details
              </Button>
            </div>
          ) : (
            <p className="jm-break text-sm text-[var(--muted)]">
              {job.notes?.trim()
                ? job.notes
                : "No notes yet. Use Edit details to add context for the crew."}
            </p>
          )}
        </Panel>

        <Panel title="Current margin">
          <p
            className={`font-display text-2xl font-bold sm:text-3xl ${
              margin.overBudget ? "text-[var(--bad)]" : "text-[var(--ok)]"
            }`}
          >
            {money(margin.margin)}
            {margin.marginPct != null ? (
              <span className="ml-2 text-base font-semibold opacity-80 sm:text-lg">
                {margin.marginPct}%
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Budget price {money(margin.budgetPrice)} · budget cost{" "}
            {money(margin.budgetCost)}
          </p>
          <p className="text-sm text-[var(--muted)]">
            Forecast cost {money(margin.forecastCost)}
            {margin.overBudget ? " · over budget" : ""}
          </p>
          <div className="mt-4">
            <MarginMeter
              budgetCost={margin.budgetCost}
              forecastCost={margin.forecastCost}
              overBudget={margin.overBudget}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-[#e8eef4] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Labor actual</p>
              <p className="font-semibold">{money(margin.actualLabor)}</p>
            </div>
            <div className="rounded-xl bg-[#e8eef4] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Other actual</p>
              <p className="font-semibold">{money(margin.actualOther)}</p>
            </div>
            <div className="rounded-xl bg-[#e8eef4] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Committed</p>
              <p className="font-semibold">{money(margin.committed)}</p>
            </div>
            <div className="rounded-xl bg-[#e8eef4] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Unbilled</p>
              <p className="font-semibold">{money(margin.unbilled)}</p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel
          title="Estimate / budget"
          action={
            <span className="text-xs font-medium text-[var(--muted)]">
              {lines.length} line{lines.length === 1 ? "" : "s"}
            </span>
          }
        >
          <ul className="mb-4 space-y-2">
            {lines.map((line) => (
              <li
                key={line.id}
                className="jm-line-row border-b border-[var(--line)] pb-2 text-sm"
              >
                <span className="jm-break min-w-0">
                  <span className="font-semibold capitalize text-[var(--accent-ink)]">
                    {line.category}
                  </span>{" "}
                  · {line.description} · {line.quantity} × {money(line.unitCost)}{" "}
                  / {money(line.unitPrice)}
                </span>
                <Button
                  type="button"
                  variant="danger"
                  className="self-start sm:self-auto"
                  onClick={() =>
                    void api.deleteEstimateLine(job.id, line.id).then(setBundle)
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
            {lines.length === 0 && (
              <li className="text-sm text-[var(--muted)]">
                No estimate lines yet.
              </li>
            )}
          </ul>
          <EstimateForm
            onSubmit={async (body) =>
              setBundle(await api.addEstimateLine(job.id, body))
            }
          />
        </Panel>

        <Panel title="Time (loaded cost rate)">
          <ul className="mb-4 space-y-2">
            {timeEntries.map((t) => (
              <li
                key={t.id}
                className="jm-line-row border-b border-[var(--line)] pb-2 text-sm"
              >
                <span className="jm-break min-w-0">
                  {t.workDate} · {t.hours}h × {money(t.costRate)} ={" "}
                  <strong>{money(t.hours * t.costRate)}</strong>
                  {t.note ? ` · ${t.note}` : ""}
                </span>
                <Button
                  type="button"
                  variant="danger"
                  className="self-start sm:self-auto"
                  onClick={() =>
                    void api.deleteTime(job.id, t.id).then(setBundle)
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <TimeForm
            workers={workers}
            onSubmit={async (body) => setBundle(await api.addTime(job.id, body))}
          />
        </Panel>

        <Panel title="Costs (committed / actual)">
          <ul className="mb-4 space-y-2">
            {costEntries.map((e) => (
              <li
                key={e.id}
                className="jm-line-row border-b border-[var(--line)] pb-2 text-sm"
              >
                <span className="jm-break min-w-0">
                  {e.entryDate} ·{" "}
                  <span className="capitalize">{e.category}</span> ·{" "}
                  {e.description} · <strong>{money(e.amount)}</strong> ·{" "}
                  <em>{e.status}</em>
                </span>
                <span className="flex flex-wrap gap-1">
                  {e.status === "committed" && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        void api
                          .patchCost(job.id, e.id, { status: "actual" })
                          .then(setBundle)
                      }
                    >
                      Mark actual
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() =>
                      void api.deleteCost(job.id, e.id).then(setBundle)
                    }
                  >
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          <CostForm
            onSubmit={async (body) => setBundle(await api.addCost(job.id, body))}
          />
        </Panel>

        <Panel title="Change orders">
          <ul className="mb-4 space-y-2">
            {changeOrders.map((co) => (
              <li
                key={co.id}
                className="jm-line-row border-b border-[var(--line)] pb-2 text-sm"
              >
                <span className="jm-break min-w-0">
                  {co.description} · cost {money(co.costDelta)} · price{" "}
                  {money(co.priceDelta)}
                </span>
                <Button
                  type="button"
                  variant="danger"
                  className="self-start sm:self-auto"
                  onClick={() =>
                    void api.deleteChangeOrder(job.id, co.id).then(setBundle)
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <ChangeOrderForm
            onSubmit={async (body) =>
              setBundle(await api.addChangeOrder(job.id, body))
            }
          />
        </Panel>

        <Panel title="Invoiced">
          <form
            noValidate
            className="grid gap-2 sm:flex sm:flex-wrap sm:items-start"
            onSubmit={(e) => {
              e.preventDefault();
              if (!validateForm(e.currentTarget)) return;
              const fd = new FormData(e.currentTarget);
              void api
                .patchJob(job.id, {
                  invoicedAmount: Number(fd.get("invoiced")),
                })
                .then(setBundle);
            }}
          >
            <Field
              name="invoiced"
              data-label="Invoiced amount"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={job.invoicedAmount}
              className="w-full sm:max-w-56"
            />
            <Button type="submit" className="w-full sm:w-auto">
              Save invoiced
            </Button>
          </form>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Unbilled vs current budget price:{" "}
            <strong className="text-[var(--ink)]">{money(margin.unbilled)}</strong>
          </p>
        </Panel>
      </div>
    </>
  );
}

function EstimateForm({
  onSubmit,
}: {
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <form
      noValidate
      className="grid gap-2 sm:grid-cols-2 md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validateForm(e.currentTarget)) return;
        const form = e.currentTarget;
        const fd = new FormData(form);
        void onSubmit({
          category: fd.get("category"),
          description: fd.get("description"),
          quantity: Number(fd.get("quantity")),
          unitCost: Number(fd.get("unitCost")),
          unitPrice: Number(fd.get("unitPrice")),
        }).then(() => form.reset());
      }}
    >
      <Select name="category" data-label="Category" defaultValue="labor">
        <option value="labor">labor</option>
        <option value="materials">materials</option>
        <option value="subcontract">subcontract</option>
        <option value="other">other</option>
      </Select>
      <Field
        name="description"
        data-label="Description"
        required
        placeholder="Description"
        className="sm:col-span-2 md:col-span-2"
      />
      <Field
        name="quantity"
        data-label="Quantity"
        type="number"
        step="0.01"
        min="0.01"
        required
        defaultValue={1}
      />
      <Field
        name="unitCost"
        data-label="Unit cost"
        type="number"
        step="0.01"
        min="0"
        placeholder="Unit cost"
        required
      />
      <Field
        name="unitPrice"
        data-label="Unit price"
        type="number"
        step="0.01"
        min="0"
        placeholder="Unit price"
        required
        className="sm:col-span-2 md:col-span-1"
      />
      <Button
        type="submit"
        variant="secondary"
        className="w-full sm:col-span-2 md:col-span-6 md:w-auto md:justify-self-start"
      >
        Add estimate line
      </Button>
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
      <p className="text-sm text-[var(--muted)]">
        Add a worker on the Workers page first so hours use a loaded cost rate.{" "}
        <Link className="font-semibold text-[var(--accent)]" to="/workers">
          Go to Workers →
        </Link>
      </p>
    );
  }
  return (
    <form
      noValidate
      className="grid gap-2 sm:grid-cols-2 md:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validateForm(e.currentTarget)) return;
        const form = e.currentTarget;
        const fd = new FormData(form);
        void onSubmit({
          workerId: fd.get("workerId"),
          hours: Number(fd.get("hours")),
          workDate: fd.get("workDate") || undefined,
          note: fd.get("note") || undefined,
        }).then(() => form.reset());
      }}
    >
      <Select
        name="workerId"
        data-label="Worker"
        required
        className="sm:col-span-2 md:col-span-1"
      >
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({money(w.costRate)}/h cost)
          </option>
        ))}
      </Select>
      <Field
        name="hours"
        data-label="Hours"
        type="number"
        step="0.25"
        min="0.25"
        placeholder="Hours"
        required
      />
      <Field name="workDate" data-label="Work date" type="date" />
      <Field
        name="note"
        data-label="Note"
        placeholder="Note (optional)"
        className="sm:col-span-2 md:col-span-1"
      />
      <Button
        type="submit"
        variant="secondary"
        className="w-full sm:col-span-2 md:col-span-1 md:w-auto"
      >
        Log time
      </Button>
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
      noValidate
      className="grid gap-2 sm:grid-cols-2 md:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validateForm(e.currentTarget)) return;
        const form = e.currentTarget;
        const fd = new FormData(form);
        void onSubmit({
          category: fd.get("category"),
          description: fd.get("description"),
          amount: Number(fd.get("amount")),
          status: fd.get("status"),
        }).then(() => form.reset());
      }}
    >
      <Select name="category" data-label="Category" defaultValue="materials">
        <option value="materials">materials</option>
        <option value="subcontract">subcontract</option>
        <option value="other">other</option>
        <option value="labor">labor</option>
      </Select>
      <Field
        name="description"
        data-label="Description"
        required
        placeholder="Description"
        className="sm:col-span-2 md:col-span-1"
      />
      <Field
        name="amount"
        data-label="Amount"
        type="number"
        step="0.01"
        min="0.01"
        required
        placeholder="Amount"
      />
      <Select name="status" data-label="Status" defaultValue="actual">
        <option value="committed">committed</option>
        <option value="actual">actual</option>
      </Select>
      <Button
        type="submit"
        variant="secondary"
        className="w-full sm:col-span-2 md:col-span-1 md:w-auto"
      >
        Add cost
      </Button>
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
      noValidate
      className="grid gap-2 sm:grid-cols-2 md:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validateForm(e.currentTarget)) return;
        const form = e.currentTarget;
        const fd = new FormData(form);
        void onSubmit({
          description: fd.get("description"),
          costDelta: Number(fd.get("costDelta")),
          priceDelta: Number(fd.get("priceDelta")),
        }).then(() => form.reset());
      }}
    >
      <Field
        name="description"
        data-label="Description"
        required
        placeholder="Change description"
        className="sm:col-span-2 md:col-span-2"
      />
      <Field
        name="costDelta"
        data-label="Cost change"
        type="number"
        step="0.01"
        required
        placeholder="Cost Δ"
      />
      <Field
        name="priceDelta"
        data-label="Price change"
        type="number"
        step="0.01"
        required
        placeholder="Price Δ"
      />
      <Button
        type="submit"
        variant="secondary"
        className="w-full sm:col-span-2 md:col-span-4 md:w-auto md:justify-self-start"
      >
        Add change order
      </Button>
    </form>
  );
}

function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmWorkerId, setConfirmWorkerId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const workersActive = useLocation().pathname === "/workers";
  usePageHeader(
    "Crew rates",
    "Loaded cost and bill rates for time entries",
    workersActive,
  );

  async function refresh() {
    setWorkers((await api.workers()).workers);
  }

  useEffect(() => {
    if (!workersActive) return;
    void refresh().catch((e: Error) => setError(e.message));
  }, [workersActive]);

  return (
    <>
      <PageActions active={workersActive}>
        <Button
          type="button"
          variant="secondary"
          className="min-h-10 flex-1 sm:flex-none"
          onClick={() =>
            void refresh().catch((e: Error) => setError(e.message))
          }
        >
          Refresh
        </Button>
      </PageActions>
      {error && <ErrorBanner message={error} />}
      <Panel title="Add worker" className="mb-6">
        <form
          noValidate
          className="grid gap-2 sm:grid-cols-2 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!validateForm(e.currentTarget)) return;
            const form = e.currentTarget;
            const fd = new FormData(form);
            setBusy(true);
            void api
              .createWorker({
                name: String(fd.get("name")),
                costRate: Number(fd.get("costRate")),
                billRate: Number(fd.get("billRate")),
              })
              .then(() => refresh())
              .then(() => form.reset())
              .catch((err: Error) => setError(err.message))
              .finally(() => setBusy(false));
          }}
        >
          <Field
            name="name"
            data-label="Name"
            required
            placeholder="Name"
            className="sm:col-span-2 md:col-span-1"
          />
          <Field
            name="costRate"
            data-label="Loaded cost / hour"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="Loaded cost / hour"
          />
          <Field
            name="billRate"
            data-label="Bill rate / hour"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="Bill rate / hour"
          />
          <Button
            type="submit"
            disabled={busy}
            className="w-full sm:col-span-2 md:col-span-1 md:w-auto"
          >
            {busy ? "Adding…" : "Add worker"}
          </Button>
        </form>
      </Panel>

      {workers.length === 0 ? (
        <EmptyState
          title="No workers yet"
          body="Add your crew with loaded cost rates so time logs feed each job's margin."
        />
      ) : (
        <ul className="space-y-3">
          {workers.map((w) => (
            <li
              key={w.id}
              className="jm-surface flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
            >
              <div className="min-w-0">
                <p className="font-display jm-break text-lg font-semibold">
                  {w.name}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  Cost {money(w.costRate)}/h · Bill {money(w.billRate)}/h
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={w.active ? "active" : "cancelled"} />
                {confirmWorkerId === w.id ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={deletingId === w.id}
                      onClick={() => setConfirmWorkerId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={deletingId === w.id}
                      onClick={() => {
                        setDeletingId(w.id);
                        setError(null);
                        void api
                          .deleteWorker(w.id)
                          .then(() => refresh())
                          .then(() => setConfirmWorkerId(null))
                          .catch((e: Error) => setError(e.message))
                          .finally(() => setDeletingId(null));
                      }}
                    >
                      {deletingId === w.id ? "Deleting…" : "Delete worker"}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setConfirmWorkerId(w.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/sso-callback" element={<SsoCallback />} />
      <Route element={<AppLayout />}>
        <Route index element={null} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/workers" element={null} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
