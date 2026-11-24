import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { AuthScreen } from "./AuthScreen.tsx";
import { setAuthTokenGetter } from "./lib/api.ts";

export function ClerkGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      setAuthTokenGetter(async () => {
        try {
          return await getToken();
        } catch {
          return null;
        }
      });
    } else {
      setAuthTokenGetter(null);
    }
    setReady(true);
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || !ready) {
    return (
      <div className="grid min-h-screen place-items-center text-[var(--muted)]">
        <p className="jm-fade-up text-sm font-medium tracking-wide">
          Loading Linden…
        </p>
      </div>
    );
  }

  // OAuth return path must render even before a session exists.
  if (!isSignedIn && location.pathname !== "/sso-callback") {
    return <AuthScreen />;
  }

  return children;
}
