"use client";

import { MessageCircleQuestion } from "lucide-react";
import { useState } from "react";
import { PromoBanner } from "@/components/shell/PromoBanner";
import { MobileDock } from "@/components/shell/MobileDock";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";

export interface AppShellProps {
  children: React.ReactNode;
  active?: string;
}

export function AppShell({ children, active = "home" }: AppShellProps) {
  const [banner, setBanner] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-page text-white">
      {banner && <PromoBanner onClose={() => setBanner(false)} />}

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        {/* Desktop sidebar */}
        <div className="hidden h-full shrink-0 lg:block">
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
            active={active}
            onNavigate={() => {}}
          />
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute bottom-3 left-3 top-3">
              <Sidebar
                collapsed={false}
                onToggle={() => setMobileOpen(false)}
                active={active}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main */}
        <main className="thin-scrollbar relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-2xl bg-page">
          {/* Soft top spotlight, like the real home */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(ellipse_46%_52%_at_50%_0%,rgba(255,255,255,0.085),rgba(255,255,255,0.025)_45%,transparent_72%)]" />

          <TopBar onMenu={() => setMobileOpen(true)} />

          <div className="relative mx-auto w-full max-w-[1800px] px-2 pb-28 md:px-1 lg:pb-16">
            {children}
          </div>
        </main>
      </div>

      <MobileDock active={active} />

      {/* Floating help */}
      <button
        className="fixed bottom-5 right-5 z-40 hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#161718] text-white/60 shadow-[0_10px_28px_-10px_rgba(0,0,0,0.9)] transition hover:bg-[#222423] hover:text-white lg:flex"
        aria-label="Help"
      >
        <MessageCircleQuestion className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </button>
    </div>
  );
}
