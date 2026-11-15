import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionNav } from "@/components/session-nav";

export const metadata: Metadata = {
  title: "OpenArt",
  description: "AI video generation, powered by a resumable job engine.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-black text-white font-sans antialiased selection:bg-brand-pink selection:text-black"
      >
        <SessionNav />
        <main className="max-w-880 mx-auto p-4 sm:p-6 mb-24">{children}</main>
      </body>
    </html>
  );
}
