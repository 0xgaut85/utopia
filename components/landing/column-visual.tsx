import { ScrambleText } from "@/components/ui/scramble-text";
import { Logo3D } from "@/components/landing/logo-3d";

export function ColumnVisual() {
  return (
    <div className="relative flex flex-col border-line/70 lg:h-full lg:min-h-0 lg:border-l">
      <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-line/70 bg-mist/95 px-3 py-2 backdrop-blur-sm lg:sticky lg:top-0 lg:z-10 lg:border-t-0">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-xs text-ink-soft">02</span>
          <h2 className="truncate font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink">
            <ScrambleText text="Field" />
          </h2>
        </div>
        <span className="hidden max-w-[42%] truncate text-right font-mono text-[11px] text-ink-soft sm:inline">
          Ground level captures
        </span>
      </div>

      <div className="relative min-h-[34vh] flex-1 overflow-hidden border-b border-line/70 bg-black/[0.02] sm:min-h-[40vh] lg:min-h-0 lg:border-b-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(120,150,220,0.10),transparent_60%)]" />
        <Logo3D />
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/30">
            Utopia network mark
          </span>
        </div>
      </div>
    </div>
  );
}
