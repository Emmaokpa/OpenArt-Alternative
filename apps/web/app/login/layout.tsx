import type { ReactNode } from "react";

export default function CenteredLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[880px] px-4 py-4 sm:px-6 sm:py-6 mb-24">
      {children}
    </main>
  );
}
