import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Crosshair, Globe2 } from "lucide-react";
import { prisma } from "@/lib/app/db";
import { SubmitPanel } from "@/components/app/submit-panel";
import { ReviewPanel } from "@/components/app/review-panel";
import { UsdcAmount } from "@/components/app/usdc-amount";
import { BountyProof } from "@/components/app/bounty-proof";
import { creatorDisplay } from "@/lib/app/creator-kind";
import { taskPoints } from "@/lib/app/points";
import { isBountyOpen } from "@/lib/app/bounty";
import { RemainingTime } from "@/components/app/remaining-time";

const categoryIcon = {
  location: MapPin,
  object: Crosshair,
  coverage: Globe2,
} as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-4">
      <dt className="text-xs text-app-faint">{label}</dt>
      <dd className="mt-1 text-base text-app-text">{children}</dd>
    </div>
  );
}

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
  const open = isBountyOpen({
    status: task.status,
    maxSubmissions: task.maxSubmissions,
    submissionCount: task._count.submissions,
    expiresAt: task.expiresAt,
  });

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-sm text-app-muted transition-colors hover:text-app-text"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
        All bounties
      </Link>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <span className="flex items-center gap-1.5 text-sm capitalize text-app-muted">
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            {task.category}
          </span>

          <h1 className="mt-2 max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-app-text sm:text-3xl">
            {task.title}
          </h1>

          <p className="mt-4 max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-app-muted">
            {task.brief}
          </p>

          <div className="mt-5">
            <p className="text-sm text-app-text">
              {creatorDisplay(task.creatorKind, task.creator?.username)}
            </p>
            <p className="text-xs text-app-faint">Posted this bounty</p>
          </div>

          <div className="panel mt-4 px-4 py-3">
            <p className="text-xs text-app-faint">Bounty funding</p>
            <p className="mt-1 text-sm text-app-muted">
              This is the on-chain transaction that funded the reward into the
              Utopia escrow. Open it to confirm the deposit landed.
            </p>
            <BountyProof
              depositNetwork={task.depositNetwork}
              depositTxHash={task.depositTxHash}
              className="mt-2 text-sm"
            />
          </div>

          <dl className="panel mt-6 grid grid-cols-2 divide-x divide-y divide-app-line overflow-hidden sm:grid-cols-3 lg:grid-cols-5 sm:divide-y-0">
            <Fact label="Reward">
              <UsdcAmount amount={task.priceUsdc} />
              <span className="mt-0.5 block text-xs text-app-faint">
                +{taskPoints(task.priceUsdc).toLocaleString("en-US")} pts if
                accepted
              </span>
            </Fact>
            <Fact label="Submissions">
              <span className="tabular-nums">
                {task._count.submissions}/{task.maxSubmissions}
              </span>
            </Fact>
            <Fact label="Status">{open ? "Open" : "Closed"}</Fact>
            <Fact label="Closes">
              <RemainingTime
                expiresAt={task.expiresAt?.toISOString() ?? null}
              />
            </Fact>
            <Fact label="Location">
              <span className="line-clamp-2 break-words">
                {task.locationName ?? "Anywhere"}
              </span>
            </Fact>
          </dl>

          {task.lat !== null && task.lng !== null ? (
            <div className="panel mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <span className="font-mono text-sm tabular-nums text-app-muted">
                {task.lat.toFixed(4)}, {task.lng.toFixed(4)}
                {task.radiusM ? ` within ${task.radiusM}m` : ""}
              </span>
              <a
                href={`https://www.openstreetmap.org/?mlat=${task.lat}&mlon=${task.lng}#map=16/${task.lat}/${task.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-app-text underline underline-offset-4 hover:text-app-muted"
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
