import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { directVideoItems } from "@/data/content";
import { LimeBadge, SectionHeader } from "./ui";

export function DirectVideo() {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [selected, setSelected] = useState("launch");

  const update = () => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    scroller.current?.scrollBy({ left: dir * 420, behavior: "smooth" });
  };

  return (
    <section className="mt-12">
      <SectionHeader title="Direct Your Video" />
      <div className="group/row relative">
        <div
          ref={scroller}
          className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth pb-1 pr-6"
        >
          {directVideoItems.map((item) => {
            const isSel = selected === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={cn(
                  "group relative h-[112px] w-[124px] shrink-0 overflow-hidden rounded-xl border bg-[#141414] text-left transition-all duration-300",
                  isSel
                    ? "border-brand-pink shadow-[0_0_0_1px_rgba(255,45,138,0.35),0_8px_30px_-10px_rgba(255,45,138,0.45)]"
                    : "border-white/[0.08] hover:border-white/25 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.9)]",
                )}
              >
                <img
                  src={item.image}
                  alt={item.label}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.55)_30%,rgba(0,0,0,0.05)_60%,transparent)]" />
                {item.badge && (
                  <LimeBadge className="absolute right-1.5 top-1.5 shadow">{item.badge}</LimeBadge>
                )}
                <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] bg-white/15 backdrop-blur-sm">
                    <item.icon className="h-2.5 w-2.5 text-white" strokeWidth={2.4} />
                  </span>
                  <span className="truncate text-[11px] font-semibold text-white drop-shadow">
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Edge fades */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-20 bg-[linear-gradient(to_left,#0a0a0a,transparent)] transition-opacity",
            !canRight && "opacity-0",
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-12 bg-[linear-gradient(to_right,#0a0a0a,transparent)] transition-opacity",
            !canLeft && "opacity-0",
          )}
        />

        {/* Arrows */}
        <button
          onClick={() => scrollBy(-1)}
          className={cn(
            "absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#1c1c1c] text-white shadow-lg transition hover:bg-[#262626]",
            !canLeft && "pointer-events-none opacity-0",
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => scrollBy(1)}
          className={cn(
            "absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#1c1c1c] text-white shadow-lg transition hover:bg-[#262626]",
            !canRight && "pointer-events-none opacity-0",
          )}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
