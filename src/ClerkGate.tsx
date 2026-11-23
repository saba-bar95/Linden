import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-react";
import { setAuthToken } from "./lib/api.ts";

export function ClerkGate({ children }: { children: ReactNode }) {
  const { isLoaded, getToken } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      if (!isLoaded) return;
      const token = await getToken();
      if (!cancelled) {
        setAuthToken(token);
        setReady(true);
      }
    }
    void sync();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, getToken]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-stone-500">
        Loading…
      </div>
    );
  }

  return children;
}
