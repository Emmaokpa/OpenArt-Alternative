import { X } from "lucide-react";

export function PromoBanner({ onClose }: { onClose: () => void }) {
  return (
    <div className="shimmer relative flex h-9 w-full shrink-0 items-center justify-center overflow-hidden bg-[linear-gradient(90deg,#061f12_0%,#0f4a2a_35%,#13603a_50%,#0f4a2a_65%,#061f12_100%)] px-10 text-[12px] text-white/90">
      <p className="truncate font-medium">
        Limited Time: Up to 50% off for you on GPT Image 2.6, Seedream 5.5, Kling 4.0, and Recraft
        V4.1
      </p>
      <button className="ml-3 shrink-0 rounded-[5px] bg-lime px-2 py-[3px] text-[11px] font-semibold text-black transition hover:brightness-110">
        Upgrade Now
      </button>
      <button
        onClick={onClose}
        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white"
        aria-label="Dismiss banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
