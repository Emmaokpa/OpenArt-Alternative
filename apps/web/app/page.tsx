"use client";

import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { DirectVideo } from "@/components/create/DirectVideo";
import { PromptBox } from "@/components/create/PromptBox";
import { ModelRail } from "@/components/discovery/ModelRail";
import { PresetGrid } from "@/components/discovery/PresetGrid";
import { WhatsNew } from "@/components/discovery/WhatsNew";
import { Inspirations } from "@/components/sections/Inspirations";
import { ToolsGrid } from "@/components/sections/ToolsGrid";
import { directVideoItems, placeholderPrompts, whatsNewItems } from "@/data/content";
import { apiFetch } from "@/lib/api";

export default function HomePage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<{ id: string; status: string } | null>(null);

  const handleSubmit = async (prompt: string) => {
    setIsPending(true);
    setError(null);
    try {
      const data = await apiFetch<{ job: { id: string; status: string } }>("/v1/jobs", {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          type: "text_to_video",
          params: { prompt, durationS: 5 },
        }),
      });
      setJob(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create job");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AppShell active="home">
      <PromptBox onSubmit={handleSubmit} placeholderPrompts={placeholderPrompts} />

      <DirectVideo items={directVideoItems} onSelect={() => {}} selectedId="launch" />

      <WhatsNew items={whatsNewItems} />
      <PresetGrid />

      <ToolsGrid />
      <ModelRail />
      <Inspirations />

      {isPending && (
        <div className="mt-8 flex items-center justify-center gap-2 text-[13px] text-[rgba(214,225,255,0.6)]">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-lime/30 border-t-lime" />
          Generating your video…
        </div>
      )}
      {job && (
        <div className="mx-auto mt-6 w-full max-w-[520px] rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[12.5px] text-[rgba(214,225,255,0.6)]">Job {job.id}</p>
          <p className="mt-0.5 font-display text-[16px] font-semibold capitalize text-lime">
            {job.status}
          </p>
        </div>
      )}
      {error && (
        <div className="mt-6 text-center text-[13px] text-red-400">{error}</div>
      )}
    </AppShell>
  );
}
