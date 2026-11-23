import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`jm-field ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`jm-field ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`jm-field min-h-24 resize-y ${props.className ?? ""}`}
    />
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      {...props}
      className={`jm-btn jm-btn-${variant} ${className}`}
    />
  );
}

export function Panel({
  children,
  className = "",
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`jm-surface p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <h3 className="font-display text-lg tracking-tight text-[var(--ink)]">
              {title}
            </h3>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const tone =
    status === "active"
      ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
      : status === "completed"
        ? "bg-[var(--ok-soft)] text-[var(--ok)]"
        : status === "cancelled"
          ? "bg-[var(--bad-soft)] text-[var(--bad)]"
          : "bg-[#e8eef4] text-[var(--muted)]";
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${tone}`}
    >
      {status}
    </span>
  );
}

export function MarginMeter({
  budgetCost,
  forecastCost,
  overBudget,
}: {
  budgetCost: number;
  forecastCost: number;
  overBudget: boolean;
}) {
  const pct =
    budgetCost > 0
      ? Math.min(140, Math.round((forecastCost / budgetCost) * 100))
      : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium text-[var(--muted)]">
        <span>Cost burn vs budget</span>
        <span className={overBudget ? "text-[var(--bad)]" : "text-[var(--ok)]"}>
          {pct}%
        </span>
      </div>
      <div className="jm-meter h-2 overflow-hidden rounded-md bg-[#e5ebf1]">
        <span
          className={overBudget ? "bg-[var(--bad)]" : "bg-[var(--accent)]"}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="jm-surface px-6 py-10 text-center">
      <p className="font-display text-xl text-[var(--ink)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="mb-4 rounded-xl border border-[var(--bad)]/20 bg-[var(--bad-soft)] px-4 py-3 text-sm text-[var(--bad)]">
      {message}
    </p>
  );
}
