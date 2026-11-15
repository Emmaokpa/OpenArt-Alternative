"use client";

import { AppShell } from "@/components/shell/AppShell";
import { DirectVideo } from "@/components/create/DirectVideo";
import { Footer } from "@/components/shell/Footer";
import { ModelRail, TemplateRail } from "@/components/discovery/ModelRail";
import { PromoBanner } from "@/components/shell/PromoBanner";
import { PresetGrid } from "@/components/discovery/PresetGrid";
import { PromptBox } from "@/components/create/PromptBox";
import { WhatsNew } from "@/components/discovery/WhatsNew";
import { directVideoItems, whatsNewItems } from "@/data/content";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function HomePage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<{ id: string; status: string } | null>(null);

  const handleSubmit = async (prompt: string) => {
    setIsPending(true);
    setError(null);
    try {
      const data = await apiFetch<{ job: { id: string; status: string } }>(
        "/v1/jobs",
        {
          method: "POST",
          headers: { "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify({
            type: "text_to_video",
            params: { prompt, durationS: 5 },
          }),
        },
      );
      setJob(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create job");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AppShell active="home">
      <PromoBanner onClose={() => {}} />

      <PromptBox
        onSubmit={handleSubmit}
        placeholderPrompts={[
          "Upbeat background music video for a sneaker launch",
          "A cinematic trailer for a sci-fi short film set on Mars",
          "15-second UGC ad for a skincare brand, handheld, natural light",
          "Neon-lit music video, slow dolly through a rainy Tokyo street",
          "Real estate walkthrough of a modern glass house at golden hour",
        ]}
      />

      <DirectVideo
        items={directVideoItems}
        onSelect={() => {}}
        selectedId="launch"
      />

      <WhatsNew items={whatsNewItems} />
      <PresetGrid />
      <ModelRail />
      <TemplateRail />
      <Footer />

      {isPending && (
        <div className="mt-6 text-center text-white/70">Generating your video…</div>
      )}
      {job && (
        <div className="mt-6 p-4 rounded-xl bg-white/[0.05] border border-white/[0.1]">
          <p className="text-white/80">Job {job.id}</p>
          <p className="text-brand-pink">{job.status}</p>
        </div>
      )}
      {error && <div className="mt-6 text-center text-red-400">{error}</div>}
    </AppShell>
  );
}
