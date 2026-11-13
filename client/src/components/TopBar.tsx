import { Bell, ChevronDown, Gem, HelpCircle, Menu, ShoppingBag } from "lucide-react";
import { Avatar } from "./ui";

export function TopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between bg-[linear-gradient(to_bottom,rgba(10,10,10,0.92),rgba(10,10,10,0.55))] px-3 backdrop-blur-md sm:px-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenu}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <button className="flex h-8 items-center gap-2 rounded-lg px-2 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.06] hover:text-white">
          <Avatar className="h-4 w-4" />
          <span className="hidden truncate sm:inline">Emmanuel Okpa's workspace</span>
          <span className="sm:hidden">Workspace</span>
          <ChevronDown className="h-3.5 w-3.5 text-white/50" />
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button className="hidden h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white md:flex">
          Follow us
          <ChevronDown className="h-3.5 w-3.5 text-white/50" />
        </button>
        <button className="hidden h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/[0.06] hover:text-white md:flex">
          <HelpCircle className="h-4 w-4" strokeWidth={1.8} />
        </button>
        <button className="relative hidden h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/[0.06] hover:text-white md:flex">
          <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-[#0a0a0a]" />
        </button>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/[0.06] hover:text-white sm:hidden">
          <Bell className="h-4 w-4" strokeWidth={1.8} />
        </button>
        <span className="mx-1 hidden h-4 w-px bg-white/10 md:block" />
        <button className="hidden h-8 items-center rounded-lg px-2 text-[12px] font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white md:flex">
          Enterprise
        </button>

        {/* Credits + Upgrade pill */}
        <div className="flex h-8 items-center gap-1 rounded-full border border-emerald-500/30 bg-[#0f1a12] py-[3px] pl-2.5 pr-[3px]">
          <Gem className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.2} />
          <span className="text-[12px] font-semibold text-emerald-300">40</span>
          <span className="ml-0.5 h-3.5 w-3.5 rounded-full border border-emerald-500/40 text-center text-[8px] font-bold leading-[12px] text-emerald-300/70">
            ?
          </span>
          <button className="ml-1 h-[26px] rounded-full bg-[linear-gradient(180deg,#34d399,#10b981)] px-3 text-[11.5px] font-semibold text-black shadow-[0_0_14px_-2px_rgba(52,211,153,0.6)] transition hover:brightness-110">
            Upgrade
          </button>
        </div>

        <button className="ml-1 flex h-8 w-8 items-center justify-center rounded-full transition hover:ring-2 hover:ring-white/15">
          <Avatar className="h-6 w-6" />
        </button>
      </div>
    </header>
  );
}
