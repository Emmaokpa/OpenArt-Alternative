import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

/* OpenArt-style logo mark: white rounded square with a looping black mark */
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

export function LimeBadge({ children, className }: { children: ReactNode; className?: string }) {
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

export function SoftBadge({ children, className }: { children: ReactNode; className?: string }) {
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
  action?: ReactNode;
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
