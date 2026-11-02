/** Sama dengan favicon di src/app/icon.svg. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={`rounded-[6px] dark:ring-1 dark:ring-white/15 ${className}`}>
      <rect width="64" height="64" rx="14" fill="#1d1d1f" />
      <g fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 22v8M32 30c0 6-10 4-10 10M32 30c0 6 10 4 10 10" />
      </g>
      <circle cx="32" cy="18" r="5" fill="#fff" />
      <circle cx="22" cy="44" r="5" fill="#8e8e93" />
      <circle cx="42" cy="44" r="5" fill="#0a84ff" />
    </svg>
  );
}
