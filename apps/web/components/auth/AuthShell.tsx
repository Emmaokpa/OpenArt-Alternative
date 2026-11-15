import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/ui";
import { AuthVisual } from "./AuthVisual";

/**
 * Full-bleed auth frame: studio artwork on the left, the form column on the
 * right. On small screens the artwork is swapped for a compact lime headline so
 * the form still lands above the fold.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] w-full bg-page lg:grid lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
      <AuthVisual />

      <section className="relative flex min-h-[100dvh] flex-col px-4 pb-10 pt-5 sm:px-8 lg:min-h-0 lg:justify-center lg:px-8 lg:py-10 xl:px-14">
        {/* ambient light + dot grid */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-44 left-1/2 h-[380px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(170,255,0,0.075),transparent_66%)] blur-2xl" />
          <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[432px] flex-1 flex-col lg:flex-none">
          {/* mobile brand */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <LogoMark className="h-7 w-7" />
                <span className="font-display text-[16px] font-bold tracking-[-0.3px] text-white">
                  OpenArt
                </span>
              </Link>
              <Link
                href="/"
                className="flex h-7 items-center gap-1 rounded-full px-2 text-[11.5px] text-white/40 transition hover:text-white"
              >
                <ArrowLeft className="h-3 w-3" strokeWidth={2.2} />
                Home
              </Link>
            </div>
          </div>

          {/* desktop back link */}
          <div className="mb-4 hidden items-center justify-between lg:flex">
            <Link
              href="/"
              className="group flex items-center gap-1.5 text-[12px] font-medium text-white/40 transition hover:text-white"
            >
              <ArrowLeft
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5"
                strokeWidth={2.2}
              />
              Back to studio
            </Link>
            <a
              href="mailto:support@openart.ai"
              className="text-[11.5px] text-white/25 transition hover:text-white/70"
            >
              Need help?
            </a>
          </div>

          <div className="my-auto lg:my-0">
            <div className="mt-7 lg:mt-0">{children}</div>

            <p className="mt-6 text-center text-[11px] leading-[17px] text-white/25">
              By continuing you agree to our{" "}
              <span className="text-white/45 underline decoration-white/20 underline-offset-2">
                Terms
              </span>{" "}
              and{" "}
              <span className="text-white/45 underline decoration-white/20 underline-offset-2">
                Privacy Policy
              </span>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
