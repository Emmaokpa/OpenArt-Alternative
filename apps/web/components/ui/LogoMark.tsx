"use client";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="white" />
      <path
        d="M9 16c0-2.6 1.9-4.3 4.1-4.3 3.8 0 4.8 8.6 8.8 8.6 2.3 0 3.6-1.7 3.6-4.3s-1.3-4.3-3.6-4.3c-4 0-5 8.6-8.8 8.6C10.9 20.3 9 18.6 9 16z"
        fill="none"
        stroke="black"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
