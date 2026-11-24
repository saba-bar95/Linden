import { useEffect, useId, useRef } from "react";
import { Button } from "./ui.tsx";

const SEEN_KEY = "linden.how-it-works";

export function guideWasSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markGuideSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* Storage can be blocked; the button still reopens the guide. */
  }
}

const STEPS = [
  {
    title: "Set a loaded cost for each worker",
    body: "On Workers, the loaded cost per hour is wage plus the cost of employing that person. Logging time copies that rate onto the entry, so a later rate change does not rewrite hours already logged. The bill rate is only a note on the worker. The price a client pays comes from the estimate and change orders.",
  },
  {
    title: "Build the estimate",
    body: "On a job, each line is quantity × unit cost and quantity × unit price. Unit cost is what the work should cost you. Unit price is what the client pays. Those lines are the starting budget.",
  },
  {
    title: "Add change orders to the budget",
    body: "A change order moves both budget cost and budget price, up or down. The current budget is the estimate plus every change order.",
  },
  {
    title: "Log time and other costs once",
    body: "Labor actual is hours × the rate saved on that time entry. A committed cost is promised and not yet billed, such as a purchase order. An actual cost is billed. Forecast cost is labor actual + other actual + costs still committed. Marking a cost actual removes it from committed, so it is counted once.",
  },
  {
    title: "Read margin, the bar, and unbilled separately",
    body: "Margin is the current budget price minus forecast cost. The percent is that margin divided by the budget price. The bar is over budget when forecast cost passes budget cost, which can happen while the price still covers it. Unbilled is budget price minus the amount marked invoiced. Saving an invoice does not change the margin.",
  },
];

export function HowItWorks({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      const body = el.querySelector<HTMLElement>(".jm-guide-body");
      if (body) body.scrollTop = 0;
      body?.focus({ preventScroll: true });
    } else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="jm-guide"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="jm-guide-body" tabIndex={-1}>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          Linden
        </p>
        <h2
          id={titleId}
          className="font-display mt-1 text-2xl font-bold tracking-tight text-[var(--ink)]"
        >
          How a job is costed
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Each amount belongs to one job. The figure at the top is what is left
          after the quote, the hours, and the bills.
        </p>
        <ol className="mt-5 space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-ink)]">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--ink)]">
                  {step.title}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-[var(--muted)]">
                  {step.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </dialog>
  );
}
