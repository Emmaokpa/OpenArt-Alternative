"use client";

import { whatsNewItems } from "@/data/content";
import { LimeBadge, SectionHeader } from "@/components/ui";
import type { NewsItem } from "@/data/content";

export function WhatsNew({ items = whatsNewItems }: { items?: NewsItem[] }) {
  return (
    <section className="mt-10 flex w-full flex-col items-center gap-3">
      <SectionHeader title="What's New?" more={false} />
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <button
            key={item.id}
            className="group relative aspect-[1.62] overflow-hidden rounded-2xl bg-[#141515] text-left ring-1 ring-white/[0.06] transition-all duration-300 hover:ring-white/25"
          >
            <img
              src={item.image}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.62)_38%,rgba(0,0,0,0.18)_72%,rgba(0,0,0,0.08))]" />
            <LimeBadge className="absolute left-2 top-2 shadow-sm">{item.badge}</LimeBadge>
            <p className="absolute inset-x-2.5 bottom-2.5 text-[12px] font-semibold leading-[1.3] text-white drop-shadow">
              {item.title}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
