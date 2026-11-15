"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell/AppShell";
import { Footer } from "@/components/shell/Footer";
import { PromptBox } from "@/components/create/PromptBox";
import { apiFetch } from "@/lib/api";
import type { TemplateSummary } from "@app/shared";

export default function TemplatePage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const [template, setTemplate] = useState<TemplateSummary | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<{ id: string; status: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ template: TemplateSummary }>(
          `/v1/templates/${params.slug}`,
        );
        if (!cancelled) setTemplate(data.template);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load template");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.slug]);

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
            type: template?.capability || "text_to_video",
            modelId: template?.defaultModelId,
            templateId: template?.id,
            params: { prompt: prompt || template?.promptScaffold || "", durationS: 5 },
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page text-white p-6">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign in required</h2>
          <p className="text-white/60 mb-6">Please sign in to use templates.</p>
          <Link href="/login" className="bg-lime text-black px-6 py-3 rounded-xl font-bold hover:bg-lime/90 transition block">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <AppShell active="home">
        <div className="max-w-md text-center py-20">
          <h1 className="text-2xl font-bold text-white">Template not found</h1>
          <p className="text-white/60 mb-6">The template you're looking for doesn't exist.</p>
          <Link href="/" className="bg-lime text-black px-6 py-3 rounded-xl font-bold hover:bg-lime/90 transition block">
            Back to home
          </Link>
        </div>
        <Footer />
      </AppShell>
    );
  }

  if (error) return <p className="text-center text-[13px] text-red-400 mt-20">{error}</p>;

  return (
    <AppShell active="home">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{template.title}</h1>
            <p className="text-white/60 text-sm">{template.category}</p>
          </div>
          <Link href="/" className="text-[12px] font-medium text-white/70 hover:text-white">
            ← Back to home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-xl border border-white/[0.08] bg-panel p-4 aspect-video relative overflow-hidden">
            <img
              src={template.previewVideoKey || template.thumbnailKey || ""}
              alt={template.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
              >
                <Play className="ml-0.5 h-5 w-5 text-white" fill="currentColor" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <PromptBox
              onSubmit={async (prompt: string) => {
                setIsPending(true);
                setError(null);
                try {
                  const data = await apiFetch<{ job: { id: string; status: string } }>(
                    "/v1/jobs",
                    {
                      method: "POST",
                      headers: { "idempotency-key": crypto.randomUUID() },
                      body: JSON.stringify({
                        type: template?.capability || "text_to_video",
                        modelId: template?.defaultModelId,
                        templateId: template?.id,
                        params: { prompt: prompt || template?.promptScaffold || "", durationS: 5 },
                      }),
                    },
                  );
                  setJob(data.job);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not create job");
                } finally {
                  setIsPending(false);
                }
              }}
              placeholderPrompts={[]}
            />

            <div className="rounded-xl border border-white/[0.08] bg-panel p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Model</h3>
              <select
                value={template.defaultModelId || ""}
                onChange={() => {}}
                className="w-full bg-[#15151c] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-lime/50 outline-none"
                disabled
              >
                <option value={template.defaultModelId || ""}>{template.defaultModelId || "Default model"}</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => handleSubmit(template?.promptScaffold || "")}
                disabled={isPending}
                className="flex-1 bg-lime text-black px-6 py-3 rounded-xl font-bold hover:bg-lime/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isPending ? "Generating…" : "Generate from Template"}
              </button>
            </div>
          </div>
        </div>

        {job ? (
          <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-[12.5px] text-[rgba(214,225,255,0.6)]">Job {job.id}</p>
            <p className="mt-0.5 font-display text-[16px] font-semibold capitalize text-lime">
              {job.status}
            </p>
          </div>
        ) : null}
        {error && <div className="mt-4 text-center text-[13px] text-red-400">{error}</div>}
      </div>
      <Footer />
    </AppShell>
  );
}

import { Play } from "lucide-react";
