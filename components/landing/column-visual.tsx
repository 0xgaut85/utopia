import { ScrambleText } from "@/components/ui/scramble-text";
import { Logo3D } from "@/components/landing/logo-3d";

export function ColumnVisual() {
  return (
    <div className="relative flex flex-col border-line/70 lg:h-full lg:min-h-0 lg:border-l">
      <div className="hidden shrink-0 items-baseline justify-between gap-3 border-b border-t border-line/70 bg-mist/95 px-3 py-2 backdrop-blur-sm lg:flex lg:border-t-0 lg:sticky lg:top-0 lg:z-10">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs text-ink-soft">02</span>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink">
            <ScrambleText text="Field" />
          </h2>
        </div>
        <span className="font-mono text-[11px] text-ink-soft">Ground level captures</span>
      </div>

      <div className="relative min-h-[46vh] flex-1 overflow-hidden border-y border-line/70 bg-black/[0.02] lg:min-h-0 lg:border-y-0">
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
