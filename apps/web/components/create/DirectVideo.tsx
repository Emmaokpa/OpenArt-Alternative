"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface DirectVideoItem {
  id: string;
  label: string;
  image: string;
  icon: React.ElementType;
  badge?: string;
  highlighted?: boolean;
}

interface DirectVideoProps {
  items: DirectVideoItem[];
  onSelect: (id: string) => void;
  selectedId?: string;
}

function ScrollButton({
  dir,
  onClick,
  disabled,
}: {
  dir: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#1c1c1c] text-white shadow-lg transition hover:bg-[#262626]",
        disabled && "pointer-events-none opacity-0",
        dir === "left" ? "left-1" : "right-0",
      )}
      aria-label={`Scroll ${dir}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function DirectVideo({
  items,
  onSelect,
  selectedId,
}: DirectVideoProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [selected, setSelected] = useState(selectedId ?? items[0]?.id);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    if (!scroller.current) return;
    scroller.current.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(scroller.current);
    return () => {
      scroller.current?.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    scroller.current?.scrollBy({ left: dir * 420, behavior: "smooth" });
  };

  const isSel = (id: string) => id === selected;

  return (
    <section className="mt-12">
      <h2 className="mb-3 flex items-end justify-between">
        Direct Your Video
      </h2>
      <div className="group/row relative">
        <div
          ref={scroller}
          className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth pb-1 pr-6"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelected(item.id);
                  onSelect(item.id);
                }}
                className={cn(
                  "group relative h-[112px] w-[124px] shrink-0 overflow-hidden rounded-xl border bg-[#141414] text-left transition-all duration-300",
                  isSel(item.id)
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
                  <span className="absolute right-1.5 top-1.5 px-1.5 py-[2px] rounded-[4px] bg-lime text-[9px] font-bold text-black shadow">
                    {item.badge}
                  </span>
                )}
                <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] bg-white/15 backdrop-blur-sm">
                    <Icon className="h-2.5 w-2.5 text-white" strokeWidth={2.4} />
                  </span>
                  <span className="truncate text-[11px] font-semibold text-white drop-shadow">
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

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

        <ScrollButton dir="left" onClick={() => scrollBy(-1)} disabled={!canLeft} />
        <ScrollButton dir="right" onClick={() => scrollBy(1)} disabled={!canRight} />
      </div>
    </section>
  );
}
