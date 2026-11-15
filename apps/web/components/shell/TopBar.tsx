"use client";

import {
  ChevronDown,
  Download,
  Gift,
  HelpCircle,
  Menu,
  ShoppingBag,
} from "lucide-react";
import { Avatar } from "@/components/ui";

export interface TopBarProps {
  onMenu: () => void;
}

function TopLink({ children }: { children: React.ReactNode }) {
  return (
    <button className="hidden h-8 items-center rounded-full px-2.5 text-[12.5px] font-normal text-[#b0b4ba] transition hover:bg-white/[0.06] hover:text-white lg:flex">
      {children}
    </button>
  );
}

export function TopBar({ onMenu }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[52px] w-full items-center justify-between gap-3 bg-[linear-gradient(to_bottom,rgba(9,10,10,0.98)_0%,rgba(9,10,10,0.94)_78%,rgba(9,10,10,0.55)_100%)] px-3 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          onClick={onMenu}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <button className="flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-2 text-[12.5px] font-medium text-white/90 transition hover:bg-white/[0.06]">
          <Avatar className="h-6 w-6" />
          <span className="hidden truncate sm:inline">Emmanuel Okpa&apos;s workspace</span>
          <span className="truncate sm:hidden">Workspace</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/45" strokeWidth={2.2} />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button className="hidden h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] text-[#b0b4ba] transition hover:bg-white/[0.06] hover:text-white xl:flex">
          <Download className="h-3.5 w-3.5" strokeWidth={1.9} />
          Download for macOS
        </button>
        <TopLink>Follow us</TopLink>
        <TopLink>Enterprise</TopLink>

        <button
          className="hidden h-8 w-8 items-center justify-center rounded-full text-[#b0b4ba] transition hover:bg-white/[0.06] hover:text-white sm:flex"
          aria-label="Rewards"
        >
          <Gift className="h-[17px] w-[17px]" strokeWidth={1.8} />
        </button>
        <button
          className="hidden h-8 w-8 items-center justify-center rounded-full text-[#b0b4ba] transition hover:bg-white/[0.06] hover:text-white sm:flex"
          aria-label="Help"
        >
          <HelpCircle className="h-[17px] w-[17px]" strokeWidth={1.8} />
        </button>
        <button
          className="relative hidden h-8 w-8 items-center justify-center rounded-full text-[#b0b4ba] transition hover:bg-white/[0.06] hover:text-white sm:flex"
          aria-label="Store"
        >
          <ShoppingBag className="h-[17px] w-[17px]" strokeWidth={1.8} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-lime ring-2 ring-page" />
        </button>

        {/* Credits + Upgrade */}
        <div className="ml-1 flex h-8 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] py-[3px] pl-3 pr-[3px]">
          <span className="text-[12px] font-semibold tabular-nums text-white">40</span>
          <span className="hidden text-[11px] text-dim sm:inline">credits</span>
          <button className="h-[24px] rounded-full bg-green px-2.5 text-[11px] font-medium leading-none text-[#0c130d] transition hover:brightness-110">
            Upgrade
          </button>
        </div>

        <button
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full transition hover:ring-2 hover:ring-white/15"
          aria-label="Account"
        >
          <Avatar className="h-7 w-7" />
        </button>
      </div>
    </header>
  );
}
