"use client";

import { Heart, Play } from "lucide-react";
import { presets } from "@/data/content";
import type { PresetItem } from "@/data/content";
import { SectionHeader } from "@/components/ui";

function PresetTile({ item, index }: { item: PresetItem; index: number }) {
  const likes = [12.4, 8.9, 21.3, 5.6, 17.2, 9.8, 33.1, 4.7, 11.5, 6.3][index % 10];

  return (
    <button
      className="group relative w-full overflow-hidden rounded-2xl bg-[#141515] text-left ring-1 ring-white/[0.06] transition-all duration-300 hover:ring-white/25"
      style={{ aspectRatio: item.aspect }}
    >
      <img
        src={item.image}
        alt={item.title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.28)_38%,transparent_65%)]" />

      <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 scale-90 items-center justify-center rounded-full bg-white/20 opacity-0 ring-1 ring-white/30 backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
        <Play className="ml-0.5 h-4 w-4 text-white" fill="currentColor" />
      </span>

      <span className="absolute right-2 top-2 flex h-6 translate-y-[-4px] items-center gap-1 rounded-full bg-black/55 px-2 text-[10.5px] font-medium text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <Heart className="h-3 w-3" />
        {likes}k
      </span>

      <span className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-1.5">
        <span className="truncate text-[12px] font-medium leading-4 text-white drop-shadow">
          {item.title}
        </span>
        <span className="ml-auto flex shrink-0 translate-y-1 items-center gap-1 rounded-full bg-white/15 px-1.5 py-[2px] text-[9.5px] font-medium text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="h-1 w-1 rounded-full bg-lime" />
          {item.model}
        </span>
      </span>
    </button>
  );
}

export function PresetGrid({ items = presets }: { items?: PresetItem[] }) {
  const columns: PresetItem[][] = Array.from({ length: 5 }, () => []);
  items.forEach((item, i) => {
    const col = columns[i % 5];
    if (col) col.push(item);
  });

  return (
    <section className="mt-10 flex w-full flex-col items-center gap-3">
      <SectionHeader title="Viral Seedance 2.5 Presets" />
      <div className="relative w-full pb-3">
        <div className="preset-fade grid max-h-[420px] grid-cols-2 gap-2 overflow-hidden sm:max-h-[560px] sm:grid-cols-3 lg:grid-cols-5">
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-2">
              {col.map((item) => (
                <PresetTile
                  key={item.id}
                  item={item}
                  index={items.findIndex((p) => p.id === item.id)}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-1">
          <button className="pointer-events-auto h-9 rounded-full bg-white px-4 text-[13px] font-semibold text-[#0b0c0c] shadow-[0_8px_28px_-6px_rgba(0,0,0,0.65)] transition hover:bg-white/90 active:scale-[0.98]">
            View All
          </button>
        </div>
      </div>
    </section>
  );
}
