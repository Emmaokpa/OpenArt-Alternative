import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  BookOpen,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  FolderKanban,
  Globe,
  Home,
  Image as ImageIcon,
  Images,
  LayoutTemplate,
  MessageSquare,
  Newspaper,
  PanelLeft,
  Pin,
  Swords,
  Terminal,
  UserRound,
  Users,
  Video,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils/cn";
import { LimeBadge, LogoMark, SoftBadge } from "./ui";

type Badge = { label: string; kind: "lime" | "soft" };
type NavItem = { id: string; label: string; icon: LucideIcon; badge?: Badge };

const agents: NavItem[] = [
  { id: "chat", label: "Chat Mode", icon: MessageSquare },
  { id: "director", label: "Director Mode", icon: Clapperboard },
];

const tools: NavItem[] = [
  { id: "video", label: "Video", icon: Video },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "world", label: "World", icon: Globe },
  { id: "character", label: "Character", icon: UserRound },
  { id: "audio", label: "Audio", icon: AudioLines },
  { id: "mcp", label: "MCP / CLI", icon: Terminal, badge: { label: "NEW", kind: "lime" } },
];

const assets: NavItem[] = [
  { id: "director-projects", label: "Director Projects", icon: FolderKanban },
  { id: "character-world", label: "Character & World", icon: Users },
  { id: "brand-kit", label: "Brand kit", icon: Briefcase },
  { id: "media", label: "Media", icon: Images },
  { id: "workflows", label: "Workflows", icon: Workflow, badge: { label: "Beta", kind: "soft" } },
];

const inspire: NavItem[] = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "arena", label: "Arena", icon: Swords, badge: { label: "NEW", kind: "lime" } },
  { id: "tutorials", label: "Tutorials", icon: BookOpen },
  { id: "blog", label: "Blog", icon: Newspaper },
];

function SectionLabel({
  children,
  open,
  onToggle,
}: {
  children: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="group flex w-full items-center gap-1 px-1.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white/35 transition hover:text-white/60"
    >
      <ChevronDown
        className={cn("h-2.5 w-2.5 transition-transform", !open && "-rotate-90")}
        strokeWidth={2.5}
      />
      {children}
    </button>
  );
}

function BadgeView({ badge }: { badge?: Badge }) {
  if (!badge) return null;
  return badge.kind === "lime" ? (
    <LimeBadge className="ml-auto">{badge.label}</LimeBadge>
  ) : (
    <SoftBadge className="ml-auto">{badge.label}</SoftBadge>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  active,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  active: string;
  onNavigate: (id: string) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    agents: true,
    tools: true,
    assets: true,
    inspire: true,
    pinned: true,
  });
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  /* ---------- collapsed rail ---------- */
  if (collapsed) {
    const rail: NavItem[] = [{ id: "home", label: "Home", icon: Home }, ...agents, ...tools];
    return (
      <aside className="flex h-full w-[56px] shrink-0 flex-col items-center rounded-xl border border-white/[0.06] bg-panel py-2.5">
        <button
          onClick={onToggle}
          className="mb-2 rounded-lg p-1.5 transition hover:bg-white/[0.06]"
          aria-label="Expand sidebar"
        >
          <LogoMark className="h-6 w-6" />
        </button>
        <div className="no-scrollbar flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-1.5">
          {rail.map((item) => (
            <button
              key={item.id}
              title={item.label}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/[0.07] hover:text-white",
                active === item.id && "bg-white/[0.08] text-white ring-1 ring-brand-pink",
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.8} />
            </button>
          ))}
        </div>
        <button
          onClick={onToggle}
          className="mt-2 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  /* ---------- full sidebar ---------- */
  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col rounded-xl border border-white/[0.06] bg-panel">
      {/* Brand */}
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <div className="flex items-center gap-2">
          <LogoMark className="h-6 w-6" />
          <span className="text-[14px] font-bold tracking-tight text-white">OpenArt</span>
          <span className="rounded-[4px] border border-white/15 px-1 py-px text-[9px] font-medium text-white/60">
            Free
          </span>
        </div>
        <button
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Collapse sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto px-2.5 pb-3 pt-2">
        {/* Workspace selector */}
        <button className="flex h-9 w-full items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 text-[12px] font-medium text-white/90 transition hover:bg-white/[0.06]">
          <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-[linear-gradient(135deg,#60a5fa,#2563eb)] text-[10px] font-bold text-white">
            P
          </span>
          <span className="truncate">Personal Project</span>
          <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/40" />
        </button>

        {/* Home */}
        <button
          onClick={() => onNavigate("home")}
          className={cn(
            "mt-2 flex h-8 w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 text-[12.5px] font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white",
            active === "home" &&
              "border-brand-pink bg-white/[0.04] text-white shadow-[0_0_0_1px_rgba(255,45,138,0.25),0_0_18px_-4px_rgba(255,45,138,0.45)]",
          )}
        >
          <Home className="h-4 w-4" strokeWidth={1.9} />
          Home
        </button>

        {/* AGENTS */}
        <div className="mt-3">
          <SectionLabel open={open.agents} onToggle={() => toggle("agents")}>
            Agents
          </SectionLabel>
          {open.agents && (
            <div className="mt-1 flex flex-col gap-1.5">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onNavigate(a.id)}
                  className={cn(
                    "flex h-[38px] w-full items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 text-[12.5px] font-medium text-white/85 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white",
                    active === a.id && "border-brand-pink text-white",
                  )}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.07]">
                    <a.icon className="h-3.5 w-3.5" strokeWidth={1.9} />
                  </span>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TOOLS */}
        <div className="mt-3">
          <SectionLabel open={open.tools} onToggle={() => toggle("tools")}>
            Tools
          </SectionLabel>
          {open.tools && (
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {tools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onNavigate(t.id)}
                  className={cn(
                    "relative flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 text-[11.5px] font-medium text-white/85 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white",
                    active === t.id && "border-brand-pink text-white",
                  )}
                >
                  <t.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                  <span className="truncate">{t.label}</span>
                  {t.badge && (
                    <LimeBadge className="absolute -top-1.5 right-1 px-1 py-px text-[7.5px]">
                      {t.badge.label}
                    </LimeBadge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ASSETS */}
        <div className="mt-3">
          <SectionLabel open={open.assets} onToggle={() => toggle("assets")}>
            Assets
          </SectionLabel>
          {open.assets && (
            <div className="mt-0.5 flex flex-col">
              {assets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onNavigate(a.id)}
                  className={cn(
                    "flex h-[28px] w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] text-white/75 transition hover:bg-white/[0.06] hover:text-white",
                    active === a.id && "bg-white/[0.06] text-white",
                  )}
                >
                  <a.icon className="h-[15px] w-[15px]" strokeWidth={1.7} />
                  <span className="truncate">{a.label}</span>
                  <BadgeView badge={a.badge} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INSPIRE */}
        <div className="mt-3">
          <SectionLabel open={open.inspire} onToggle={() => toggle("inspire")}>
            Inspire
          </SectionLabel>
          {open.inspire && (
            <div className="mt-0.5 flex flex-col">
              {inspire.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onNavigate(a.id)}
                  className={cn(
                    "flex h-[28px] w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] text-white/75 transition hover:bg-white/[0.06] hover:text-white",
                    active === a.id && "bg-white/[0.06] text-white",
                  )}
                >
                  <a.icon className="h-[15px] w-[15px]" strokeWidth={1.7} />
                  <span className="truncate">{a.label}</span>
                  <BadgeView badge={a.badge} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PINNED TOOLS */}
        <div className="mt-3">
          <SectionLabel open={open.pinned} onToggle={() => toggle("pinned")}>
            Pinned Tools
          </SectionLabel>
          {open.pinned && (
            <div className="mt-1 rounded-lg border border-dashed border-white/10 px-2.5 py-3 text-center">
              <Pin className="mx-auto h-3.5 w-3.5 text-white/30" />
              <p className="mt-1.5 text-[10.5px] leading-snug text-white/40">
                Pin your favorite tools for quick access
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
