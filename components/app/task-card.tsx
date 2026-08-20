import Link from "next/link";
import { MapPin, Crosshair, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UsdcAmount } from "@/components/app/usdc-amount";
import { taskPoints } from "@/lib/app/points";

export type TaskCardData = {
  id: string;
  title: string;
  brief: string;
  category: string;
  locationName: string | null;
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

const categoryTint = {
  location: "tint-blue-bar",
  object: "tint-amber-bar",
  coverage: "tint-green-bar",
} as const;

export function TaskCard({
  task,
  index,
}: {
  task: TaskCardData;
  index: number;
}) {
  const Icon =
    categoryIcon[task.category as keyof typeof categoryIcon] ?? Crosshair;
  const tint =
    categoryTint[task.category as keyof typeof categoryTint] ?? "tint-amber-bar";
  const full = task.submissionCount >= task.maxSubmissions;
  const closed = task.status !== "open" || full;

  return (
    <Link
      href={`/app/tasks/${task.id}`}
      className={cn(
        "group flex flex-col bg-white shadow-[1px_1px_0_0_var(--color-line)] transition-colors",
        closed ? "opacity-50" : "hover:bg-black/[0.02]"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b border-line/70 px-4 py-1.5",
          tint
        )}
      >
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/60">
          <Icon className="h-3 w-3" strokeWidth={1.6} />
          {task.category}
          {task.locationName ? ` / ${task.locationName}` : ""}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/55">
          {String(index + 1).padStart(3, "0")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-4 py-4">
        <h3 className="font-display text-xl font-medium leading-snug tracking-tight text-ink">
          {task.title}
        </h3>
        <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-soft">
          {task.brief}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/40 px-4 py-2.5">
        <span className="flex items-center gap-2">
          <UsdcAmount
            amount={task.priceUsdc}
            className="bg-ink px-2 py-0.5 font-mono text-[11px] text-mist"
          />
          <span className="font-mono text-[10px] text-ink/55">
            +{taskPoints(task.priceUsdc).toLocaleString("en-US")} pts
          </span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/55">
          {closed
            ? "Closed"
            : `${task.submissionCount}/${task.maxSubmissions} filled`}
        </span>
      </div>
    </Link>
  );
}
