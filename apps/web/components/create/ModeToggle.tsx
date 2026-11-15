"use client";

import { Bot, Wrench } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

type Mode = "agents" | "tools";

export interface ModeToggleProps {
  onModeChange: (mode: Mode) => void;
  defaultMode?: Mode;
}

export function ModeToggle({
  onModeChange,
  defaultMode = "agents" as Mode,
}: ModeToggleProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);

  return (
    <div className="inline-flex rounded-full border border-white/[0.07] bg-[#161616] p-[3px]">
      {[1, 2].map((i) => {
        const isAgents = i === 1;
        const label = isAgents ? "Agents" : "Tools";
        const Icon = isAgents ? Bot : Wrench;
        const id: Mode = isAgents ? "agents" : "tools";
        return (
          <button
            key={id}
            onClick={() => {
              setMode(id);
              onModeChange(id);
            }}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition-all",
              mode === id
                ? "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "text-white/55 hover:text-white/85",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
