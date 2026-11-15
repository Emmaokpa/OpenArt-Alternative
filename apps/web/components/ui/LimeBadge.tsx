"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function LimeBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] bg-lime px-1.5 py-[2px] text-[9px] font-bold leading-none text-black",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SoftBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] bg-white/10 px-1.5 py-[2px] text-[9px] font-semibold leading-none text-white/70",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  more = true,
  subtitle,
  action,
}: {
  title: string;
  more?: boolean;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 className="text-[17px] font-bold tracking-[-0.01em] text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-white/45">{subtitle}</p>}
      </div>
      {action ??
        (more && (
          <button className="group flex items-center gap-1 text-[12px] font-medium text-white/70 transition-colors hover:text-white">
            More
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
    </div>
  );
}
