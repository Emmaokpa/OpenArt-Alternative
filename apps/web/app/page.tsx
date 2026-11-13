const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function Home() {
  return (
    <main style={{ maxWidth: 560, padding: "2rem" }}>
      <h1 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>Web app is live</h1>
      <p style={{ lineHeight: 1.6, color: "#b9b9c6" }}>
        Phase 0 deployment check. The product UI is built in Phase 3.
      </p>
      <dl style={{ lineHeight: 1.9, marginTop: "2rem" }}>
        <dt style={{ color: "#8b8b99" }}>API base URL</dt>
        <dd style={{ margin: 0 }}>
          <code>{apiUrl}</code>
        </dd>
        <dt style={{ color: "#8b8b99", marginTop: "1rem" }}>API health</dt>
        <dd style={{ margin: 0 }}>
          <a href={`${apiUrl}/healthz`} style={{ color: "#7cc4ff" }}>
            {apiUrl}/healthz
          </a>
        </dd>
      </dl>
    </main>
  );
}
