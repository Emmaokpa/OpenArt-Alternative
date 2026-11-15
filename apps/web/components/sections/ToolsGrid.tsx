"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { tools } from "@/data/content";
import type { ToolItem } from "@/data/content";
import { LimeBadge, SectionHeader } from "@/components/ui";

const GAP = 12;
const AUTOPLAY_MS = 2000;
const SLIDE_MS = 760;

function splitDescription(tool: ToolItem) {
  if (!tool.highlight) return { before: tool.description, accent: "", after: "" };
  const at = tool.description.indexOf(tool.highlight);
  if (at < 0) return { before: tool.description, accent: "", after: "" };
  return {
    before: tool.description.slice(0, at),
    accent: tool.highlight,
    after: tool.description.slice(at + tool.highlight.length),
  };
}

function ToolCard({
  tool,
  active = false,
  eager = false,
  className,
  style,
}: {
  tool: ToolItem;
  active?: boolean;
  eager?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = tool.icon;
  const { before, accent, after } = splitDescription(tool);

  return (
    <button
      style={style}
      className={cn(
        "group relative isolate flex items-center gap-3.5 overflow-hidden rounded-2xl border p-3 text-left transition-[background-color,border-color,transform,box-shadow] duration-500",
        active
          ? "border-lime/30 bg-[#12140f] shadow-[0_18px_40px_-24px_rgba(170,255,0,0.55)]"
          : "border-white/[0.06] bg-[#0f1011] hover:border-white/[0.16] hover:bg-[#151718] hover:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)]",
        eager && "animate-fade-up",
        className,
      )}
    >
      {/* soft colour glow, tinted per tool */}
      <span
        className={cn(
          "pointer-events-none absolute -right-12 -top-14 -z-10 h-36 w-36 rounded-full bg-gradient-to-br opacity-50 blur-2xl transition-opacity duration-700 group-hover:opacity-90",
          tool.tint,
        )}
      />

      {/* one-shot sheen sweep on hover */}
      <span className="pointer-events-none absolute inset-0 -z-10 -translate-x-[130%] skew-x-[-12deg] bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.07)_50%,transparent_62%)] transition-transform duration-[1100ms] ease-out group-hover:translate-x-[130%]" />

      <span
        className={cn(
          "relative flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-inset ring-white/[0.09] transition-transform duration-500 ease-out group-hover:-rotate-3 group-hover:scale-[1.06]",
          tool.tint,
        )}
      >
        <Icon className="h-6 w-6 text-white/90" strokeWidth={1.6} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-display text-[16px] font-bold leading-5 tracking-[-0.16px] text-white">
            {tool.title}
          </span>
          {tool.isNew && (
            <LimeBadge className="px-1 py-0 text-[8.5px] leading-[12px]">New</LimeBadge>
          )}
        </span>
        <span className="mt-1 block text-[12.5px] leading-[18px] text-[rgba(214,225,255,0.5)]">
          {before}
          {accent && (
            <span className="font-medium text-[rgba(238,244,255,0.86)]">{accent}</span>
          )}
          {after}
        </span>
      </span>

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))] text-white/70 shadow-[0_4px_10px_rgba(0,0,0,0.45)] transition-all duration-500 group-hover:-translate-y-0.5 group-hover:border-white/20 group-hover:text-white">
        <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5" strokeWidth={2} />
      </span>
    </button>
  );
}

export function ToolsGrid() {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [step, setStep] = useState(0);
  const slideRef = useRef<HTMLDivElement | null>(null);

  const first = tools[0];
  const slides = first ? [...tools, first] : tools;

  /* measure one mobile slide so the track can translate by exact pixels */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const measure = () => {
      if (!mq.matches) return;
      const el = slideRef.current;
      if (el) setStep(el.getBoundingClientRect().width + GAP);
    };
    measure();
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    return () => {
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", measure);
    };
  }, []);

  /* auto-advance only on small screens, and respect reduced motion */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mq.matches || reduce.matches) return;
    const id = window.setInterval(() => setIndex((i) => i + 1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, []);

  /* once the clone is showing, snap back to the real first card without animation */
  useEffect(() => {
    if (index < tools.length) return;
    const t = window.setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [index]);

  useEffect(() => {
    if (animate) return;
    const t = window.setTimeout(() => setAnimate(true), 80);
    return () => window.clearTimeout(t);
  }, [animate]);

  return (
    <section id="tools" className="mt-10 flex w-full scroll-mt-16 flex-col items-center gap-3">
      <SectionHeader title="Get Started with Tools" />

      {/* Desktop / tablet grid */}
      <div className="hidden w-full grid-cols-2 gap-2 sm:grid xl:grid-cols-3">
        {tools.map((tool, i) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            eager
            style={{ animationDelay: `${i * 45}ms` }}
          />
        ))}
      </div>

      {/* Mobile: auto-sliding track instead of stacked cards */}
      <div className="relative w-full sm:hidden">
        <div className="overflow-hidden">
          <div
            className="flex will-change-transform"
            style={{
              gap: `${GAP}px`,
              transform: `translate3d(${-index * step}px, 0, 0)`,
              transition: animate
                ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
                : "none",
            }}
          >
            {slides.map((tool, i) => {
              const isActive = i % tools.length === index % tools.length;
              return (
                <div
                  key={`${tool.id}-${i}`}
                  ref={i === 0 ? slideRef : undefined}
                  className="w-[calc(100%-44px)] shrink-0"
                >
                  <ToolCard tool={tool} active={isActive} className="min-h-[104px] w-full" />
                </div>
              );
            })}
          </div>
        </div>

        {/* edge hint */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-[linear-gradient(to_left,#090a0a,transparent)]" />

        {/* progress dots */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {tools.map((tool, i) => (
            <button
              key={tool.id}
              onClick={() => setIndex(i)}
              aria-label={`Show ${tool.title}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === index % tools.length
                  ? "w-5 bg-lime"
                  : "w-1.5 bg-white/20 hover:bg-white/40",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
