import { useState, type FormEvent } from "react";
import { useSignIn, useSignUp } from "@clerk/react";
import { Button, Field } from "./components/ui.tsx";

type Mode = "sign-in" | "sign-up" | "verify";

function fieldError(errors: unknown, key: string): string | undefined {
  const fields = (errors as { fields?: Record<string, { message?: string }> } | null)
    ?.fields;
  return fields?.[key]?.message;
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C36.9 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
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

  async function signInWithGoogle() {
    setLocalError(null);
    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/",
    });
    if (error) {
      setLocalError(error.message ?? "Google sign-in failed");
    }
  }

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

          {mode !== "verify" && (
            <div className="mb-5 space-y-3">
              <Button
                type="button"
                variant="secondary"
                className="w-full !gap-2"
                disabled={busy}
                onClick={() => void signInWithGoogle()}
              >
                <GoogleMark />
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <span className="h-px flex-1 bg-[var(--line)]" />
                or email
                <span className="h-px flex-1 bg-[var(--line)]" />
              </div>
            </div>
          )}

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
