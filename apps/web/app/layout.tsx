import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionNav } from "../components/session-nav";

export const metadata: Metadata = {
  title: "OpenArt",
  description: "AI video generation, powered by a resumable job engine.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background: "#0b0b0f",
          color: "#f5f5f7",
        }}
      >
        <SessionNav />
        <main style={{ maxWidth: 880, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
