import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScrambleText } from "@/components/ui/scramble-text";
import { ColumnScroll } from "@/components/landing/column-scroll";

type ColumnShellProps = {
  index: string;
  title: string;
  hint: string;
  children: ReactNode;
  autoScroll?: "up" | "down";
  divider?: boolean;
  className?: string;
};

export function ColumnShell({
  index,
  title,
  hint,
  children,
  autoScroll,
  divider = true,
  className,
}: ColumnShellProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col border-line/70 lg:h-full lg:min-h-0",
        divider && "lg:border-l",
        className
      )}
    >
      <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-line/70 bg-mist/95 px-3 py-2 backdrop-blur-sm lg:sticky lg:top-0 lg:z-10 lg:border-t-0">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-xs text-ink-soft">{index}</span>
          <h2 className="truncate font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink">
            <ScrambleText text={title} />
          </h2>
        </div>
        <span className="hidden max-w-[42%] truncate text-right font-mono text-[11px] text-ink-soft sm:inline">
          {hint}
        </span>
      </div>

      {autoScroll ? (
        <ColumnScroll direction={autoScroll} speed={55}>
          {children}
        </ColumnScroll>
      ) : (
        <div
          data-lenis-prevent
          className="flex flex-col divide-y divide-line/70 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:no-scrollbar"
        >
          {children}
        </div>
      )}
    </div>
  );
}
