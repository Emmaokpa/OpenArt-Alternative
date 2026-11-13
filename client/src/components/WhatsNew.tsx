import { whatsNewItems } from "@/data/content";
import { LimeBadge, SectionHeader } from "./ui";

export function WhatsNew() {
  return (
    <section className="mt-10">
      <SectionHeader title="What's New?" more={false} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {whatsNewItems.map((item) => (
          <button
            key={item.id}
            className="group relative aspect-[1.78] overflow-hidden rounded-xl border border-white/[0.08] bg-[#141414] text-left transition-all duration-300 hover:border-white/25 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]"
          >
            <img
              src={item.image}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.6)_40%,rgba(0,0,0,0.15)_75%,rgba(0,0,0,0.05))]" />
            <LimeBadge className="absolute right-2 top-2 px-1.5 py-[3px] text-[9.5px] shadow">
              {item.badge}
            </LimeBadge>
            <p className="absolute inset-x-2.5 bottom-2.5 text-[11.5px] font-semibold leading-[1.25] text-white drop-shadow">
              {item.title}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
