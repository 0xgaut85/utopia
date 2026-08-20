import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Crosshair, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/app/db";
import { SubmitPanel } from "@/components/app/submit-panel";
import { ReviewPanel } from "@/components/app/review-panel";
import { UsdcAmount } from "@/components/app/usdc-amount";
import { taskPoints } from "@/lib/app/points";

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

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      _count: { select: { submissions: true } },
      creator: { select: { id: true, username: true } },
    },
  });

  if (!task) notFound();

  const Icon =
    categoryIcon[task.category as keyof typeof categoryIcon] ?? Crosshair;
  const tint =
    categoryTint[task.category as keyof typeof categoryTint] ?? "tint-amber-bar";
  const full = task._count.submissions >= task.maxSubmissions;
  const open = task.status === "open" && !full;

  return (
    <div>
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b border-line/70 px-4 py-1.5 sm:px-6",
          tint
        )}
      >
        <Link
          href="/app"
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/60 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.6} />
          Marketplace
        </Link>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/60">
          <Icon className="h-3 w-3" strokeWidth={1.6} />
          {task.category}
        </span>
      </div>

      <div className="grid lg:min-h-[calc(100svh-10.5rem)] lg:grid-cols-[1.2fr_1fr]">
        <div className="border-b border-line/70 lg:border-b-0 lg:border-r">
          <div className="px-4 py-8 sm:px-6 sm:py-10">
            <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl">
              {task.title}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-soft">
              {task.brief}
            </p>
            {task.creator ? (
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
                Posted by {task.creator.username}
              </p>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 border-t border-line/70 sm:grid-cols-4">
            <div className="border-b border-r border-line/40 px-4 py-3 sm:border-b-0">
              <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
                Bounty
              </dt>
              <dd className="mt-1 font-mono text-lg text-ink">
                <UsdcAmount amount={task.priceUsdc} />
              </dd>
              <dd className="font-mono text-[10px] text-ink/45">
                +{taskPoints(task.priceUsdc).toLocaleString("en-US")} pts if
                accepted
              </dd>
            </div>
            <div className="border-b border-line/40 px-4 py-3 sm:border-b-0 sm:border-r">
              <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
                Filled
              </dt>
              <dd className="mt-1 font-mono text-lg text-ink">
                {task._count.submissions}/{task.maxSubmissions}
              </dd>
            </div>
            <div className="border-r border-line/40 px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
                Status
              </dt>
              <dd className="mt-1 font-mono text-lg text-ink">
                {open ? "Open" : "Closed"}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
                Zone
              </dt>
              <dd className="mt-1 truncate font-mono text-lg text-ink">
                {task.locationName ?? "Anywhere"}
              </dd>
            </div>
          </dl>

          {task.lat !== null && task.lng !== null ? (
            <div className="border-t border-line/70 bg-black/[0.02] px-4 py-3 sm:px-6">
              <span className="font-mono text-[11px] text-ink-soft">
                Target: {task.lat.toFixed(4)}, {task.lng.toFixed(4)}
                {task.radiusM ? ` within ${task.radiusM}m` : ""}
              </span>
              <a
                href={`https://www.openstreetmap.org/?mlat=${task.lat}&mlon=${task.lng}#map=16/${task.lat}/${task.lng}`}
                target="_blank"
                rel="noreferrer"
                className="ml-3 font-mono text-[11px] text-ink underline underline-offset-4 hover:text-ink/70"
              >
                View on map
              </a>
            </div>
          ) : null}
        </div>

        <SubmitPanel
          taskId={task.id}
          priceUsdc={task.priceUsdc}
          open={open}
          requiresLocation={task.lat !== null && task.lng !== null}
        />
      </div>

      <ReviewPanel
        taskId={task.id}
        creatorId={task.creator?.id ?? null}
        priceUsdc={task.priceUsdc}
      />
    </div>
  );
}
