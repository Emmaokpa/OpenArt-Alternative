"use client";

import {
  ArrowUp,
  Bot,
  ChevronDown,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Megaphone,
  MessageSquare,
  Mic,
  Music,
  Plus,
  Sparkles,
  SquareArrowOutUpRight,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { LimeBadge } from "@/components/ui";

type Mode = "agents" | "tools";

const toggleItems: { id: Mode; label: string; icon: LucideIcon }[] = [
  { id: "agents", label: "Agents", icon: Bot },
  { id: "tools", label: "Tools", icon: Wrench },
];

const agentChips: { label: string; icon: LucideIcon }[] = [
  { label: "Create product ads", icon: Megaphone },
  { label: "Design a film poster", icon: ImageIcon },
  { label: "Music for my film", icon: Music },
];

const toolChips: { label: string; icon: LucideIcon }[] = [
  { label: "Text to Video", icon: Film },
  { label: "Image to Video", icon: Clapperboard },
  { label: "Lip Sync", icon: Mic },
  { label: "Upscale 4K", icon: Sparkles },
];

const HEADLINES = ["What are we making today?", "Your studio, your controls"];

function useTypewriter(phrases: string[], active: boolean) {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!active || phrases.length === 0) return;
    const full = phrases[index % phrases.length] ?? "";
    let delay = deleting ? 16 : 40;
    if (!deleting && text === full) delay = 2400;
    if (deleting && text === "") delay = 260;

    const t = setTimeout(() => {
      if (!deleting) {
        if (text === full) setDeleting(true);
        else setText(full.slice(0, text.length + 1));
      } else if (text === "") {
        setDeleting(false);
        setIndex((i) => i + 1);
      } else setText(full.slice(0, text.length - 1));
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, index, phrases, active]);

  return text;
}

function useRotatingHeadline() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % HEADLINES.length), 4200);
    return () => clearInterval(t);
  }, []);
  return i;
}

function PillButton({
  icon: Icon,
  label,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-normal text-[#d6e1ff]/85 transition hover:bg-white/[0.07] hover:text-white",
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />}
      <span className="truncate">{label}</span>
      <ChevronDown className="h-3 w-3 shrink-0 text-white/40" strokeWidth={2.4} />
    </button>
  );
}

export interface PromptBoxProps {
  onSubmit: (prompt: string) => void;
  placeholderPrompts?: string[];
  defaultPrompt?: string;
}

export function PromptBox({
  onSubmit,
  placeholderPrompts = [],
  defaultPrompt = "",
}: PromptBoxProps) {
  const [mode, setMode] = useState<Mode>("agents");
  const [value, setValue] = useState(defaultPrompt);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const typed = useTypewriter(placeholderPrompts, value.length === 0);
  const headline = useRotatingHeadline();

  const chips = mode === "agents" ? agentChips : toolChips;

  return (
    <section className="relative flex w-full flex-col items-center gap-4 pt-8 sm:pt-10">
      {/* Rotating headline */}
      <div className="relative h-10 w-full text-center">
        {HEADLINES.map((h, i) => (
          <h1
            key={h}
            className={cn(
              "absolute left-1/2 top-0 w-fit -translate-x-1/2 whitespace-nowrap font-display text-[24px] font-bold leading-7 tracking-[-0.48px] transition-[opacity,translate] duration-[400ms] ease-out md:text-[36px] md:leading-10 md:tracking-[-0.72px] md:font-semibold",
              "bg-[linear-gradient(95deg,#fff_4.73%,rgba(255,255,255,0.3)_96.27%)] bg-clip-text text-transparent [text-shadow:0px_1px_1px_rgba(0,0,0,0.25)]",
              i === headline
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0",
            )}
            aria-hidden={i !== headline}
          >
            {h}
          </h1>
        ))}
      </div>

      {/* Agents / Tools toggle */}
      <div className="flex rounded-full border border-white/[0.07] bg-white/[0.045] p-0.5">
        {toggleItems.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold leading-4 transition-all",
                mode === t.id
                  ? "bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  : "text-[#b0b4ba] hover:text-white",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Prompt box */}
      <div className="relative mx-auto w-full max-w-[820px]">
        <div className="prompt-aura" />
        <div
          className={cn(
            "relative rounded-[20px] p-px transition-shadow",
            focused && "shadow-[0_0_0_4px_rgba(170,255,0,0.07)]",
          )}
        >
          <div className="prompt-ring" />
          <div
            className="relative rounded-[19px] bg-[#121314] px-3.5 pb-2.5 pt-3 text-left"
            onClick={() => ref.current?.focus()}
          >
            <div className="relative">
              <textarea
                ref={ref}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                rows={2}
                spellCheck={false}
                className="relative z-10 block min-h-[58px] w-full resize-none bg-transparent px-1 text-[14.5px] leading-6 text-white outline-none placeholder:text-transparent"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (value.trim()) onSubmit(value);
                  }
                }}
              />
              {value.length === 0 && placeholderPrompts.length > 0 && (
                <div className="pointer-events-none absolute left-1 top-0 z-0 select-none text-[14.5px] leading-6 text-[rgba(214,225,255,0.4)]">
                  {typed}
                  <span className="caret-blink ml-px inline-block h-[15px] w-px translate-y-[2px] bg-white/50" />
                </div>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-white/80 transition hover:bg-white/[0.1] hover:text-white">
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </button>
                <PillButton
                  icon={mode === "agents" ? MessageSquare : Film}
                  label={mode === "agents" ? "Chat Mode" : "Text to Video"}
                />
                <PillButton
                  icon={Sparkles}
                  label={mode === "agents" ? "GPT 5.6 Luna" : "Kling 2.5 Turbo"}
                  className="hidden sm:flex"
                />
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <PillButton label="Ask first" className="hidden md:flex" />
                <button className="flex h-8 w-8 items-center justify-center rounded-full text-[#d6e1ff]/80 transition hover:bg-white/[0.08] hover:text-white">
                  <Mic className="h-4 w-4" strokeWidth={1.9} />
                </button>
                <button
                  onClick={() => onSubmit(value)}
                  disabled={!value.trim()}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl bg-lime text-[#111113] transition hover:brightness-105 active:scale-95",
                    !value.trim() && "cursor-not-allowed opacity-40",
                  )}
                  aria-label="Send"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.6} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {chips.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              onClick={() => setValue(c.label === value ? "" : c.label)}
              className="flex h-8 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 text-[12px] font-normal text-[#d6e1ff]/85 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
              {c.label}
            </button>
          );
        })}
        <button className="flex h-8 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 text-[12px] font-normal text-[#d6e1ff]/85 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white">
          More
        </button>
      </div>

      {/* Use OpenArt everywhere */}
      <div className="mt-1 inline-flex max-w-full items-center gap-2 rounded-full border border-white/[0.07] bg-[#141515] py-1 pl-3 pr-1.5 text-[12px] text-[#d6e1ff]/80">
        <span className="hidden truncate whitespace-nowrap sm:inline">
          Use OpenArt everywhere you create
        </span>
        <span className="hidden h-4 w-px bg-white/10 sm:block" />
        <button className="flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[12px] font-semibold text-white transition hover:bg-white/[0.08]">
          MCP / CLI
          <SquareArrowOutUpRight className="h-3 w-3 text-lime" strokeWidth={2.2} />
        </button>
        <button className="flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[12px] font-semibold text-white transition hover:bg-white/[0.08]">
          Desktop
          <SquareArrowOutUpRight className="h-3 w-3 text-lime" strokeWidth={2.2} />
          <LimeBadge className="ml-0.5 px-1 py-0 text-[8px] leading-[11px]">New</LimeBadge>
        </button>
      </div>
    </section>
  );
}
