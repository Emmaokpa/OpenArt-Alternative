"use client";

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
  Plug,
  Swords,
  UserRound,
  Users,
  Video,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Avatar, LimeBadge, LogoMark, SoftBadge } from "@/components/ui";

type Badge = { label: string; kind: "lime" | "soft" };
type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: Badge;
  href?: string;
};

const tools: NavItem[] = [
  { id: "video", label: "Video", icon: Video },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "world", label: "World", icon: Globe },
  { id: "character", label: "Character", icon: UserRound },
  { id: "audio", label: "Audio", icon: AudioLines },
  { id: "plugins", label: "Plugins", icon: Plug, badge: { label: "10% Off", kind: "lime" } },
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
  { id: "arena", label: "Arena", icon: Swords, badge: { label: "New", kind: "lime" } },
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
      className="group mt-4 flex w-full items-center gap-1 px-2 pb-1 text-left text-[11px] font-bold uppercase leading-4 tracking-[0.08em] text-[rgba(214,225,255,0.5)] transition hover:text-[rgba(228,235,255,0.75)]"
    >
      <ChevronDown
        className={cn(
          "h-2.5 w-2.5 shrink-0 opacity-60 transition-transform",
          !open && "-rotate-90",
        )}
        strokeWidth={3}
      />
      {children}
    </button>
  );
}

function BadgeView({ badge }: { badge?: Badge }) {
  if (!badge) return null;
  return badge.kind === "lime" ? (
    <LimeBadge className="ml-auto px-1 py-px text-[9px] font-bold normal-case tracking-normal">
      {badge.label}
    </LimeBadge>
  ) : (
    <SoftBadge className="ml-auto px-1 py-px text-[9px] normal-case">{badge.label}</SoftBadge>
  );
}

function Row({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: (id: string) => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onNavigate(item.id)}
      className={cn(
        "flex h-8 w-full items-center gap-2.5 rounded-[10px] px-2 text-[13.5px] leading-5 text-[#b0b4ba] transition hover:bg-white/[0.05] hover:text-white",
        active && "bg-white/[0.055] font-medium text-white",
      )}
    >
      <Icon
        className={cn("h-[16px] w-[16px] shrink-0", active ? "text-lime" : "text-[#b0b4ba]")}
        strokeWidth={1.7}
      />
      <span className="truncate">{item.label}</span>
      <BadgeView badge={item.badge} />
    </button>
  );
}

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  active: string;
  onNavigate: (id: string) => void;
}

export function Sidebar({ collapsed, onToggle, active, onNavigate }: SidebarProps) {
  const [open, setOpen] = useState({
    agents: true,
    tools: true,
    assets: true,
    inspire: true,
    pinned: true,
  });
  type OpenKeys = keyof typeof open;
  const toggle = (k: OpenKeys) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  /* ---------- collapsed rail ---------- */
  if (collapsed) {
    const rail: NavItem[] = [
      { id: "home", label: "Home", icon: Home },
      { id: "chat", label: "Chat Mode", icon: MessageSquare },
      { id: "director", label: "Director Mode", icon: Clapperboard },
      ...tools,
      ...assets,
    ];
    return (
      <aside className="flex h-full w-[56px] flex-col items-center rounded-2xl bg-panel py-2.5">
        <button
          onClick={onToggle}
          className="mb-2 rounded-lg p-1.5 transition hover:bg-white/[0.06]"
          aria-label="Expand sidebar"
        >
          <LogoMark className="h-6 w-6" />
        </button>
        <div className="no-scrollbar flex w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto px-1.5">
          {rail.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                title={item.label}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-[10px] text-[#b0b4ba] transition hover:bg-white/[0.06] hover:text-white",
                  active === item.id && "bg-white/[0.07] text-lime",
                )}
              >
                <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
              </button>
            );
          })}
        </div>
        <button
          onClick={onToggle}
          className="mt-2 flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  /* ---------- full sidebar ---------- */
  return (
    <aside className="flex h-full w-[232px] flex-col rounded-2xl bg-panel">
      {/* Brand row */}
      <div className="flex items-center justify-between px-2.5 pb-1 pt-2.5">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-0.5 py-1">
          <LogoMark className="h-7 w-7" />
          <span className="font-display text-[16px] font-bold tracking-[-0.32px] text-white">
            OpenArt
          </span>
        </Link>
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#b0b4ba] transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Collapse sidebar"
        >
          <PanelLeft className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto px-2.5 pb-2 pt-1">
        {/* Workspace */}
        <button className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-1.5 text-[13px] font-medium leading-5 text-white transition hover:bg-white/[0.05]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#5b8cff,#2f5bea)] text-[11px] font-bold text-white">
            P
          </span>
          <span className="truncate">Personal Project</span>
          <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-[rgba(214,225,255,0.4)]" />
        </button>

        {/* Home */}
        <Link href="/" onClick={() => onNavigate("home")} className="mt-2 block">
          <span
            className={cn(
              "flex h-8 w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2 text-[14px] leading-5 text-[#b0b4ba] transition hover:bg-white/[0.05] hover:text-white",
              active === "home" && "border-white/55 bg-white/[0.05] font-medium text-white",
            )}
          >
            <Home
              className={cn("h-[16px] w-[16px]", active === "home" ? "text-lime" : "text-[#b0b4ba]")}
              strokeWidth={1.7}
            />
            Home
          </span>
        </Link>

        {/* AGENTS */}
        <SectionLabel open={open.agents} onToggle={() => toggle("agents")}>
          Agents
        </SectionLabel>
        {open.agents && (
          <div className="mt-1 flex flex-col gap-1.5">
            {[
              {
                id: "chat",
                label: "Chat Mode",
                sub: "Chat to create anything",
                icon: MessageSquare,
              },
              {
                id: "director",
                label: "Director Mode",
                sub: "Full film / long video",
                icon: Clapperboard,
              },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  onClick={() => onNavigate(a.id)}
                  className={cn(
                    "flex h-[50px] w-full items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2 text-left transition hover:border-white/15 hover:bg-white/[0.055]",
                    active === a.id && "border-lime/50 bg-white/[0.05]",
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,rgba(170,255,0,0.16),rgba(170,255,0,0.04))] text-lime">
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium leading-5 text-white">
                      {a.label}
                    </span>
                    <span className="block truncate text-[10.5px] leading-[14px] text-dim">
                      {a.sub}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* TOOLS */}
        <SectionLabel open={open.tools} onToggle={() => toggle("tools")}>
          Tools
        </SectionLabel>
        {open.tools && (
          <div className="grid grid-cols-2 gap-1 pt-0.5">
            {tools.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => onNavigate(t.id)}
                  className={cn(
                    "relative flex h-8 items-center gap-2 rounded-[10px] px-2 text-[12.5px] leading-5 text-[#b0b4ba] transition hover:bg-white/[0.05] hover:text-white",
                    active === t.id && "bg-white/[0.055] font-medium text-white",
                  )}
                >
                  <Icon
                    className={cn("h-[15px] w-[15px] shrink-0", active === t.id ? "text-lime" : "text-[#b0b4ba]")}
                    strokeWidth={1.7}
                  />
                  <span className="truncate">{t.label}</span>
                  {t.badge && (
                    <LimeBadge className="absolute -top-1 right-0.5 px-1 py-0 text-[8px] leading-[11px] normal-case">
                      {t.badge.label}
                    </LimeBadge>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ASSETS */}
        <SectionLabel open={open.assets} onToggle={() => toggle("assets")}>
          Assets
        </SectionLabel>
        {open.assets && (
          <div className="flex flex-col gap-0.5 pt-0.5">
            {assets.map((a) => (
              <Row key={a.id} item={a} active={active === a.id} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        {/* INSPIRE */}
        <SectionLabel open={open.inspire} onToggle={() => toggle("inspire")}>
          Inspire
        </SectionLabel>
        {open.inspire && (
          <div className="flex flex-col gap-0.5 pt-0.5">
            {inspire.map((a) => (
              <Row key={a.id} item={a} active={active === a.id} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        {/* PINNED TOOLS */}
        <SectionLabel open={open.pinned} onToggle={() => toggle("pinned")}>
          Pinned Tools
        </SectionLabel>
        {open.pinned && (
          <button className="mt-1 flex w-full items-center gap-2 rounded-[10px] border border-dashed border-white/[0.12] px-2 py-2 text-left text-[11.5px] leading-snug text-[rgba(214,225,255,0.4)] transition hover:border-white/20 hover:text-[rgba(228,235,255,0.6)]">
            <Pin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            Pin your favourite tools
          </button>
        )}
      </div>

      {/* Footer account row */}
      <div className="mt-1 border-t border-white/[0.06] px-2.5 py-2.5">
        <button className="flex w-full items-center gap-2.5 rounded-xl px-1 py-1 text-left transition hover:bg-white/[0.05]">
          <Avatar className="h-7 w-7" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-medium leading-4 text-white">
              Emmanuel Okpa
            </span>
            <span className="block truncate text-[10.5px] leading-4 text-dim">Free plan</span>
          </span>
          <span className="rounded-[4px] bg-lime px-1.5 py-[3px] text-[9.5px] font-extrabold uppercase leading-none text-[#111113]">
            Free
          </span>
        </button>
      </div>
    </aside>
  );
}
