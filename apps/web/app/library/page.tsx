"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { JobView } from "@app/shared";
import { ApiError, apiFetch, formatCredits } from "../../lib/api";

export default function LibraryPage() {
  const [jobs, setJobs] = useState<JobView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

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
          setSignedOut(true);
        } else {
          setError(loadError instanceof Error ? loadError.message : "Could not load your library");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (signedOut) {
    return (
      <section>
        <h1 style={{ fontSize: "1.6rem" }}>Your library</h1>
        <p style={{ color: "#b9b9c6" }}>
          <Link href="/login" style={{ color: "#7cc4ff" }}>
            Sign in
          </Link>{" "}
          to see your creations.
        </p>
      </section>
    );
  }

  if (error) return <p style={{ color: "#ff8b8b" }}>{error}</p>;
  if (!jobs) return <p style={{ color: "#8b8b99" }}>Loading…</p>;

  return (
    <section>
      <header style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: 0 }}>Your library</h1>
        <Link href="/" style={{ marginLeft: "auto", color: "#7cc4ff" }}>
          New video
        </Link>
      </header>

      {jobs.length === 0 ? (
        <p style={{ color: "#b9b9c6", marginTop: "1.5rem" }}>
          Nothing here yet. <Link href="/" style={{ color: "#7cc4ff" }}>Make your first video</Link>.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "1rem", marginTop: "1.5rem" }}>
          {jobs.map((job) => {
            const output = job.assets?.find((asset) => asset.role === "output");
            const thumbnail = job.assets?.find((asset) => asset.role === "thumbnail");

            return (
              <li
                key={job.id}
                style={{ border: "1px solid #23232c", borderRadius: 10, padding: "0.9rem 1rem" }}
              >
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
                  <strong style={{ textTransform: "capitalize" }}>{job.status}</strong>
                  <span style={{ color: "#8b8b99" }}>
                    {job.type.replaceAll("_", " ")} · {formatCredits(job.creditCost)} ·{" "}
                    {new Date(job.createdAt).toLocaleString()}
                  </span>
                  <span style={{ marginLeft: "auto", color: "#8b8b99" }}>{job.progress}%</span>
                </div>

                <p style={{ color: "#b9b9c6", margin: "0.5rem 0 0" }}>
                  {typeof job.params.prompt === "string" ? job.params.prompt : "(no prompt)"}
                </p>

                {job.errorMessage ? (
                  <p style={{ color: "#ff8b8b", margin: "0.5rem 0 0" }}>{job.errorMessage}</p>
                ) : null}

                {output?.downloadUrl ? (
                  <video
                    controls
                    preload="metadata"
                    poster={thumbnail?.downloadUrl}
                    src={output.downloadUrl}
                    style={{ width: "100%", maxWidth: 480, marginTop: "0.75rem", borderRadius: 8 }}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
