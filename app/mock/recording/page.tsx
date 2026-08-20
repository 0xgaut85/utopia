"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Menu, SwitchCamera, MapPin, ShieldCheck, Square } from "lucide-react";

/**
 * Static mock of the in-app recording screen, for marketing screenshots.
 * Renders the exact app header and recorder markup in the "recording" state,
 * frozen mid-capture on Pennsylvania Ave NW, Washington DC.
 *
 * Footage: drop a vertical image at public/mock-footage.jpg, or pass
 * /mock/recording?src=/your-image.jpg. Screenshot at a phone viewport.
 */

const TIME_LINE = "2026-08-20 13:24:08 UTC";
const COORD_LINE = "38.89547, -77.03196";
const GEO_LINE = "United States / District of Columbia / Washington";

function MockRecording() {
  const params = useSearchParams();
  const src = params.get("src") ?? "/mock-footage.jpg";
  const [footageOk, setFootageOk] = useState(true);

  return (
    <div className="flex min-h-svh flex-col bg-white">
      {/* App header, signed-in mobile state */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-mist/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo-utopia.png"
              alt="Utopia"
              width={22}
              height={22}
              priority
              className="h-5 w-5 shrink-0"
            />
            <span className="truncate font-mono text-xs uppercase tracking-[0.18em] text-ink">
              Utopia <span className="text-ink/40">/ App</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center border border-line/70 bg-ink font-mono text-[10px] uppercase text-mist"
                >
                  c
                </span>
                <span className="hidden max-w-28 truncate font-mono text-[11px] text-ink sm:inline">
                  carson
                </span>
              </div>
              <span className="glass-btn px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                Exit
              </span>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center border border-line/70 text-ink-soft md:hidden">
              <Menu className="h-4 w-4" strokeWidth={1.6} />
            </span>
          </div>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col">
        {/* Submit panel, scrolled to the recorder */}
        <div className="border-b border-line/70 bg-black/[0.035] px-4 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/55">
            Record a clip:
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Clips are recorded live in the app with a verified Utopia overlay
            burned into every frame. Uploads of saved video are not accepted.
          </p>

          {/* Recorder in the recording state */}
          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden border border-line/70 bg-ink">
              <div
                className="relative aspect-[9/16] w-full"
                style={{ containerType: "inline-size" }}
              >
                {footageOk ? (
                  // eslint-disable-next-line @next/next/no-img-element -- swappable mock footage
                  <img
                    src={src}
                    alt=""
                    onError={() => setFootageOk(false)}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}

                {/* Burned-in overlay, same geometry as drawOverlay */}
                <div
                  className="absolute inset-x-0 bottom-0 font-mono"
                  style={{
                    fontSize: "2.3cqw",
                    padding: "1.1em",
                    background: "rgba(12,12,14,0.55)",
                    borderTop: "1px solid rgba(255,255,255,0.18)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start" style={{ gap: "0.6em" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- matches canvas-drawn mark */}
                      <img
                        src="/logo-utopia.png"
                        alt=""
                        className="shrink-0"
                        style={{
                          width: "2.4em",
                          height: "2.4em",
                          filter: "brightness(0) invert(1)",
                        }}
                      />
                      <div>
                        <div
                          className="font-accent italic text-white"
                          style={{ fontSize: "1.5em", lineHeight: 1 }}
                        >
                          Utopia
                        </div>
                        <div
                          className="text-white/70"
                          style={{ fontSize: "0.72em", marginTop: "0.4em" }}
                        >
                          VERIFIED CAPTURE
                        </div>
                      </div>
                    </div>
                    <div
                      className="text-right tabular-nums text-white"
                      style={{ lineHeight: 1.4 }}
                    >
                      <div>{TIME_LINE}</div>
                      <div>{COORD_LINE}</div>
                      <div className="text-white/85">{GEO_LINE}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute left-3 top-3 flex items-center gap-2 bg-black/55 px-2.5 py-1 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="font-mono text-[11px] tabular-nums text-mist">
                  07 / 20s
                </span>
              </div>

              <span className="absolute right-3 top-3 flex items-center gap-1.5 bg-black/55 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-mist backdrop-blur-sm">
                <SwitchCamera className="h-3.5 w-3.5" strokeWidth={1.6} />
                Flip
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink/55">
                <MapPin className="h-3 w-3" strokeWidth={1.6} />
                {GEO_LINE}
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
                <ShieldCheck className="h-3 w-3" strokeWidth={1.6} />
                Overlay burned in
              </span>
            </div>

            <span className="glass-btn glass-btn-dark flex items-center justify-center gap-2 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em]">
              <Square className="h-3.5 w-3.5" strokeWidth={1.6} />
              Stop recording
            </span>
          </div>

          <textarea
            rows={3}
            maxLength={500}
            placeholder="Optional note about the clip"
            readOnly
            className="w-full resize-none border border-line/70 bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-ink/40"
          />

          <span className="glass-btn glass-btn-dark flex items-center justify-center px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] opacity-40">
            Submit for review / +1,200 pts
          </span>
        </div>
      </main>
    </div>
  );
}

export default function MockRecordingPage() {
  return (
    <Suspense fallback={null}>
      <MockRecording />
    </Suspense>
  );
}
