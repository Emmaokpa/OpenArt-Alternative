"use client";

import { X } from "lucide-react";

export interface PromoBannerProps {
  onClose: () => void;
}

export function PromoBanner({ onClose }: PromoBannerProps) {
  return (
    <div className="relative flex h-[52px] w-full shrink-0 items-center justify-center gap-3 overflow-hidden bg-[linear-gradient(90deg,#0a0b0b_0%,#111312_45%,#131615_55%,#0a0b0b_100%)] px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_120%_at_50%_0%,rgba(170,255,0,0.08),transparent_70%)]" />
      <p className="truncate text-[13px] font-normal leading-5 text-white/85">
        <span className="hidden lg:inline">
          Limited Time: Up to 50% off for you on GPT Image 2.6, Seedream 5.5,
          Kling 4.0, and Recraft V4.1
        </span>
        <span className="lg:hidden">Limited Time: Up to 50% off</span>
      </p>
      <button className="shrink-0 cursor-pointer rounded-[4px_12px] bg-lime px-[10px] py-[5px] text-[12px] font-extrabold leading-[17px] text-[#111113] transition hover:brightness-105 active:opacity-85">
        Upgrade now
      </button>
      <button
        onClick={onClose}
        className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
