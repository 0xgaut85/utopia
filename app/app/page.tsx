import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/app/db";
import { BountyBrowser } from "@/components/app/bounty-browser";
import { AppPageHeader } from "@/components/app/app-page-header";
import { isBountyOpen } from "@/lib/app/bounty";

export const metadata: Metadata = {
  title: "Bounties",
};

export const dynamic = "force-dynamic";

function formatUsdc(amount: number) {
  return amount % 1 === 0
    ? amount.toLocaleString("en-US")
    : amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel min-w-0 px-3.5 py-3 sm:px-4 sm:py-3.5">
      <p className="text-[11px] font-medium text-app-faint">{label}</p>
      <p className="mt-1.5 text-lg tabular-nums tracking-tight text-app-text sm:text-xl">
        {value}
      </p>
    </div>
  );
}

export default async function MarketplacePage() {
  const tasks = await prisma.task.findMany({
    where: { NOT: { creator: { isSeed: true } } },
    orderBy: [{ status: "asc" }, { priceUsdc: "desc" }],
    include: {
      _count: { select: { submissions: true } },
      creator: { select: { username: true } },
    },
  });

  const open = tasks.filter((task) =>
    isBountyOpen({
      status: task.status,
      maxSubmissions: task.maxSubmissions,
      submissionCount: task._count.submissions,
      expiresAt: task.expiresAt,
    })
  );
  const onOffer = open.reduce((total, task) => total + task.priceUsdc, 0);

  return (
    <div className="app-page">
      <AppPageHeader
        eyebrow="Marketplace"
        title="Bounties"
        description="Pick a bounty, record a short clip in the app and submit it. When the buyer accepts your clip, the reward is yours."
        action={
          <Link
            href="/app/tasks/new"
            className="app-btn app-btn-primary w-full shrink-0 sm:w-auto"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Post a bounty
          </Link>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:grid-cols-4 sm:gap-3">
        <div className="panel min-w-0 px-3.5 py-3 sm:px-4 sm:py-3.5">
          <p className="text-[11px] font-medium text-app-faint">Available now</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <Image
              src="/usdc.svg"
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 shrink-0"
            />
            <span className="text-lg tabular-nums tracking-tight text-app-text sm:text-xl">
              {formatUsdc(onOffer)}
            </span>
            <span className="text-xs text-app-faint">USDC</span>
          </p>
        </div>
        <Stat label="Open bounties" value={String(open.length)} />
        <Stat label="All bounties" value={String(tasks.length)} />
        <Stat label="Points per USDC" value="100" />
      </div>

      {tasks.length === 0 ? (
        <div className="panel mt-6 px-6 py-20 text-center">
          <p className="text-sm text-app-muted">
            No bounties posted yet. Be the first to buy footage from the
            network.
          </p>
        </div>
      ) : (
        <BountyBrowser
          tasks={tasks.map((task) => ({
            id: task.id,
            title: task.title,
            brief: task.brief,
            category: task.category,
            locationName: task.locationName,
            lat: task.lat,
            lng: task.lng,
            priceUsdc: task.priceUsdc,
            maxSubmissions: task.maxSubmissions,
            status: task.status,
            submissionCount: task._count.submissions,
            createdAt: task.createdAt.toISOString(),
            creatorKind: task.creatorKind,
            creatorName:
              task.creatorKind === "user"
                ? (task.creator?.username ?? null)
                : null,
            depositNetwork: task.depositNetwork,
            depositTxHash: task.depositTxHash,
            expiresAt: task.expiresAt?.toISOString() ?? null,
          }))}
        />
      )}
    </div>
  );
}
