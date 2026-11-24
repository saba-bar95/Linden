export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0f766e" />
      <path
        d="M16 6.2c-.8 3.2-6.2 5.2-6.8 10.4-.5 4.4 2.6 7.8 6.8 9.8 4.2-2 7.3-5.4 6.8-9.8C22.2 11.4 16.8 9.4 16 6.2Z"
        fill="white"
      />
      <path
        d="M16 12.2v12.2"
        stroke="#0f766e"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M16 26.6v3"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
