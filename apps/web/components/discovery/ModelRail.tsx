"use client";

import { Flame, Gem, Play, Zap } from "lucide-react";
import { popularModels, trendingTemplates } from "@/data/content";
import { LimeBadge, SectionHeader, SoftBadge } from "@/components/ui";

export interface ModelItem {
  id: string;
  name: string;
  provider: string;
  description: string;
  image: string;
  tag?: "New" | "Hot" | "Fast";
  credits: number;
}

function ModelCard({ model }: { model: ModelItem }) {
  const Icon =
    model.tag === "Hot" ? Flame : model.tag === "Fast" ? Zap : Gem;

  return (
    <button
      className="group w-[216px] shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111] text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_14px_40px_-16px_rgba(0,0,0,0.9)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={model.image}
          alt={model.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(17,17,17,1)_0%,rgba(17,17,17,0.1)_45%,transparent)]" />
        {model.tag && (
          <div className="absolute left-2 top-2">
            {model.tag === "New" ? (
              <LimeBadge>NEW</LimeBadge>
            ) : (
              <SoftBadge
                className={
                  model.tag === "Hot" ? "text-orange-300" : "text-sky-300"
                }
              >
                <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
                {model.tag.toUpperCase()}
              </SoftBadge>
            )}
          </div>
        )}
        <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
          <Play className="ml-0.5 h-3.5 w-3.5 text-white" fill="white" />
        </span>
      </div>
      <div className="relative z-10 -mt-2 px-3 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-white">{model.name}</p>
          <span className="flex items-center gap-0.5 text-[10.5px] font-medium text-emerald-300">
            <Gem className="h-3 w-3" strokeWidth={2.2} />
            {model.credits}
          </span>
        </div>
        <p className="text-[10.5px] text-white/45">{model.provider}</p>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-white/60">
          {model.description}
        </p>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10.5px] text-white/40">
            <Zap className="h-3 w-3" />
            Up to 1080p · 10s
          </span>
          <span className="rounded-md bg-white/[0.08] px-2 py-1 text-[10.5px] font-semibold text-white transition group-hover:bg-white group-hover:text-black">
            Try
          </span>
        </div>
      </div>
    </button>
  );
}

export function ModelRail() {
  return (
    <section className="mt-12">
      <SectionHeader
        title="Popular Video Models"
        subtitle="The best models, all in one place — pick the right one for every shot."
      />
      <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2">
        {popularModels.map((m) => (
          <ModelCard key={m.id} model={m} />
        ))}
      </div>
    </section>
  );
}

export interface TemplateItem {
  id: string;
  title: string;
  author: string;
  uses: string;
  image: string;
}

function TemplateCard({ template }: { template: TemplateItem }) {
  return (
    <button
      key={template.id}
      className="group relative aspect-[3/4] w-[150px] shrink-0 overflow-hidden rounded-xl bg-[#141414] text-left ring-1 ring-white/[0.06] transition-all duration-300 hover:ring-white/25"
    >
      <img
        src={template.image}
        alt={template.title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.25)_40%,transparent_65%)]" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md ring-1 ring-white/30">
          <Play className="ml-0.5 h-3.5 w-3.5 text-white" fill="white" />
        </span>
      </div>
      <div className="absolute inset-x-2.5 bottom-2.5">
        <p className="truncate text-[12px] font-semibold text-white">{template.title}</p>
        <p className="mt-0.5 flex items-center justify-between text-[10px] text-white/55">
          <span>@{template.author}</span>
          <span>{template.uses} uses</span>
        </p>
      </div>
    </button>
  );
}

export function TemplateRail() {
  return (
    <section className="mt-10">
      <SectionHeader title="Trending Templates" />
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {trendingTemplates.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
    </section>
  );
}
