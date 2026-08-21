import type { Metadata } from "next";
import Image from "next/image";
import { prisma } from "@/lib/app/db";

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
    totalBounties,
    openBounties,
    settledBounties,
    totalCaptures,
    acceptedCaptures,
    onOffer,
    volume,
    pointsAgg,
    sizeRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { submissions: { some: {} } } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "open" } }),
    prisma.task.count({ where: { status: "closed" } }),
    prisma.submission.count(),
    prisma.submission.count({ where: { status: "accepted" } }),
    prisma.task.aggregate({
      _sum: { priceUsdc: true },
      where: { status: "open" },
    }),
    prisma.task.aggregate({ _sum: { priceUsdc: true } }),
    prisma.user.aggregate({ _sum: { points: true } }),
    // Videos are stored as base64 data URLs in the `photo` column, so the
    // summed character length approximates raw bytes at a 3/4 ratio.
    prisma.$queryRaw<
      Array<{ total: bigint | null }>
    >`SELECT SUM(LENGTH(photo)) AS total FROM "Submission"`,
  ]);

  const base64Chars = Number(sizeRows[0]?.total ?? 0);
  const bytesCollected = base64Chars * 0.75;
  const gbCollected = bytesCollected / 1024 ** 3;

  return {
    totalUsers,
    contributors,
    totalBounties,
    openBounties,
    settledBounties,
    totalCaptures,
    acceptedCaptures,
    usdcOnOffer: onOffer._sum.priceUsdc ?? 0,
    totalVolume: volume._sum.priceUsdc ?? 0,
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
      <span className="text-3xl tabular-nums text-app-text sm:text-4xl">
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
    <div className="panel px-5 py-4">
      <p className="text-xs text-app-faint">{label}</p>
      <p className="mt-1.5 text-2xl tabular-nums text-app-text">
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
    <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-app-text sm:text-3xl">
        Analytics
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-app-muted">
        Bounties, contributors and value moving through Utopia. Every figure is
        read straight from the network.
      </p>

      <div className="mt-6 grid gap-3 sm:gap-4 lg:grid-cols-2">
        <section className="panel p-6">
          <p className="text-xs text-app-faint">USDC on offer</p>
          <div className="mt-3">
            <UsdcValue amount={a.usdcOnOffer} />
          </div>
          <p className="mt-2 text-sm text-app-muted">
            Across {n(a.openBounties)} open bounties right now
          </p>
        </section>

        <section className="panel p-6">
          <p className="text-xs text-app-faint">Total volume</p>
          <div className="mt-3">
            <UsdcValue amount={a.totalVolume} />
          </div>
          <p className="mt-2 text-sm text-app-muted">
            Committed across {n(a.totalBounties)} bounties all time
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
