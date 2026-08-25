import type { Metadata } from "next";
import Image from "next/image";
import { prisma } from "@/lib/app/db";
import { isBountyOpen } from "@/lib/app/bounty";
import { PLATFORM_FEE_RATE, platformFeeOn } from "@/lib/app/payments";

export const metadata: Metadata = {
  title: "Analytics",
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

async function getAnalytics() {
  const [
    totalUsers,
    contributors,
    tasks,
    settledBounties,
    totalCaptures,
    acceptedCaptures,
    volume,
    pointsAgg,
    sizeRows,
  ] = await Promise.all([
    prisma.user.count({ where: { isSeed: false } }),
    prisma.user.count({
      where: { isSeed: false, submissions: { some: {} } },
    }),
    prisma.task.findMany({
      where: { NOT: { creator: { isSeed: true } } },
      select: {
        status: true,
        priceUsdc: true,
        maxSubmissions: true,
        expiresAt: true,
        _count: { select: { submissions: true } },
      },
    }),
    prisma.task.count({
      where: { status: "closed", NOT: { creator: { isSeed: true } } },
    }),
    prisma.submission.count({
      where: { user: { isSeed: false } },
    }),
    prisma.submission.count({
      where: { status: "accepted", user: { isSeed: false } },
    }),
    prisma.task.aggregate({
      _sum: { priceUsdc: true },
      where: { NOT: { creator: { isSeed: true } } },
    }),
    prisma.user.aggregate({
      _sum: { points: true },
      where: { isSeed: false },
    }),
    prisma.$queryRaw<
      Array<{ total: bigint | null }>
    >`SELECT SUM(COALESCE("sizeBytes", FLOOR(LENGTH(photo) * 0.75))) AS total FROM "Submission"`,
  ]);

  const open = tasks.filter((task) =>
    isBountyOpen({
      status: task.status,
      maxSubmissions: task.maxSubmissions,
      submissionCount: task._count.submissions,
      expiresAt: task.expiresAt,
    })
  );

  const bytesCollected = Number(sizeRows[0]?.total ?? 0);
  const gbCollected = bytesCollected / 1024 ** 3;

  return {
    totalUsers,
    contributors,
    totalBounties: tasks.length,
    openBounties: open.length,
    settledBounties,
    totalCaptures,
    acceptedCaptures,
    usdcOnOffer: open.reduce((total, task) => total + task.priceUsdc, 0),
    totalVolume: volume._sum.priceUsdc ?? 0,
    platformFee: tasks.reduce(
      (total, task) => total + platformFeeOn(task.priceUsdc),
      0
    ),
    pointsDistributed: pointsAgg._sum.points ?? 0,
    gbCollected,
  };
}

function UsdcValue({ amount }: { amount: number }) {
  return (
    <span className="flex items-baseline gap-2">
      <Image
        src="/usdc.svg"
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 shrink-0 translate-y-1"
      />
      <span className="text-2xl tabular-nums text-app-text sm:text-4xl">
        {formatUsdc(amount)}
      </span>
      <span className="text-sm text-app-faint">USDC</span>
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="panel px-4 py-3 sm:px-5 sm:py-4">
      <p className="text-xs text-app-faint">{label}</p>
      <p className="mt-1.5 text-xl tabular-nums text-app-text sm:text-2xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-app-faint">{hint}</p> : null}
    </div>
  );
}

export default async function AnalyticsPage() {
  const a = await getAnalytics();
  const n = (value: number) => value.toLocaleString("en-US");
  const gb = a.gbCollected.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-app-text sm:text-3xl">
        Analytics
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-app-muted">
        Bounties, contributors and value moving through Utopia. Every figure is
        read straight from the network.
      </p>

      <div className="mt-6 grid gap-3 sm:gap-4 lg:grid-cols-3">
        <section className="panel p-4 sm:p-6">
          <p className="text-xs text-app-faint">USDC on offer</p>
          <div className="mt-3">
            <UsdcValue amount={a.usdcOnOffer} />
          </div>
          <p className="mt-2 text-sm text-app-muted">
            Across {n(a.openBounties)} open bounties right now
          </p>
        </section>

        <section className="panel p-4 sm:p-6">
          <p className="text-xs text-app-faint">Total volume</p>
          <div className="mt-3">
            <UsdcValue amount={a.totalVolume} />
          </div>
          <p className="mt-2 text-sm text-app-muted">
            Committed across {n(a.totalBounties)} bounties all time
          </p>
        </section>

        <section className="panel p-4 sm:p-6">
          <p className="text-xs text-app-faint">Fee</p>
          <div className="mt-3">
            <UsdcValue amount={a.platformFee} />
          </div>
          <p className="mt-2 text-sm text-app-muted">
            {Math.round(PLATFORM_FEE_RATE * 100)}% of bounty rewards, kept as
            revenue
          </p>
        </section>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Open bounties" value={n(a.openBounties)} />
        <StatCard
          label="Total bounties"
          value={n(a.totalBounties)}
          hint={`${n(a.settledBounties)} settled`}
        />
        <StatCard label="Contributors" value={n(a.contributors)} />
        <StatCard label="Total users" value={n(a.totalUsers)} />
        <StatCard
          label="Clips submitted"
          value={n(a.totalCaptures)}
          hint={`${n(a.acceptedCaptures)} accepted`}
        />
        <StatCard
          label="Acceptance rate"
          value={
            a.totalCaptures
              ? `${Math.round((a.acceptedCaptures / a.totalCaptures) * 100)}%`
              : "0%"
          }
          hint="of clips accepted"
        />
        <StatCard
          label="Data collected"
          value={`${gb} GB`}
          hint="Footage stored on the network"
        />
        <StatCard
          label="Points distributed"
          value={n(a.pointsDistributed)}
          hint="100 points per USDC"
        />
      </div>
    </div>
  );
}
