"use client";

import Link from "next/link";

export function Footer() {
  const links = [
    "About",
    "Pricing",
    "API",
    "Affiliates",
    "Blog",
    "Terms",
    "Privacy",
    "Discord",
    "X",
  ];
  return (
    <footer className="mt-16 border-t border-white/[0.06] pb-10 pt-6">
      <div className="flex flex-col items-start justify-between gap-3 text-[11.5px] text-white/40 sm:flex-row sm:items-center">
        <p>© 2026 OpenArt. Crafted for creators.</p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {links.map((l) => (
            <Link key={l} href="#" className="transition hover:text-white/80">
              {l}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
