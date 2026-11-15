"use client";

import { models } from "@/data/content";
import type { ModelItem } from "@/data/content";
import { SectionHeader } from "@/components/ui";

export function ModelRail({ items = models }: { items?: ModelItem[] }) {
  return (
    <section className="mt-10 flex w-full flex-col items-center gap-3">
      <SectionHeader title="Latest AI Models" />
      <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((model) => (
          <button key={model.id} className="group flex cursor-pointer flex-col gap-2 text-left">
            <div className="relative aspect-[441/248] w-full overflow-hidden rounded-2xl bg-[#141515] ring-1 ring-white/[0.06] transition-all duration-300 group-hover:ring-white/25">
              <img
                src={model.image}
                alt={model.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.35),transparent_60%)] opacity-70" />
            </div>
            <div className="px-0.5">
              <p className="font-display text-[16px] font-semibold leading-[22px] tracking-[-0.24px] text-white md:text-[18px] md:leading-6 md:tracking-[-0.32px]">
                {model.name}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[13px] leading-[18px] text-[rgba(214,225,255,0.4)]">
                {model.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
