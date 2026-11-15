"use client";

import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { LimeBadge, SectionHeader } from "@/components/ui";

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
        "absolute top-[38%] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#1b1c1d]/95 text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.9)] backdrop-blur transition hover:bg-[#24262a]",
        disabled && "pointer-events-none opacity-0",
        dir === "left" ? "left-1" : "right-0",
      )}
      aria-label={`Scroll ${dir}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
    </button>
  );
}

export function DirectVideo({ items, onSelect, selectedId }: DirectVideoProps) {
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
    scroller.current?.scrollBy({ left: dir * 560, behavior: "smooth" });
  };

  return (
    <section className="mt-10 flex w-full flex-col items-center gap-3">
      <SectionHeader title="Direct Your Videos" moreLabel="More" />
      <div className="group/row relative w-full">
        <div ref={scroller} className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-1 pr-4">
          {items.map((item) => {
            const Icon = item.icon;
            const isSel = item.id === selected;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelected(item.id);
                  onSelect(item.id);
                }}
                className="group flex w-[176px] shrink-0 flex-col gap-2 text-left"
              >
                <div
                  className={cn(
                    "relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#141515] transition-all duration-300",
                    isSel
                      ? "ring-2 ring-lime ring-offset-2 ring-offset-page"
                      : "ring-1 ring-white/[0.07] group-hover:ring-white/25",
                  )}
                >
                  <img
                    src={item.image}
                    alt={item.label}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.45),transparent_55%)] opacity-80" />
                  {item.badge && (
                    <LimeBadge className="absolute left-2 top-2 shadow-sm">{item.badge}</LimeBadge>
                  )}
                  <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
                    <Play className="ml-0.5 h-3 w-3" fill="currentColor" />
                  </span>
                </div>
                <span className="flex items-center gap-1.5 px-0.5">
                  <Icon
                    className={cn(
                      "h-[15px] w-[15px] shrink-0",
                      isSel ? "text-lime" : "text-[#b0b4ba]",
                    )}
                    strokeWidth={1.9}
                  />
                  <span
                    className={cn(
                      "truncate text-[13px] leading-4",
                      isSel ? "font-medium text-white" : "text-[#d6e1ff]/80",
                    )}
                  >
                    {item.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-24 bg-[linear-gradient(to_left,#090a0a,transparent)] transition-opacity",
            !canRight && "opacity-0",
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-16 bg-[linear-gradient(to_right,#090a0a,transparent)] transition-opacity",
            !canLeft && "opacity-0",
          )}
        />

        <ScrollButton dir="left" onClick={() => scrollBy(-1)} disabled={!canLeft} />
        <ScrollButton dir="right" onClick={() => scrollBy(1)} disabled={!canRight} />
      </div>
    </section>
  );
}
