"use client";

import { Compass, FolderOpen, Home, Plus, Wrench } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const items = [
  { id: "home", label: "Home", icon: Home, href: "/" },
  { id: "inspire", label: "Inspire", icon: Compass, href: "#inspirations" },
] as const;

const rightItems = [
  { id: "tools", label: "Tools", icon: Wrench, href: "#tools" },
  { id: "assets", label: "Assets", icon: FolderOpen, href: "#library" },
] as const;

function DockItem({
  label,
  icon: Icon,
  href,
  active,
}: {
  label: string;
  icon: React.ElementType;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex w-[54px] shrink-0 flex-col items-center gap-1 pt-0.5"
    >
      <span
        className={cn(
          "flex h-[22px] items-center justify-center transition-transform duration-300 active:scale-90",
          active ? "text-lime" : "text-[#b0b4ba]",
        )}
      >
        <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2 : 1.8} />
      </span>
      <span
        className={cn(
          "w-full text-center text-[10.5px] font-medium leading-4 tracking-[0.07px]",
          active ? "text-lime" : "text-[#b0b4ba]",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function MobileDock({ active = "home" }: { active?: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative border-t border-[#2e2e2e] bg-[#1b1d1f]">
        {/* top inner highlight, like the real dock */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(255,255,255,0.06),transparent_70%)]" />

        <div className="relative flex h-[62px] items-start justify-between px-4 pt-2">
          {items.map((item) => (
            <DockItem key={item.id} {...item} active={active === item.id} />
          ))}

          {/* raised create button */}
          <div className="relative -mt-[26px] flex w-[54px] shrink-0 flex-col items-center gap-[3px]">
            <button
              aria-label="Create"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(180deg,#c6ff4d,#a3f500)] text-[#101314] shadow-[0_10px_26px_-8px_rgba(170,255,0,0.75),inset_0_1px_0_rgba(255,255,255,0.55)] ring-[6px] ring-page transition-transform duration-300 active:scale-95"
            >
              <Plus className="h-[22px] w-[22px]" strokeWidth={2.6} />
            </button>
            <span className="w-full text-center text-[10.5px] font-medium leading-4 tracking-[0.07px] text-[#b0b4ba]">
              Create
            </span>
          </div>

          {rightItems.map((item) => (
            <DockItem key={item.id} {...item} active={active === item.id} />
          ))}
        </div>
      </div>
    </nav>
  );
}
