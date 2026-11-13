import { Flame, Gem, Play, Zap } from "lucide-react";
import { cn } from "@/utils/cn";
import { popularModels, trendingTemplates } from "@/data/content";
import { LimeBadge, SectionHeader, SoftBadge } from "./ui";

export function PopularModels() {
  return (
    <section className="mt-12">
      <SectionHeader
        title="Popular Video Models"
        subtitle="The best models, all in one place — pick the right one for every shot."
      />
      <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2">
        {popularModels.map((m) => (
          <button
            key={m.id}
            className="group w-[216px] shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111] text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_14px_40px_-16px_rgba(0,0,0,0.9)]"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={m.image}
                alt={m.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(17,17,17,1)_0%,rgba(17,17,17,0.1)_45%,transparent)]" />
              {m.tag && (
                <div className="absolute left-2 top-2">
                  {m.tag === "New" ? (
                    <LimeBadge>NEW</LimeBadge>
                  ) : (
                    <SoftBadge
                      className={cn(
                        "gap-1 bg-black/60 text-white backdrop-blur",
                        m.tag === "Hot" && "text-orange-300",
                        m.tag === "Fast" && "text-sky-300",
                      )}
                    >
                      {m.tag === "Hot" ? (
                        <Flame className="h-2.5 w-2.5" strokeWidth={2.5} />
                      ) : (
                        <Zap className="h-2.5 w-2.5" strokeWidth={2.5} />
                      )}
                      {m.tag.toUpperCase()}
                    </SoftBadge>
                  )}
                </div>
              )}
              <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <Play className="ml-0.5 h-3.5 w-3.5 text-white" fill="white" />
              </span>
            </div>
            <div className="relative z-10 -mt-2 px-3 pb-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-white">{m.name}</p>
                <span className="flex items-center gap-0.5 text-[10.5px] font-medium text-emerald-300">
                  <Gem className="h-3 w-3" strokeWidth={2.2} />
                  {m.credits}
                </span>
              </div>
              <p className="text-[10.5px] text-white/45">{m.provider}</p>
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-white/60">
                {m.description}
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10.5px] text-white/40">
                  <Zap className="h-3 w-3" />
                  Up to 1080p · 10s
                </span>
                <span className="rounded-md bg-white/[0.08] px-2 py-1 text-[10.5px] font-semibold text-white transition group-hover:bg-white group-hover:text-black">
                  Try
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function TrendingTemplates() {
  return (
    <section className="mt-10">
      <SectionHeader title="Trending Templates" />
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {trendingTemplates.map((t) => (
          <button
            key={t.id}
            className="group relative aspect-[3/4] w-[150px] shrink-0 overflow-hidden rounded-xl bg-[#141414] text-left ring-1 ring-white/[0.06] transition-all duration-300 hover:ring-white/25"
          >
            <img
              src={t.image}
              alt={t.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.25)_40%,transparent_65%)]" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md ring-1 ring-white/30">
                <Play className="ml-0.5 h-3.5 w-3.5 text-white" fill="white" />
              </span>
            </div>
            <div className="absolute inset-x-2.5 bottom-2.5">
              <p className="truncate text-[12px] font-semibold text-white">{t.title}</p>
              <p className="mt-0.5 flex items-center justify-between text-[10px] text-white/55">
                <span>@{t.author}</span>
                <span>{t.uses} uses</span>
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  const links = [
    "About",
    "Pricing",
    "API",
    "Affiliates",
    "Blog",
    "Terms",
    "Privacy",
    "Discord",
    "X",
  ];
  return (
    <footer className="mt-16 border-t border-white/[0.06] pb-10 pt-6">
      <div className="flex flex-col items-start justify-between gap-3 text-[11.5px] text-white/40 sm:flex-row sm:items-center">
        <p>© 2026 OpenArt. Crafted for creators.</p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {links.map((l) => (
            <a key={l} href="#" className="transition hover:text-white/80">
              {l}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
