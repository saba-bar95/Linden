import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClerk, useUser } from "@clerk/react";
import { Button } from "./ui.tsx";

export function AccountMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onReposition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const label =
    user?.primaryEmailAddress?.emailAddress ??
    user?.fullName ??
    user?.username ??
    "Account";
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <div className="relative z-[80]">
      <button
        ref={buttonRef}
        type="button"
        className="jm-btn jm-btn-secondary !gap-2 !rounded-full !p-1.5 sm:!py-1.5 sm:!pl-1.5 sm:!pr-3"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-ink)]">
          {initials}
        </span>
        <span className="hidden max-w-36 truncate text-sm sm:inline">
          {label}
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="jm-fade-up fixed z-[9999] w-56 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-[0_22px_50px_-20px_rgba(16,24,32,0.55)]"
            style={{ top: pos.top, right: pos.right }}
          >
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
                role="menuitem"
                onClick={() => void signOut({ redirectUrl: "/" })}
              >
                Sign out
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
