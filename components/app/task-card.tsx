import Link from "next/link";
import Image from "next/image";
import { MapPin, Crosshair, Globe2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskCardData = {
  id: string;
  title: string;
  brief: string;
  category: string;
  locationName: string | null;
  lat: number | null;
  lng: number | null;
  priceUsdc: number;
  maxSubmissions: number;
  status: string;
  submissionCount: number;
};

const categoryIcon = {
  location: MapPin,
  object: Crosshair,
  coverage: Globe2,
} as const;

function formatUsdc(amount: number) {
  return amount % 1 === 0
    ? amount.toLocaleString("en-US")
    : amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

function coordLine(task: TaskCardData) {
  if (task.lat !== null && task.lng !== null) {
    const ns = task.lat >= 0 ? "N" : "S";
    const ew = task.lng >= 0 ? "E" : "W";
    return `${Math.abs(task.lat).toFixed(4)}\u00B0 ${ns}  ${Math.abs(
      task.lng
    ).toFixed(4)}\u00B0 ${ew}`;
  }
  return "ANYWHERE / UNPINNED";
}

/**
 * Vertical 3:4 bounty preview. Every other card inverts to black so the grid
 * reads as a contact sheet rather than a list. Points are deliberately absent
 * here; the reward in USDC is the only number that matters at browse time.
 */
export function TaskCard({
  task,
  index,
}: {
  task: TaskCardData;
  index: number;
}) {
  const Icon =
    categoryIcon[task.category as keyof typeof categoryIcon] ?? Crosshair;
  const full = task.submissionCount >= task.maxSubmissions;
  const closed = task.status !== "open" || full;
  const dark = index % 5 === 2;
  const fill = Math.min(1, task.submissionCount / task.maxSubmissions);

  return (
    <Link
      href={`/app/tasks/${task.id}`}
      className={cn(
        "group grain relative flex aspect-[3/4] flex-col overflow-hidden border transition-all duration-300",
        dark
          ? "border-white/14 bg-ink text-mist"
          : "border-ink/12 bg-white text-ink",
        closed
          ? "opacity-45"
          : "hover:-translate-y-1 hover:shadow-[0_28px_60px_-30px_rgba(0,0,0,0.55)]"
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-0",
          dark ? "grid-lines-dark" : "grid-lines"
        )}
      />

      {/* Viewfinder brackets, so an image free card still reads as a frame. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
        {[
          "left-3 top-10 border-l border-t",
          "right-3 top-10 border-r border-t",
          "bottom-20 left-3 border-b border-l",
          "bottom-20 right-3 border-b border-r",
        ].map((position) => (
          <span
            key={position}
            className={cn(
              "absolute h-3.5 w-3.5",
              dark ? "border-white/25" : "border-ink/15",
              position
            )}
          />
        ))}
      </div>

      <div
        className={cn(
          "relative z-[2] flex items-center justify-between gap-2 border-b px-3 py-2",
          dark ? "border-white/14" : "border-ink/10"
        )}
      >
        <span
          className={cn(
            "flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]",
            dark ? "text-mist/70" : "text-ink/55"
          )}
        >
          <Icon className="h-3 w-3" strokeWidth={1.6} />
          {task.category}
        </span>
        <span
          className={cn(
            "text-[10px] tabular-nums tracking-[0.14em]",
            dark ? "text-mist/45" : "text-ink/35"
          )}
        >
          {String(index + 1).padStart(3, "0")}
        </span>
      </div>

      <div className="relative z-[2] flex flex-1 flex-col px-3 py-3.5">
        <h3
          className={cn(
            "text-[15px] font-medium leading-snug tracking-tight",
            dark ? "text-mist" : "text-ink"
          )}
        >
          {task.title}
        </h3>

        <p
          className={cn(
            "mt-2 line-clamp-3 text-[11.5px] leading-relaxed",
            dark ? "text-mist/60" : "text-ink/60"
          )}
        >
          {task.brief}
        </p>

        <div className="mt-auto pt-4">
          <span
            className={cn(
              "block text-[9px] uppercase tracking-[0.16em]",
              dark ? "text-mist/40" : "text-ink/35"
            )}
          >
            Coordinates
          </span>
          <span
            className={cn(
              "mt-1 block truncate text-[11px] tabular-nums",
              dark ? "text-mist/85" : "text-ink/75"
            )}
          >
            {coordLine(task)}
          </span>
          {task.locationName ? (
            <span
              className={cn(
                "mt-0.5 block truncate text-[10px] uppercase tracking-[0.12em]",
                dark ? "text-mist/45" : "text-ink/40"
              )}
            >
              {task.locationName}
            </span>
          ) : null}
        </div>
      </div>

      {/* Fill meter, a single hairline rather than a coloured bar. */}
      <div
        className={cn(
          "relative z-[2] h-px w-full",
          dark ? "bg-white/15" : "bg-ink/10"
        )}
      >
        <span
          className={cn("block h-px", dark ? "bg-mist" : "bg-ink")}
          style={{ width: `${Math.round(fill * 100)}%` }}
        />
      </div>

      <div
        className={cn(
          "relative z-[2] flex items-end justify-between gap-2 px-3 py-3",
          dark ? "bg-white/[0.04]" : "bg-ink/[0.02]"
        )}
      >
        <span className="flex items-baseline gap-1.5">
          <Image
            src="/usdc.svg"
            alt=""
            width={14}
            height={14}
            className="h-3.5 w-3.5 shrink-0 translate-y-0.5"
          />
          <span className="text-xl tabular-nums leading-none tracking-tight">
            {formatUsdc(task.priceUsdc)}
          </span>
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.14em]",
              dark ? "text-mist/55" : "text-ink/45"
            )}
          >
            USDC
          </span>
        </span>

        <span
          className={cn(
            "flex items-center gap-1 text-[10px] uppercase tracking-[0.12em]",
            dark ? "text-mist/55" : "text-ink/45"
          )}
        >
          {closed ? "Closed" : `${task.submissionCount}/${task.maxSubmissions}`}
          {closed ? null : (
            <ArrowUpRight
              className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={1.8}
            />
          )}
        </span>
      </div>
    </Link>
  );
}
