import Link from "next/link";
import { LogoMark } from "@/components/ui";

/** Portrait crops from the same Pexels pool the studio uses. */
const px = (id: number, w = 720, h = 960) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

const tiles = [
  { id: "t1", src: px(31419072), delay: "0s", duration: "26s" },
  { id: "t2", src: px(8493475), delay: "-6s", duration: "30s" },
  { id: "t3", src: px(733872), delay: "-12s", duration: "24s" },
  { id: "t4", src: px(24589327), delay: "-18s", duration: "32s" },
  { id: "t5", src: px(9831878), delay: "-3s", duration: "28s" },
  { id: "t6", src: px(1043471), delay: "-9s", duration: "22s" },
];

/**
 * Left-hand brand panel on the auth screens: a full-height wall of studio
 * output, washed into the page with just the logo on top.
 */
export function AuthVisual() {
  return (
    <aside className="relative hidden overflow-hidden lg:block">
      {/* drifting artwork wall */}
      <div aria-hidden="true" className="absolute inset-0">
        <div className="grid h-full grid-cols-3 grid-rows-2 gap-2 p-3">
          {tiles.map((tile) => (
            <div
              key={tile.id}
              className="relative overflow-hidden rounded-2xl ring-1 ring-inset ring-white/[0.07]"
            >
              <img
                src={tile.src}
                alt=""
                loading="eager"
                decoding="async"
                className="animate-ken-burns h-full w-full object-cover saturate-[0.92]"
                style={{ animationDelay: tile.delay, animationDuration: tile.duration }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(9,10,10,0.42),transparent_60%)]" />
            </div>
          ))}
        </div>
      </div>

      {/* washes: edge blend, vignette, lime bloom */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(9,10,10,0)_55%,rgba(9,10,10,0.5)_86%,rgba(9,10,10,0.92)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgba(9,10,10,0.9)_0%,rgba(9,10,10,0.5)_55%,transparent_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(to_top,rgba(9,10,10,0.85)_0%,rgba(9,10,10,0.42)_55%,transparent_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(65%_42%_at_16%_96%,rgba(170,255,0,0.09),transparent_70%)] mix-blend-screen"
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-px bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.09),transparent)]"
      />

      {/* logo */}
      <div className="relative z-10 flex h-full flex-col p-10 xl:p-12">
        <Link
          href="/"
          className="flex w-fit items-center gap-2.5 rounded-full pr-2 transition-opacity hover:opacity-80"
        >
          <LogoMark className="h-8 w-8 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.8)]" />
          <span className="font-display text-[19px] font-bold tracking-[-0.4px] text-white">
            OpenArt
          </span>
        </Link>
      </div>
    </aside>
  );
}
