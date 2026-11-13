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
  MousePointer2,
  Music,
  Plus,
  Sparkles,
  SquareArrowOutUpRight,
  Wand2,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { placeholderPrompts } from "@/data/content";

type Mode = "agents" | "tools";

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

function useTypewriter(phrases: string[], active: boolean) {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!active) return;
    const full = phrases[index % phrases.length];
    let delay = deleting ? 18 : 42;
    if (!deleting && text === full) delay = 2200;
    if (deleting && text === "") delay = 300;

    const t = setTimeout(() => {
      if (!deleting) {
        if (text === full) setDeleting(true);
        else setText(full.slice(0, text.length + 1));
      } else {
        if (text === "") {
          setDeleting(false);
          setIndex((i) => i + 1);
        } else setText(full.slice(0, text.length - 1));
      }
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, index, phrases, active]);

  return text;
}

function DropdownButton({
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
        "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.07] hover:text-white",
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />}
      {label}
      <ChevronDown className="h-3 w-3 text-white/50" />
    </button>
  );
}

export function Hero() {
  const [mode, setMode] = useState<Mode>("agents");
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const typed = useTypewriter(placeholderPrompts, value.length === 0);

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
        {(
          [
            { id: "agents", label: "Agents", icon: Bot },
            { id: "tools", label: "Tools", icon: Wrench },
          ] as const
        ).map((t) => (
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
            <t.icon className="h-3.5 w-3.5" strokeWidth={2} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Prompt box */}
      <div
        className="animate-fade-up relative mx-auto mt-6 w-full max-w-[880px]"
        style={{ animationDelay: "120ms" }}
      >
        {/* ambient pink glow on the right edge */}
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
            onClick={() => ref.current?.focus()}
          >
            <div className="relative">
              <textarea
                ref={ref}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                rows={3}
                spellCheck={false}
                className="relative z-10 block min-h-[76px] w-full resize-none bg-transparent text-[14px] leading-relaxed text-white outline-none"
              />
              {value.length === 0 && (
                <div className="pointer-events-none absolute left-0 top-0 z-0 select-none text-[14px] leading-relaxed text-white/35">
                  {typed}
                  <span className="caret-blink ml-px inline-block h-[14px] w-px translate-y-[2px] bg-white/50" />
                </div>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.1] hover:text-white">
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </button>
                <DropdownButton
                  icon={mode === "agents" ? MessageSquare : Film}
                  label={mode === "agents" ? "Chat Mode" : "Text to Video"}
                />
                <DropdownButton
                  icon={Sparkles}
                  label={mode === "agents" ? "GPT 5.6 Luna" : "Kling 2.5 Turbo"}
                  className="hidden sm:flex"
                />
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <DropdownButton label="Ask first" className="hidden sm:flex" />
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.1] hover:text-white">
                  <Mic className="h-4 w-4" strokeWidth={1.9} />
                </button>
                <button
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff7ab8,#ff2d8a_55%,#e5177a)] text-white shadow-[0_0_18px_-2px_rgba(255,45,138,0.7)] transition hover:brightness-110 active:scale-95",
                    value.length === 0 && "opacity-90",
                  )}
                  aria-label="Send"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
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
        {chips.map((c) => (
          <button
            key={c.label}
            className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-[12px] font-medium text-white/85 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <c.icon className="h-3.5 w-3.5" strokeWidth={1.9} />
            {c.label}
          </button>
        ))}
        <button className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-[12px] font-medium text-white/85 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white">
          More
        </button>
      </div>

      {/* MCP / CLI row */}
      <div
        className="animate-fade-up mt-7 inline-flex max-w-full items-center gap-2 rounded-full border border-white/[0.07] bg-[#141414] py-1 pl-3 pr-1.5 text-[12px] text-white/80"
        style={{ animationDelay: "240ms" }}
      >
        <Wand2 className="h-3.5 w-3.5 shrink-0 text-white/60" strokeWidth={1.9} />
        <span className="hidden truncate sm:inline">
          Create images &amp; videos in your AI agent
        </span>
        <span className="truncate sm:hidden">Use in your AI agent</span>
        <div className="ml-1 flex items-center -space-x-1">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d97757] text-[11px] font-bold leading-none text-white ring-2 ring-[#141414]">
            ✳
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-[#141414]">
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3"
              fill="none"
              stroke="black"
              strokeWidth="2.2"
            >
              <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" />
              <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
            </svg>
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1b1b1b] ring-2 ring-[#141414]">
            <MousePointer2 className="h-3 w-3 text-white" strokeWidth={2.2} fill="white" />
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2a2a2a] text-[9px] font-bold tracking-wider text-white/80 ring-2 ring-[#141414]">
            ···
          </span>
        </div>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <button className="flex h-6 items-center gap-1.5 rounded-full px-2 text-[12px] font-semibold text-white transition hover:bg-white/[0.08]">
          Set up MCP / CLI
          <SquareArrowOutUpRight className="h-3 w-3 text-sky-400" strokeWidth={2.2} />
        </button>
      </div>
    </section>
  );
}
