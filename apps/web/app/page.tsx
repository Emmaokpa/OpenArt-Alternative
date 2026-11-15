"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell/AppShell";
import { DirectVideo } from "@/components/create/DirectVideo";
import { PromptBox } from "@/components/create/PromptBox";
import { ModeToggle } from "@/components/create/ModeToggle";
import { ModelRail } from "@/components/discovery/ModelRail";
import { PromoBanner } from "@/components/shell/PromoBanner";
import { PresetGrid } from "@/components/discovery/PresetGrid";
import { WhatsNew } from "@/components/discovery/WhatsNew";
import { TemplateRail } from "@/components/discovery/ModelRail";
import { directVideoItems, whatsNewItems } from "@/data/content";
import { apiFetch } from "@/lib/api";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<{ id: string; status: string } | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-2xl text-center space-y-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-[conic-gradient(from_210deg,#f59e0b,#ec4899,#8b5cf6,#06b6d4,#f59e0b)] ring-1 ring-white/20 flex items-center justify-center">
              <span className="text-xs font-bold tracking-tight">OA</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">OpenArt</h1>
          </div>
          <h2 className="text-xl font-bold text-white">Make videos from a sentence.</h2>
          <p className="text-white/60 max-w-md mx-auto">
            Turn any prompt into a short video. Sign in to use your credits and start generating.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/signup" className="flex-1 bg-lime text-black px-6 py-3 rounded-xl font-bold hover:bg-lime/90 transition">
              Create Account
            </Link>
            <Link href="/login" className="flex-1 border border-white/20 px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

      <ModeToggle onModeChange={() => {}} />

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

      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-[17px] font-bold tracking-[-0.01em] text-white">Your Library</h2>
        <Link href="/library" className="text-[12px] font-medium text-white/70 transition hover:text-white">
          View all &rarr;
        </Link>
      </div>

      {job ? (
        <div className="mx-auto mt-6 w-full max-w-[520px] rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[12.5px] text-[rgba(214,225,255,0.6)]">Job {job.id}</p>
          <p className="mt-0.5 font-display text-[16px] font-semibold capitalize text-lime">
            {job.status}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-panel p-4">
              <div className="h-32 rounded-lg bg-[#141414] mb-3 flex items-center justify-center text-white/40 text-sm">
                No jobs yet
              </div>
              <p className="text-[12px] text-white/60 text-center">
                Create your first video to see it here.
              </p>
            </div>
          ))}
        </div>
      )}

      {isPending && (
        <div className="mt-8 flex items-center justify-center gap-2 text-[13px] text-[rgba(214,225,255,0.6)]">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-lime/30 border-t-lime" />
          Generating your video…
        </div>
      )}
      {error && <div className="mt-6 text-center text-[13px] text-red-400">{error}</div>}
    </AppShell>
  );
}
