import Link from "next/link";
import Image from "next/image";
import { MapPin, Crosshair, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BountyProof } from "@/components/app/bounty-proof";
import { RemainingTime } from "@/components/app/remaining-time";
import { isBountyOpen } from "@/lib/app/bounty";
import { creatorDisplay } from "@/lib/app/creator-kind";

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
  creatorKind: string;
  creatorName: string | null;
  depositNetwork: string | null;
  depositTxHash: string | null;
  expiresAt: string | null;
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
  if (task.lat === null || task.lng === null) return "Anywhere";
  const ns = task.lat >= 0 ? "N" : "S";
  const ew = task.lng >= 0 ? "E" : "W";
  return `${Math.abs(task.lat).toFixed(4)}\u00B0${ns} ${Math.abs(
    task.lng
  ).toFixed(4)}\u00B0${ew}`;
}

/** Vertical 3:4 bounty preview. Reward and location only, no points. */
export function TaskCard({ task }: { task: TaskCardData }) {
  const Icon =
    categoryIcon[task.category as keyof typeof categoryIcon] ?? Crosshair;
  const closed = !isBountyOpen({
    status: task.status,
    maxSubmissions: task.maxSubmissions,
    submissionCount: task.submissionCount,
    expiresAt: task.expiresAt,
  });

  return (
    <article
      className={cn(
        "panel flex min-h-[22rem] flex-col overflow-hidden sm:aspect-[3/4] sm:min-h-0",
        closed && "opacity-50"
      )}
    >
      <Link
        href={`/app/tasks/${task.id}`}
        className={cn(
          "flex min-h-0 flex-1 flex-col p-3.5 transition-colors sm:p-4",
          !closed && "hover:bg-app-surface-hi"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs capitalize text-app-muted">
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            {task.category}
          </span>
          {closed ? (
            <span className="rounded-md bg-app-bg px-1.5 py-0.5 text-[11px] text-app-faint">
              Closed
            </span>
          ) : (
            <span className="text-[11px] text-app-faint">
              <RemainingTime expiresAt={task.expiresAt} />
            </span>
          )}
        </div>

        <h3 className="mt-3 text-[15px] font-medium leading-snug text-app-text">
          {task.title}
        </h3>

        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-app-muted">
          {task.brief}
        </p>

        <div className="mt-auto pt-4">
          <p className="truncate text-[13px] text-app-text">
            {task.locationName ?? "Any location"}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] tabular-nums text-app-faint">
            {coordLine(task)}
          </p>
        </div>
      </Link>

      <div className="border-t border-app-line px-3.5 py-3 sm:px-4">
        <p className="truncate text-[13px] text-app-text">
          {creatorDisplay(task.creatorKind, task.creatorName)}
        </p>

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <span className="flex items-baseline gap-1.5">
            <Image
              src="/usdc.svg"
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 translate-y-0.5"
            />
            <span className="text-lg tabular-nums leading-none text-app-text">
              {formatUsdc(task.priceUsdc)}
            </span>
            <span className="text-[11px] text-app-faint">USDC</span>
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-app-faint">
            {task.submissionCount}/{task.maxSubmissions}
          </span>
        </div>

        <BountyProof
          depositNetwork={task.depositNetwork}
          depositTxHash={task.depositTxHash}
          className="mt-2 text-[11px]"
        />
      </div>
    </article>
  );
}
