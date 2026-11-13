import { MessageCircleQuestion } from "lucide-react";
import { useState } from "react";
import { DirectVideo } from "./components/DirectVideo";
import { Hero } from "./components/Hero";
import { Footer, PopularModels, TrendingTemplates } from "./components/Models";
import { Presets } from "./components/Presets";
import { PromoBanner } from "./components/PromoBanner";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { WhatsNew } from "./components/WhatsNew";

export default function App() {
  const [banner, setBanner] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("home");

  return (
    <div className="flex h-screen flex-col bg-black font-sans text-white">
      {banner && <PromoBanner onClose={() => setBanner(false)} />}

      <div className="flex min-h-0 flex-1 gap-1.5 p-1.5">
        {/* Desktop sidebar */}
        <div className="hidden h-full lg:block">
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
            active={active}
            onNavigate={setActive}
          />
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute bottom-1.5 left-1.5 top-1.5">
              <Sidebar
                collapsed={false}
                onToggle={() => setMobileOpen(false)}
                active={active}
                onNavigate={(id) => {
                  setActive(id);
                  setMobileOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Main */}
        <main className="thin-scrollbar relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl bg-surface">
          {/* Top spotlight glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_52%_58%_at_50%_0%,rgba(255,255,255,0.11),rgba(255,255,255,0.03)_45%,transparent_72%)]" />
          <div className="pointer-events-none absolute left-1/2 top-[110px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,45,138,0.07),transparent)] blur-3xl" />

          <TopBar onMenu={() => setMobileOpen(true)} />

          <div className="relative mx-auto w-full max-w-[1180px] px-4 sm:px-6">
            <Hero />
            <DirectVideo />
            <WhatsNew />
            <Presets />
            <PopularModels />
            <TrendingTemplates />
            <Footer />
          </div>
        </main>
      </div>

      {/* Floating help */}
      <button
        className="fixed bottom-4 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#1a1a1a] text-white/70 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)] transition hover:bg-[#262626] hover:text-white"
        aria-label="Help"
      >
        <MessageCircleQuestion className="h-4 w-4" strokeWidth={1.9} />
      </button>
    </div>
  );
}
