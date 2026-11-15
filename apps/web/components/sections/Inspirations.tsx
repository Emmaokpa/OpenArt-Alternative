"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { inspirations } from "@/data/content";
import { SectionHeader } from "@/components/ui";

const ALL = "all";

export function Inspirations() {
  const [active, setActive] = useState<string>(ALL);

  const visible =
    active === ALL ? inspirations : inspirations.filter((c) => c.id === active);

  return (
    <section id="inspirations" className="mt-10 flex w-full scroll-mt-20 flex-col items-center gap-3">
      <div className="sticky top-[52px] z-20 -mx-2 flex w-full flex-col gap-2 bg-page px-2 pb-2 pt-1 md:mx-0 md:px-0">
        <SectionHeader title="Inspirations" />

        {/* Category tabs */}
        <div className="no-scrollbar flex w-full items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
          <button
            onClick={() => setActive(ALL)}
            className={cn(
              "h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold leading-4 transition-colors duration-150",
              active === ALL
                ? "bg-white text-[#0b0c0c] shadow-[inset_0px_1px_0px_0px_#ffffff]"
                : "bg-[linear-gradient(180deg,rgba(214,225,255,0.04),rgba(214,225,255,0.08))] text-white/70 shadow-[inset_0px_1px_0px_0px_rgba(211,237,248,0.11)] hover:bg-white/[0.1] hover:text-white",
            )}
          >
            All
          </button>
          {inspirations.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className={cn(
                "h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold leading-4 transition-colors duration-150",
                active === cat.id
                  ? "bg-white text-[#0b0c0c] shadow-[inset_0px_1px_0px_0px_#ffffff]"
                  : "bg-[linear-gradient(180deg,rgba(214,225,255,0.04),rgba(214,225,255,0.08))] text-white/70 shadow-[inset_0px_1px_0px_0px_rgba(211,237,248,0.11)] hover:bg-white/[0.1] hover:text-white",
              )}
            >
              {cat.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col gap-8 pt-1">
        {visible.map((cat) => (
          <div key={cat.id} className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-6 px-1">
              <div className="min-w-0">
                <h3 className="font-display text-[18px] font-bold leading-[26px] tracking-[-0.36px] text-white md:text-[20px] md:tracking-[-0.4px]">
                  {cat.title}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-[13px] leading-[18px] text-[rgba(214,225,255,0.4)]">
                  {cat.description}
                </p>
              </div>
              <button className="flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-[#b0b4ba] transition hover:text-white md:font-display md:text-[14px] md:font-semibold">
                See all <span className="font-sans">→</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {cat.images.map((src, i) => (
                <button
                  key={`${cat.id}-${i}`}
                  className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#141515] ring-1 ring-white/[0.06] transition-all duration-300 hover:ring-white/25"
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.45),transparent_55%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
