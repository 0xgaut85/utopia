import type { Metadata } from "next";
import Image from "next/image";
import { prisma } from "@/lib/app/db";
import { cn } from "@/lib/utils";

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
        alt="USDC"
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 translate-y-1"
      />
      <span className="font-mono text-4xl tracking-tight text-ink sm:text-5xl">
        {formatUsdc(amount)}
      </span>
      <span className="font-mono text-sm text-ink/55">USDC</span>
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  tint,
}: {
  label: string;
  value: string;
  hint?: string;
  tint: string;
}) {
  return (
    <div className={cn("color-card px-5 py-6", tint)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/60">
        {label}
      </p>
      <p className="mt-3 font-mono text-3xl tracking-tight text-ink sm:text-4xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 font-mono text-[11px] text-ink/50">{hint}</p>
      ) : null}
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
    <div className="relative overflow-hidden">
      <div className="analytics-aurora" aria-hidden />

      <div className="relative z-10">
        <div className="border-b border-line/70 bg-white/40 px-4 py-1.5 backdrop-blur-sm sm:px-6 lg:px-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
            Network analytics:
          </span>
        </div>

        <div className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <h1 className="max-w-3xl font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
            The ground truth network, in numbers.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
            Live figures across bounties, contributors and value flowing
            through Utopia. Everything below is read straight from the network.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className={cn("color-card glass-sheen px-6 py-8", "tint-blue")}>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/60">
                USDC on offer
              </p>
              <div className="mt-4">
                <UsdcValue amount={a.usdcOnOffer} />
              </div>
              <p className="mt-2 font-mono text-[11px] text-ink/55">
                Across {n(a.openBounties)} open bounties right now
              </p>
            </div>

            <div
              className={cn("color-card glass-sheen px-6 py-8", "tint-green")}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/60">
                Total volume
              </p>
              <div className="mt-4">
                <UsdcValue amount={a.totalVolume} />
              </div>
              <p className="mt-2 font-mono text-[11px] text-ink/55">
                Committed across {n(a.totalBounties)} bounties all time
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Open bounties"
              value={n(a.openBounties)}
              tint="tint-blue"
            />
            <StatCard
              label="Total bounties"
              value={n(a.totalBounties)}
              hint={`${n(a.settledBounties)} settled`}
              tint="tint-green"
            />
            <StatCard
              label="Contributors"
              value={n(a.contributors)}
              tint="tint-amber"
            />
            <StatCard
              label="Total users"
              value={n(a.totalUsers)}
              tint="tint-pink"
            />
            <StatCard
              label="Clips submitted"
              value={n(a.totalCaptures)}
              hint={`${n(a.acceptedCaptures)} accepted`}
              tint="tint-purple"
            />
            <StatCard
              label="Points distributed"
              value={n(a.pointsDistributed)}
              hint="1 USDC = 100 points"
              tint="tint-blue"
            />
            <StatCard
              label="Avg bounty"
              value={
                a.totalBounties
                  ? `${formatUsdc(
                      Math.round((a.totalVolume / a.totalBounties) * 100) / 100
                    )}`
                  : "0"
              }
              hint="USDC per bounty"
              tint="tint-green"
            />
            <StatCard
              label="Acceptance rate"
              value={
                a.totalCaptures
                  ? `${Math.round(
                      (a.acceptedCaptures / a.totalCaptures) * 100
                    )}%`
                  : "0%"
              }
              hint="of clips accepted"
              tint="tint-amber"
            />
            <StatCard
              label="Data collected"
              value={`${gb} GB`}
              hint="Footage stored on the network"
              tint="tint-purple"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
