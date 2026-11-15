"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { models } from "@/data/content";
import type { ModelItem } from "@/data/content";
import { SectionHeader } from "@/components/ui";

export function ModelRail({ items = models }: { items?: ModelItem[] }) {  return (
    <section className="mt-10 flex w-full flex-col items-center gap-3">
      <SectionHeader title="Latest AI Models" />
      <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((model) => (
          <Link
            key={model.id}
            href={{
              pathname: "/create/video",
              query: { model: model.id, prompt: model.description },
            }}
            className="group flex cursor-pointer flex-col gap-2 text-left"
          >
            <div className="relative aspect-[441/248] w-full overflow-hidden rounded-2xl bg-[#141515] ring-1 ring-white/[0.06] transition-all duration-300 group-hover:ring-white/25">
              <img
                src={model.image}
                alt={model.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.35),transparent_60%)] opacity-70" />
            </div>
            <div className="px-0.5">
              <p className="font-display text-[16px] font-semibold leading-[22px] tracking-[-0.24px] text-white md:text-[18px] md:leading-6 md:tracking-[-0.32px]">
                {model.name}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[13px] leading-[18px] text-[rgba(214,225,255,0.4)]">
                {model.description}
              </p>
            </div>
          </Link>
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
    <Link
      key={template.id}
      href={{
        pathname: "/create/video",
        query: { template: template.id, prompt: template.title },
      }}
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
    </Link>
  );
}

export function TemplateRail() {
  const templates: TemplateItem[] = [
    {
      id: "cinematic-trailer",
      title: "Cinematic Trailer",
      author: "openart",
      uses: "48k",
      image: "https://images.pexels.com/photos/4355348/pexels-photo-4355348.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    },
    {
      id: "logo-reveal",
      title: "Logo Reveal",
      author: "motionlab",
      uses: "32k",
      image: "https://images.pexels.com/photos/11508536/pexels-photo-11508536.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    },
    {
      id: "fashion-lookbook",
      title: "Fashion Lookbook",
      author: "studio.k",
      uses: "27k",
      image: "https://images.pexels.com/photos/6220701/pexels-photo-6220701.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
    {
      id: "deep-dive",
      title: "Deep Dive",
      author: "bluehour",
      uses: "19k",
      image: "https://images.pexels.com/photos/13588896/pexels-photo-13588896.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    },
  ];

  return (
    <section className="mt-10 flex w-full flex-col items-center gap-3">
      <SectionHeader title="Trending Templates" />
      <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </section>
  );
}
