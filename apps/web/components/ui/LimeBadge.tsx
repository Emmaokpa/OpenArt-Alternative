"use client";

import { cn } from "@/lib/cn";

export function LimeBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[4px] bg-lime px-1.5 py-[3px] text-[10px] font-extrabold uppercase leading-[12px] tracking-[0.02em] text-[#111113]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SoftBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[4px] bg-white/10 px-1.5 py-[3px] text-[10px] font-semibold leading-[12px] text-white/70",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The real OpenArt section header: 24px Bricolage title + 15px "More →" */
export function SectionHeader({
  title,
  more = true,
  moreLabel = "More",
  subtitle,
  action,
}: {
  title: string;
  more?: boolean;
  moreLabel?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-[44px] w-full items-center gap-12 px-1 md:h-12">
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h2 className="truncate font-display text-[18px] font-bold leading-[22px] tracking-[-0.24px] text-white md:text-[24px] md:leading-7 md:tracking-[-0.48px]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-[13px] leading-4 text-dim">{subtitle}</p>
        )}
      </div>
      {action ??
        (more && (
          <button
            type="button"
            className="flex shrink-0 cursor-pointer items-center whitespace-nowrap text-[13px] font-medium leading-4 text-[#b0b4ba] transition-[color,opacity] duration-200 hover:text-white hover:underline active:opacity-80 md:font-display md:text-[15px] md:font-semibold md:tracking-[-0.12px]"
          >
            {moreLabel} <span className="ml-1 font-sans">→</span>
          </button>
        ))}
    </div>
  );
}
