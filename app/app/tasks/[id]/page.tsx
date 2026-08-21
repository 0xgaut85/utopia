import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Crosshair, Globe2 } from "lucide-react";
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
  const full = task._count.submissions >= task.maxSubmissions;
  const open = task.status === "open" && !full;

  return (
    <div>
      <div className="bar flex items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/app"
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-ink/50 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.6} />
          Marketplace
        </Link>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-ink/50">
          <Icon className="h-3 w-3" strokeWidth={1.6} />
          {task.category}
        </span>
      </div>

      <div className="grid lg:min-h-[calc(100svh-10.5rem)] lg:grid-cols-[1.2fr_1fr]">
        <div className="panel-dark grain border-0 lg:border-r lg:border-white/12">
          <div aria-hidden className="wash-dark" />
          <div
            aria-hidden
            className="grid-lines-dark pointer-events-none absolute inset-0 z-0"
          />

          <div className="relative z-[2] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <h1 className="max-w-2xl text-3xl font-medium leading-[1.15] tracking-tight text-mist sm:text-4xl">
              {task.title}
            </h1>
            <p className="mt-5 max-w-xl text-[13px] leading-relaxed text-mist/65">
              {task.brief}
            </p>
            {task.creator ? (
              <p className="mt-6 text-[10px] uppercase tracking-[0.16em] text-mist/40">
                Posted by {task.creator.username}
              </p>
            ) : null}
          </div>

          <dl className="relative z-[2] grid grid-cols-2 gap-px border-t border-white/12 bg-white/12 sm:grid-cols-4">
            <div className="bg-ink px-4 py-4 lg:px-5">
              <dt className="text-[10px] uppercase tracking-[0.16em] text-mist/45">
                Bounty
              </dt>
              <dd className="mt-1.5 text-lg tabular-nums text-mist">
                <UsdcAmount amount={task.priceUsdc} />
              </dd>
              <dd className="mt-0.5 text-[10px] text-mist/40">
                +{taskPoints(task.priceUsdc).toLocaleString("en-US")} pts if
                accepted
              </dd>
            </div>
            <div className="bg-ink px-4 py-4 lg:px-5">
              <dt className="text-[10px] uppercase tracking-[0.16em] text-mist/45">
                Filled
              </dt>
              <dd className="mt-1.5 text-lg tabular-nums text-mist">
                {task._count.submissions}/{task.maxSubmissions}
              </dd>
            </div>
            <div className="bg-ink px-4 py-4 lg:px-5">
              <dt className="text-[10px] uppercase tracking-[0.16em] text-mist/45">
                Status
              </dt>
              <dd className="mt-1.5 text-lg text-mist">
                {open ? "Open" : "Closed"}
              </dd>
            </div>
            <div className="bg-ink px-4 py-4 lg:px-5">
              <dt className="text-[10px] uppercase tracking-[0.16em] text-mist/45">
                Zone
              </dt>
              <dd className="mt-1.5 truncate text-lg text-mist">
                {task.locationName ?? "Anywhere"}
              </dd>
            </div>
          </dl>

          {task.lat !== null && task.lng !== null ? (
            <div className="relative z-[2] flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/12 bg-white/[0.04] px-4 py-3 sm:px-6 lg:px-8">
              <span className="text-[11px] tabular-nums text-mist/65">
                Target: {task.lat.toFixed(4)}, {task.lng.toFixed(4)}
                {task.radiusM ? ` within ${task.radiusM}m` : ""}
              </span>
              <a
                href={`https://www.openstreetmap.org/?mlat=${task.lat}&mlon=${task.lng}#map=16/${task.lat}/${task.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-mist underline underline-offset-4 hover:text-mist/70"
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
