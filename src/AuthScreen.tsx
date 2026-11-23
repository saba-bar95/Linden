import { useState, type FormEvent } from "react";
import { useSignIn, useSignUp } from "@clerk/react";
import { Button, Field } from "./components/ui.tsx";

type Mode = "sign-in" | "sign-up" | "verify";

function fieldError(errors: unknown, key: string): string | undefined {
  const fields = (errors as { fields?: Record<string, { message?: string }> } | null)
    ?.fields;
  return fields?.[key]?.message;
}

export function AuthScreen() {
  const { signIn, errors: signInErrors, fetchStatus: signInStatus } =
    useSignIn();
  const { signUp, errors: signUpErrors, fetchStatus: signUpStatus } =
    useSignUp();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = signInStatus === "fetching" || signUpStatus === "fetching";

  async function finalizeSignIn() {
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          if (url.startsWith("http")) window.location.href = url;
          else window.location.assign(url);
        },
      });
    }
  }

  async function finalizeSignUp() {
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          if (url.startsWith("http")) window.location.href = url;
          else window.location.assign(url);
        },
      });
    }
  }

  async function onSignIn(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const { error } = await signIn.password({
      emailAddress: email,
      password,
    });
    if (error) {
      setLocalError(error.message ?? "Sign in failed");
      return;
    }
    if (signIn.status === "needs_second_factor") {
      setLocalError("MFA is enabled on this account — use the Clerk dashboard to finish setup, or disable MFA for demos.");
      return;
    }
    await finalizeSignIn();
  }

  async function onSignUp(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const { error } = await signUp.password({
      emailAddress: email,
      password,
    });
    if (error) {
      setLocalError(error.message ?? "Sign up failed");
      return;
    }
    if (signUp.status === "complete") {
      await finalizeSignUp();
      return;
    }
    await signUp.verifications.sendEmailCode();
    setMode("verify");
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) {
      setLocalError(error.message ?? "Verification failed");
      return;
    }
    await finalizeSignUp();
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.22),transparent_60%)]" />
      <div className="jm-fade-up relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Job Margin
          </p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-[var(--ink)]">
            Know the margin
            <br />
            before it slips.
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Estimate vs actual costing for shops and crews.
          </p>
        </div>

        <div className="jm-surface p-6 sm:p-7">
          <div className="mb-5 flex gap-2 rounded-xl bg-[#e8eef4] p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "sign-in"
                  ? "bg-white text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
              onClick={() => {
                setMode("sign-in");
                setLocalError(null);
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "sign-up" || mode === "verify"
                  ? "bg-white text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
              onClick={() => {
                setMode("sign-up");
                setLocalError(null);
              }}
            >
              Create account
            </button>
          </div>

          {mode === "verify" ? (
            <form className="space-y-3" onSubmit={onVerify}>
              <p className="text-sm text-[var(--muted)]">
                Enter the code we sent to <strong>{email}</strong>.
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Verification code
                </span>
                <Field
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </label>
              {(localError || fieldError(signUpErrors, "code")) && (
                <p className="text-sm text-[var(--bad)]">
                  {localError ?? fieldError(signUpErrors, "code")}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Verifying…" : "Verify email"}
              </Button>
            </form>
          ) : (
            <form
              className="space-y-3"
              onSubmit={mode === "sign-in" ? onSignIn : onSignUp}
            >
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Email
                </span>
                <Field
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Password
                </span>
                <Field
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  required
                  minLength={8}
                />
              </label>
              {(localError ||
                fieldError(
                  mode === "sign-in" ? signInErrors : signUpErrors,
                  "identifier",
                ) ||
                fieldError(
                  mode === "sign-in" ? signInErrors : signUpErrors,
                  "password",
                ) ||
                fieldError(
                  mode === "sign-in" ? signInErrors : signUpErrors,
                  "email_address",
                )) && (
                <p className="text-sm text-[var(--bad)]">
                  {localError ??
                    fieldError(
                      mode === "sign-in" ? signInErrors : signUpErrors,
                      "identifier",
                    ) ??
                    fieldError(
                      mode === "sign-in" ? signInErrors : signUpErrors,
                      "email_address",
                    ) ??
                    fieldError(
                      mode === "sign-in" ? signInErrors : signUpErrors,
                      "password",
                    )}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy
                  ? mode === "sign-in"
                    ? "Signing in…"
                    : "Creating…"
                  : mode === "sign-in"
                    ? "Sign in"
                    : "Create account"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
