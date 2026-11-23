import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import { Button } from "./ui.tsx";

export function AccountMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label =
    user?.primaryEmailAddress?.emailAddress ??
    user?.fullName ??
    user?.username ??
    "Account";
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        className="jm-btn jm-btn-secondary !gap-2 !rounded-full !py-1.5 !pl-1.5 !pr-3"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-ink)]">
          {initials}
        </span>
        <span className="hidden max-w-36 truncate text-sm sm:inline">
          {label}
        </span>
      </button>
      {open && (
        <div className="jm-fade-up absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-[var(--shadow)]">
          <div className="border-b border-[var(--line)] px-3 py-3">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">
              {user?.fullName || "Signed in"}
            </p>
            <p className="truncate text-xs text-[var(--muted)]">{label}</p>
          </div>
          <div className="p-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full !justify-start"
              onClick={() => void signOut({ redirectUrl: "/" })}
            >
              Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
