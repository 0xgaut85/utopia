import Image from "next/image";
import { ScrambleText } from "@/components/ui/scramble-text";

export function AppComingSoon() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-mist px-4">
      <div className="w-full max-w-md border border-line/70 bg-white">
        <div className="flex items-center justify-between border-b border-line/70 bg-black/[0.035] px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
            Utopia / app status:
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
            001
          </span>
        </div>

        <div className="space-y-6 px-6 py-10 text-center">
          <Image
            src="/logo-utopia.png"
            alt="Utopia"
            width={40}
            height={40}
            priority
            className="mx-auto h-10 w-10"
          />

          <h1 className="font-display text-4xl font-medium tracking-tight text-ink">
            <ScrambleText text="Coming soon" duration={1600} />
          </h1>

          <p className="mx-auto max-w-xs text-sm leading-relaxed text-ink-soft">
            The Utopia data marketplace is not live yet. Bounties, the
            leaderboard and contributor profiles will open here.
          </p>

          <div className="bg-ink px-4 py-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mist/60">
              Follow for launch updates
            </p>
            <a
              href="https://x.com/utopiadata"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-mono text-sm text-mist underline underline-offset-4 hover:text-mist/70"
            >
              @utopiadata
            </a>
          </div>

          <a
            href="https://utopiadata.net"
            className="inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-ink/45 underline underline-offset-4 hover:text-ink"
          >
            Back to utopiadata.net
          </a>
        </div>
      </div>
    </div>
  );
}
