"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { JobView, MeView, ModelSummary } from "@app/shared";
import { ApiError, apiFetch, formatCredits } from "../lib/api";

const TERMINAL = new Set(["succeeded", "failed", "canceled"]);

export default function HomePage() {
  const [me, setMe] = useState<MeView | null>(null);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [durationS, setDurationS] = useState(5);
  const [quote, setQuote] = useState<number | null>(null);
  const [job, setJob] = useState<JobView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === modelId) ?? null,
    [models, modelId],
  );

  const loadMe = useCallback(async () => {
    const data = await apiFetch<MeView>("/v1/me");
    setMe(data);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [meData, catalog] = await Promise.all([
          apiFetch<MeView>("/v1/me"),
          apiFetch<{ models: ModelSummary[] }>("/v1/models?capability=text_to_video"),
        ]);
        if (cancelled) return;
        setMe(meData);
        setModels(catalog.models);
        setModelId(catalog.models[0]?.id ?? "");
      } catch (loadError) {
        if (cancelled) return;
        if (loadError instanceof ApiError && loadError.status === 401) {
          setMe(null);
        } else {
          setError(loadError instanceof Error ? loadError.message : "Could not load the app");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!modelId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch<{ quote: { credits: number } }>("/v1/quotes", {
          method: "POST",
          body: JSON.stringify({
            type: "text_to_video",
            modelId,
            params: { prompt: prompt || "placeholder", durationS },
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
  }, [modelId, durationS]);

  const jobId = job?.id;
  const jobStatus = job?.status;

  useEffect(() => {
    if (!jobId || !jobStatus || TERMINAL.has(jobStatus)) return;

    const timer = setInterval(async () => {
      try {
        const data = await apiFetch<{ job: JobView }>(`/v1/jobs/${jobId}`);
        setJob(data.job);
        if (TERMINAL.has(data.job.status)) {
          await loadMe();
        }
      } catch {
        // Keep the last known state; the next tick retries.
      }
    }, 2_000);

    return () => clearInterval(timer);
  }, [jobId, jobStatus, loadMe]);

  if (loading) return <p style={{ color: "#8b8b99" }}>Loading…</p>;

  if (!me) {
    return (
      <section>
        <h1 style={{ fontSize: "1.9rem" }}>Make a video from a sentence</h1>
        <p style={{ color: "#b9b9c6", lineHeight: 1.7, maxWidth: 560 }}>
          OpenArt turns a prompt into a short video. Sign in to use your credits, follow jobs
          live, and find every result in your library.
        </p>
        <p style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
          <Link href="/signup" style={primaryLink}>
            Create an account
          </Link>
          <Link href="/login" style={secondaryLink}>
            Sign in
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section>
      <header style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: 0 }}>What should we make?</h1>
        <span style={{ color: "#8b8b99", marginLeft: "auto" }}>
          {formatCredits(me.balance)}
        </span>
      </header>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);

          try {
            const data = await apiFetch<{ job: JobView }>("/v1/jobs", {
              method: "POST",
              headers: { "idempotency-key": crypto.randomUUID() },
              body: JSON.stringify({
                type: "text_to_video",
                modelId,
                params: { prompt, durationS },
              }),
            });
            setJob(data.job);
            await loadMe();
          } catch (createError) {
            setError(createError instanceof Error ? createError.message : "Could not create the job");
          } finally {
            setBusy(false);
          }
        }}
        style={{ display: "grid", gap: "0.85rem", marginTop: "1.5rem" }}
      >
        <textarea
          required
          rows={5}
          placeholder="A lighthouse on a cliff at dusk, slow aerial shot, cinematic"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          style={{ ...inputStyle, resize: "vertical" }}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem", alignItems: "end" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            Model
            <select
              value={modelId}
              onChange={(event) => setModelId(event.target.value)}
              style={inputStyle}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            Length
            <select
              value={durationS}
              onChange={(event) => setDurationS(Number(event.target.value))}
              style={inputStyle}
            >
              {[3, 5, 10].map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds} seconds
                </option>
              ))}
            </select>
          </label>

          <span style={{ color: "#b9b9c6", paddingBottom: "0.6rem" }}>
            {quote === null
              ? "Estimate unavailable"
              : `Costs ${formatCredits(quote)}${selectedModel ? ` · ${selectedModel.provider}` : ""}`}
          </span>

          <button
            type="submit"
            disabled={busy || !modelId}
            style={{ ...primaryButton, marginLeft: "auto" }}
          >
            {busy ? "Starting…" : "Generate video"}
          </button>
        </div>

        {error ? <p style={{ color: "#ff8b8b", margin: 0 }}>{error}</p> : null}
      </form>

      {job ? <JobCard job={job} /> : null}
    </section>
  );
}

function JobCard({ job }: { job: JobView }) {
  const output = job.assets?.find(
    (asset) => asset.role === "output" && asset.kind === "video" && asset.downloadUrl,
  );

  return (
    <article
      style={{
        marginTop: "2rem",
        border: "1px solid #23232c",
        borderRadius: 10,
        padding: "1rem",
      }}
    >
      <header style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
        <strong style={{ textTransform: "capitalize" }}>{job.status}</strong>
        <span style={{ color: "#8b8b99" }}>{job.progress}%</span>
        <Link href="/library" style={{ marginLeft: "auto", color: "#7cc4ff" }}>
          Library
        </Link>
      </header>

      <div
        style={{
          height: 6,
          background: "#1c1c24",
          borderRadius: 3,
          marginTop: "0.75rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${job.progress}%`,
            height: "100%",
            background: job.status === "failed" ? "#ff6b6b" : "#3b6cf6",
          }}
        />
      </div>

      {job.errorMessage ? (
        <p style={{ color: "#ff8b8b", marginTop: "0.75rem" }}>{job.errorMessage}</p>
      ) : null}

      {output?.downloadUrl ? (
        <video
          controls
          src={output.downloadUrl}
          style={{ width: "100%", marginTop: "1rem", borderRadius: 8 }}
        />
      ) : null}
    </article>
  );
}

const inputStyle = {
  background: "#15151c",
  border: "1px solid #2c2c36",
  borderRadius: 6,
  color: "#f5f5f7",
  padding: "0.55rem 0.7rem",
  font: "inherit",
} as const;

const primaryButton = {
  background: "#3b6cf6",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  padding: "0.65rem 1rem",
  cursor: "pointer",
  fontWeight: 600,
} as const;

const primaryLink = {
  background: "#3b6cf6",
  borderRadius: 6,
  color: "#fff",
  padding: "0.65rem 1rem",
  textDecoration: "none",
  fontWeight: 600,
} as const;

const secondaryLink = {
  border: "1px solid #35353f",
  borderRadius: 6,
  color: "#f5f5f7",
  padding: "0.65rem 1rem",
  textDecoration: "none",
} as const;
