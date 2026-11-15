"use client";

import { cn } from "@/lib/cn";

export function Avatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full bg-[conic-gradient(from_210deg,#aaff00,#16d866,#38bdf8,#a855f7,#aaff00)] ring-1 ring-white/20",
        className,
      )}
    />
  );
}
