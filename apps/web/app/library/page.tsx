"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell/AppShell";
import { Footer } from "@/components/shell/Footer";
import type { JobView } from "@app/shared";
import { ApiError, apiFetch } from "@/lib/api";

export default function LibraryPage() {
  const { user, isLoading } = useAuth();
  const [jobs, setJobs] = useState<JobView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch<{ jobs: JobView[]; nextCursor: string | null }>(
          "/v1/jobs?limit=20",
        );
        if (!cancelled) setJobs(data.jobs);
      } catch (loadError) {
        if (cancelled) return;
        if (loadError instanceof ApiError && loadError.status === 401) {
          window.location.href = "/login";
        } else {
          setError(loadError instanceof Error ? loadError.message : "Could not load your library");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime" />
      </div>
    );
  }

  if (!user) {
    return (
      <AppShell active="library">
        <div className="max-w-md text-center py-20">
          <h1 className="text-2xl font-bold text-white mb-4">Library</h1>
          <p className="text-white/60 mb-6">Please sign in to view your creations.</p>
          <Link href="/login" className="bg-lime text-black px-6 py-3 rounded-xl font-bold hover:bg-lime/90 transition block">
            Sign in
          </Link>
        </div>
        <Footer />
      </AppShell>
    );
  }

  if (error) return <p className="text-center text-[13px] text-red-400 mt-20">{error}</p>;
  if (!jobs) return <p className="text-center text-[13px] text-white/60 mt-20">Loading…</p>;

  const handleDelete = async (jobId: string) => {
    setDeleting(jobId);
    try {
      await apiFetch(`/v1/jobs/${jobId}`, { method: "DELETE" });
      setJobs((prev) => (prev || []).filter((j) => j.id !== jobId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete job");
    } finally {
      setDeleting(null);
    }
  };

  const handleRetry = (job: JobView) => {
    window.location.href = `/create/video?prompt=${encodeURIComponent(typeof job.params.prompt === "string" ? job.params.prompt : "")}&model=${job.modelId}`;
  };

  return (
    <AppShell active="library">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Your Library</h1>
        <Link href="/" className="text-[12px] font-medium text-white/70 hover:text-white">
          New video
        </Link>
      </header>

      {jobs.length === 0 ? (
        <p className="text-white/60 mt-10 text-center">
          Nothing here yet. <Link href="/" className="text-lime font-medium">Make your first video</Link>.
        </p>
      ) : (
        <ul className="list-none p-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {jobs.map((job) => {
            const output = job.assets?.find((asset) => asset.role === "output" && asset.kind === "video");
            const thumbnail = job.assets?.find((asset) => asset.role === "thumbnail");

            return (
              <li key={job.id} className="rounded-xl border border-white/[0.08] bg-panel p-4">
                <div className="flex gap-2 items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-white capitalize">{job.status}</span>
                  <span className="text-xs text-white/60">{job.progress}%</span>
                  {job.status === "queued" || job.status === "running" ? (
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={deleting === job.id}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>

                <p className="text-[12px] text-white/60 line-clamp-2 mb-3">
                  {typeof job.params.prompt === "string" ? job.params.prompt : "(no prompt)"}
                </p>

                {job.errorMessage ? (
                  <p className="text-[12px] text-red-400 mb-3">{job.errorMessage}</p>
                ) : null}

                {output?.downloadUrl ? (
                  <div className="relative aspect-video rounded-lg bg-[#141414] overflow-hidden mb-3">
                    <video
                      controls
                      preload="metadata"
                      poster={thumbnail?.downloadUrl}
                      src={output.downloadUrl}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition group-hover:opacity-0 group-hover:pointer-events-none opacity-0">
                      <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
                        <Play className="ml-0.5 h-5 w-5 text-white" fill="currentColor" />
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    {job.status === "succeeded" && output?.downloadUrl ? (
                      <a
                        href={output.downloadUrl}
                        download
                        className="text-[12px] font-medium text-lime hover:text-lime/90 flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> Download
                      </a>
                    ) : null}
                    {job.status === "failed" && (
                      <button
                        onClick={() => handleRetry(job)}
                        className="text-[12px] font-medium text-lime hover:text-lime/90 flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Retry
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-white/50">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Footer />
    </AppShell>
  );
}

import { Play, Download, RotateCcw } from "lucide-react";
