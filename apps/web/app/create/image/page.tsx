"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell/AppShell";
import { Footer } from "@/components/shell/Footer";
import { PromoBanner } from "@/components/shell/PromoBanner";
import { PromptBox } from "@/components/create/PromptBox";
import { apiFetch, formatCredits } from "@/lib/api";

export default function CreateImagePage() {
  const { user } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<{ id: string; status: string } | null>(null);
  const [quote, setQuote] = useState<number | null>(null);

  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [size, setSize] = useState("1024x1024");

  // Check for template prefill from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const templatePrompt = params.get("prompt");
      const templateModel = params.get("model");
      if (templatePrompt) setPrompt(templatePrompt);
      if (templateModel) setModelId(templateModel);
    }
  }, []);

  useEffect(() => {
    if (!modelId || !prompt) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ quote: { credits: number } }>("/v1/quotes", {
          method: "POST",
          body: JSON.stringify({
            type: "text_to_image",
            modelId,
            params: { prompt: prompt || "placeholder", size },
          }),
        });
        if (!cancelled) setQuote(data.quote.credits);
      } catch {
        if (!cancelled) setQuote(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modelId, prompt, size]);

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
            type: "text_to_image",
            modelId,
            params: { prompt, size },
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
          <p className="text-white/60 mb-6">Please sign in to generate images.</p>
          <Link href="/login" className="bg-lime text-black px-6 py-3 rounded-xl font-bold hover:bg-lime/90 transition block">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppShell active="home">
      <PromoBanner onClose={() => {}} />

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Create Image</h1>
            <p className="text-white/60 text-sm">Generate an image from a text prompt</p>
          </div>
          <Link href="/" className="text-[12px] font-medium text-white/70 hover:text-white">
            ← Back to home
          </Link>
        </div>

        <PromptBox
          onSubmit={handleSubmit}
          defaultPrompt={prompt}
          placeholderPrompts={[
            "A cinematic product shot of a luxury watch on a marble surface",
            "An anime scene in heavy rain, neon lights reflecting on wet pavement",
            "A cute sticker illustration of a small dragon eating a cupcake",
            "A lighthouse on a cliff at dusk, slow aerial shot, cinematic",
            "Cyberpunk city street with holographic advertisements",
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-white/[0.08] bg-panel p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Model</h3>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full bg-[#15151c] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-lime/50 outline-none"
            >
              <option value="">Select a model</option>
              <option value="fake-image">Fake Image (dev)</option>
              <option value="flux-schnell">FLUX.1 [schnell]</option>
              <option value="flux-dev">FLUX.1 [dev]</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-white">Size</h3>
            <div className="flex gap-2">
              {["1024x1024", "768x768", "512x512", "1024x1792", "1792x1024"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex-1 py-2 rounded-lg border text-sm text-white/80 transition ${size === s ? "bg-lime/20 border-lime text-black" : "border-white/10 hover:border-white/20"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Estimated cost:</span>
            <span className="text-sm font-bold text-lime">
              {quote === null ? "—" : formatCredits(quote)}
            </span>
          </div>
          <button
            onClick={() => handleSubmit(prompt)}
            disabled={isPending || !modelId || !prompt.trim()}
            className="flex-1 bg-lime text-black px-6 py-3 rounded-xl font-bold hover:bg-lime/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isPending ? "Generating…" : "Generate Image"}
          </button>
        </div>

        {error && <div className="mt-4 text-center text-[13px] text-red-400">{error}</div>}

        {job ? (
          <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-[12.5px] text-[rgba(214,225,255,0.6)]">Job {job.id}</p>
            <p className="mt-0.5 font-display text-[16px] font-semibold capitalize text-lime">
              {job.status}
            </p>
          </div>
        ) : null}
      </div>

      <Footer />
    </AppShell>
  );
}
