import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthWrapper } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "OpenArt — AI Video Generator",
  description: "AI video generation, powered by a resumable job engine.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap"
        />
      </head>
      <body className="min-h-screen bg-page text-white font-sans antialiased selection:bg-lime selection:text-black">
        <AuthWrapper>{children}</AuthWrapper>
      </body>
    </html>
  );
}
