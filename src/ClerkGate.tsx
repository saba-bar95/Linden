import { useEffect, useState, type ReactNode } from "react";
import { SignIn, UserButton, useAuth } from "@clerk/clerk-react";
import { setAuthTokenGetter } from "./lib/api.ts";

export function ClerkGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
    setReady(true);
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || !ready) {
    return (
      <div className="grid min-h-screen place-items-center text-stone-500">
        Loading…
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="grid min-h-screen place-items-center px-4 py-10">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
              job margin
            </p>
            <h1 className="font-serif text-3xl text-stone-900">
              Estimate vs actual
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Sign in to manage jobs, labor, and margin.
            </p>
          </div>
          <SignIn routing="hash" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed right-4 top-4 z-50">
        <UserButton afterSignOutUrl="/" />
      </div>
      {children}
    </>
  );
}
