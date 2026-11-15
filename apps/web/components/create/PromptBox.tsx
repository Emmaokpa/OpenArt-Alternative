"use client";

import { Bot, Film, Wrench } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

type Mode = "agents" | "tools";

const toggleItems: { id: Mode; label: string; icon: React.ElementType }[] = [
  { id: "agents", label: "Agents", icon: Bot },
  { id: "tools", label: "Tools", icon: Wrench },
];

const agentChips: { label: string; icon: React.ElementType }[] = [
  { label: "Create product ads", icon: Bot },
  { label: "Design a film poster", icon: Bot },
  { label: "Music for my film", icon: Bot },
];

const toolChips: { label: string; icon: React.ElementType }[] = [
  { label: "Text to Video", icon: Film },
  { label: "Image to Video", icon: Bot },
  { label: "Lip Sync", icon: Bot },
  { label: "Upscale 4K", icon: Wrench },
];

export interface PromptBoxProps {
  onSubmit: (prompt: string) => void;
  placeholderPrompts?: string[];
  defaultPrompt?: string;
}

function DropdownButton({
  icon: Icon,
  label,
  className,
}: {
  icon?: React.ElementType;
  label: string;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.07] hover:text-white",
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />}
      {label}
    </button>
  );
}

export function PromptBox({
  onSubmit,
  placeholderPrompts = [],
  defaultPrompt = "",
}: PromptBoxProps) {
  const [mode, setMode] = useState<Mode>("agents");
  const [value, setValue] = useState(defaultPrompt);
  const [focused, setFocused] = useState(false);
  const chips = mode === "agents" ? agentChips : toolChips;

  return (
    <section className="relative pt-9 text-center sm:pt-12">
      <h1 className="animate-fade-up text-[26px] font-semibold tracking-[-0.02em] text-white sm:text-[32px]">
        What are we making today?
      </h1>

      {/* Agents / Tools toggle */}
      <div
        className="animate-fade-up mt-4 inline-flex rounded-full border border-white/[0.07] bg-[#161616] p-[3px]"
        style={{ animationDelay: "60ms" }}
      >
        {toggleItems.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition-all",
                mode === t.id
                  ? "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-white/55 hover:text-white/85",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Prompt box */}
      <div
        className="animate-fade-up relative mx-auto mt-6 w-full max-w-[880px]"
        style={{ animationDelay: "120ms" }}
      >
        <div className="glow-pulse pointer-events-none absolute -inset-y-6 -right-10 left-1/2 rounded-[40px] bg-[radial-gradient(60%_70%_at_100%_50%,rgba(255,45,138,0.28),transparent_70%)] blur-2xl" />
        <div className="pointer-events-none absolute -inset-y-3 left-0 right-1/2 rounded-[40px] bg-[radial-gradient(60%_60%_at_0%_50%,rgba(255,255,255,0.05),transparent_70%)] blur-2xl" />

        <div
          className={cn(
            "relative rounded-2xl p-px transition-shadow",
            focused
              ? "bg-[linear-gradient(90deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.12)_50%,rgba(255,45,138,0.8)_82%,#ff2d8a_100%)] shadow-[0_0_0_4px_rgba(255,45,138,0.07)]"
              : "bg-[linear-gradient(90deg,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.08)_55%,rgba(255,45,138,0.55)_85%,#ff2d8a_100%)]",
          )}
        >
          <div
            className="rounded-[15px] bg-[#0d0d0d] px-4 pb-3 pt-3.5 text-left"
          >
            <div className="relative">
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                rows={3}
                spellCheck={false}
                className="relative z-10 block min-h-[76px] w-full resize-none bg-transparent text-[14px] leading-relaxed text-white outline-none"
              />
              {value.length === 0 && placeholderPrompts.length > 0 && (
                <div className="pointer-events-none absolute left-0 top-0 z-0 select-none text-[14px] leading-relaxed text-white/35">
                  <span className="caret-blink ml-px inline-block h-[14px] w-px translate-y-[2px] bg-white/50" />
                </div>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <DropdownButton
                  icon={mode === "agents" ? Bot : Film}
                  label={mode === "agents" ? "Chat Mode" : "Text to Video"}
                />
                <DropdownButton
                  icon={Bot}
                  label={mode === "agents" ? "GPT 5.6 Luna" : "Kling 2.5 Turbo"}
                  className="hidden sm:flex"
                />
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.1] hover:text-white">
                  <svg strokeWidth={1.9} viewBox="0 0 24 24" className="h-4 w-4">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  onClick={() => onSubmit(value)}
                  disabled={!value.trim()}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff7ab8,#ff2d8a_55%,#e5177a)] text-white shadow-[0_0_18px_-2px_rgba(255,45,138,0.7)] transition hover:brightness-110 active:scale-95",
                    !value.trim() && "opacity-50 cursor-not-allowed",
                  )}
                  aria-label="Send"
                >
                  <svg strokeWidth={2.4} viewBox="0 0 24 24" className="h-4 w-4">
                    <path d="M5 4l2 3 0 6 3 16 2 3 16 2 16 3 3 16 0 6 2 3" stroke="currentColor" fill="none" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick chips */}
      <div
        className="animate-fade-up mt-4 flex flex-wrap items-center justify-center gap-2"
        style={{ animationDelay: "180ms" }}
      >
        {chips.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-[12px] font-medium text-white/85 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
              {c.label}
            </button>
          );
        })}
        <button className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-[12px] font-medium text-white/85 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white">
          More
        </button>
      </div>
    </section>
  );
}
