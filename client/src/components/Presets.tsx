import { Heart, Play } from "lucide-react";
import { presetColumns, type PresetItem } from "@/data/content";
import { SectionHeader } from "./ui";

function PresetTile({ item }: { item: PresetItem }) {
  return (
    <button
      className="group relative w-full overflow-hidden rounded-xl bg-[#141414] text-left ring-1 ring-white/[0.06] transition-all duration-300 hover:ring-white/25"
      style={{ aspectRatio: item.aspect }}
    >
      <img
        src={item.image}
        alt={item.title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.15)_35%,transparent_60%)] opacity-90 transition-opacity group-hover:opacity-100" />

      {/* Hover play */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-100 scale-90">
          <Play className="ml-0.5 h-4 w-4 text-white" fill="white" />
        </span>
      </div>

      {/* Top-right hover actions */}
      <div className="absolute right-2 top-2 flex translate-y-[-4px] items-center gap-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <span className="flex h-6 items-center gap-1 rounded-md bg-black/50 px-1.5 text-[10px] font-semibold text-white backdrop-blur">
          <Heart className="h-3 w-3" />
          {item.likes}
        </span>
        <span className="flex h-6 items-center rounded-md bg-white px-2 text-[10px] font-semibold text-black">
          Use
        </span>
      </div>

      <p className="absolute bottom-2 left-2.5 right-2 truncate text-[11px] font-medium text-white drop-shadow">
        {item.title}
      </p>
    </button>
  );
}

export function Presets() {
  return (
    <section className="mt-10">
      <SectionHeader title="Viral Seedance 2.5 Presets" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {presetColumns.map((col, i) => (
          <div key={i} className="flex flex-col gap-2">
            {col.map((item) => (
              <PresetTile key={item.id} item={item} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <button className="h-8 rounded-full border border-white/10 bg-white/[0.03] px-4 text-[12px] font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white">
          Show more presets
        </button>
      </div>
    </section>
  );
}
