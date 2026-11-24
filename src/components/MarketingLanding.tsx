import type { ReactNode } from "react";
import { LandingVisual } from "./LandingVisual.tsx";
import { Logo } from "./Logo.tsx";
import { Button } from "./ui.tsx";

export function MarketingLanding({
  authPanel,
  onSignInClick,
  onSignUpClick,
}: {
  authPanel: ReactNode;
  onSignInClick: () => void;
  onSignUpClick: () => void;
}) {
  return (
    <div className="landing">
      <section className="landing-hero">
        <LandingVisual className="landing-hero-visual jm-fade-up-delay" />

        <div className="landing-hero-copy jm-fade-up">
          <div className="landing-brand">
            <Logo className="h-11 w-11 sm:h-12 sm:w-12" />
            <p className="font-display text-4xl font-extrabold tracking-tight text-[var(--ink)] sm:text-5xl md:text-6xl">
              Linden
            </p>
          </div>

          <h1 className="font-display mt-6 max-w-[18ch] text-3xl font-bold leading-[1.12] tracking-tight text-[var(--ink)] sm:text-4xl md:text-[2.75rem]">
            Catch margin bleed before the invoice.
          </h1>

          <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            Estimate → hours, costs, and change orders → live margin. A thin
            cockpit for shops — not another CRM.
          </p>

          <div className="landing-cta mt-8 flex flex-wrap gap-3">
            <Button type="button" onClick={onSignInClick}>
              Sign in
            </Button>
            <Button type="button" variant="secondary" onClick={onSignUpClick}>
              Create account
            </Button>
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="how-heading">
        <p className="landing-eyebrow">How it works</p>
        <h2
          id="how-heading"
          className="font-display mt-2 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl"
        >
          Quote, run the job, watch the margin.
        </h2>
        <ol className="landing-steps mt-8">
          <li>
            <span className="landing-step-num">1</span>
            <div>
              <p className="font-semibold text-[var(--ink)]">Estimate</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Lock quantity, unit cost, and unit price so the budget is
                honest from day one.
              </p>
            </div>
          </li>
          <li>
            <span className="landing-step-num">2</span>
            <div>
              <p className="font-semibold text-[var(--ink)]">
                Hours, costs, change orders
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Log labor and commitments once. COs move both budget cost and
                price.
              </p>
            </div>
          </li>
          <li>
            <span className="landing-step-num">3</span>
            <div>
              <p className="font-semibold text-[var(--ink)]">Live margin</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                See what’s left before you invoice — not after the bleed is
                permanent.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section
        className="landing-section landing-section-who"
        aria-labelledby="who-heading"
      >
        <p className="landing-eyebrow">Built for shops</p>
        <h2
          id="who-heading"
          className="font-display mt-2 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl"
        >
          Owners, estimators, bookkeepers.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          Custom workshop teams who need the money story on each job — without
          migrating the whole business into a CRM.
        </p>
      </section>

      <section
        id="auth"
        className="landing-auth"
        aria-labelledby="auth-heading"
      >
        <div className="landing-auth-intro">
          <p className="landing-eyebrow">Get in</p>
          <h2
            id="auth-heading"
            className="font-display mt-2 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl"
          >
            Sign in to your shop.
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Same Clerk accounts — Google or email.
          </p>
        </div>

        {authPanel}
      </section>

      <footer className="landing-footer">
        <Logo className="h-6 w-6" />
        <span className="font-display text-sm font-semibold text-[var(--ink-soft)]">
          Linden
        </span>
        <span className="text-xs text-[var(--muted)]">
          Job margin for workshops
        </span>
      </footer>
    </div>
  );
}
