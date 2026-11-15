"use client";

import { cn } from "@/lib/cn";

export function Avatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full bg-[conic-gradient(from_210deg,#f59e0b,#ec4899,#8b5cf6,#06b6d4,#f59e0b)] ring-1 ring-white/20",
        className,
      )}
    />
  );
}
