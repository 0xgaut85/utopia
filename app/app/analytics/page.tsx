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

function UsdcValue({ amount, dark }: { amount: number; dark?: boolean }) {
  return (
    <span className="flex items-baseline gap-2">
      <Image
        src="/usdc.svg"
        alt="USDC"
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 translate-y-1"
      />
      <span
        className={cn(
          "text-4xl tabular-nums tracking-tight sm:text-5xl",
          dark ? "text-mist" : "text-ink"
        )}
      >
        {formatUsdc(amount)}
      </span>
      <span
        className={cn(
          "text-sm uppercase tracking-[0.12em]",
          dark ? "text-mist/50" : "text-ink/45"
        )}
      >
        USDC
      </span>
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  dark,
  wide,
}: {
  label: string;
  value: string;
  hint?: string;
  dark?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "grain flex flex-col justify-between px-5 py-6",
        dark ? "panel-dark" : "panel",
        wide && "sm:col-span-2"
      )}
    >
      <p
        className={cn(
          "relative z-[2] text-[10px] uppercase tracking-[0.16em]",
          dark ? "text-mist/45" : "text-ink/45"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "relative z-[2] mt-6 text-3xl tabular-nums tracking-tight sm:text-4xl",
          dark ? "text-mist" : "text-ink"
        )}
      >
        {value}
      </p>
      {hint ? (
        <p
          className={cn(
            "relative z-[2] mt-1 text-[11px]",
            dark ? "text-mist/45" : "text-ink/45"
          )}
        >
          {hint}
        </p>
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
      <div className="bar px-4 py-2 sm:px-6 lg:px-8">
        <span className="text-[10px] uppercase tracking-[0.16em] text-ink/50">
          Network analytics:
        </span>
      </div>

      <div className="relative">
        <div aria-hidden className="wash" />

        <div className="relative z-[2] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
            <section className="panel-dark grain flex flex-col justify-between p-6 sm:p-8 lg:col-span-2">
              <div
                aria-hidden
                className="grid-lines-dark pointer-events-none absolute inset-0 z-0"
              />
              <div className="relative z-[2]">
                <span className="text-[10px] uppercase tracking-[0.16em] text-mist/45">
                  Live figures
                </span>
                <h1 className="mt-4 max-w-xl text-3xl font-medium leading-[1.15] tracking-tight text-mist sm:text-4xl">
                  The ground truth network, in numbers.
                </h1>
                <p className="mt-4 max-w-md text-[13px] leading-relaxed text-mist/60">
                  Bounties, contributors and value moving through Utopia.
                  Everything here is read straight from the network.
                </p>
              </div>
              <div className="relative z-[2] mt-8 border-t border-white/12 pt-6">
                <p className="text-[10px] uppercase tracking-[0.16em] text-mist/45">
                  USDC on offer
                </p>
                <div className="mt-3">
                  <UsdcValue amount={a.usdcOnOffer} dark />
                </div>
                <p className="mt-2 text-[11px] text-mist/45">
                  Across {n(a.openBounties)} open bounties right now
                </p>
              </div>
            </section>

            <section className="panel grain flex flex-col justify-between p-6 sm:p-8">
              <div
                aria-hidden
                className="grid-lines pointer-events-none absolute inset-0 z-0"
              />
              <p className="relative z-[2] text-[10px] uppercase tracking-[0.16em] text-ink/45">
                Total volume
              </p>
              <div className="relative z-[2] mt-6">
                <UsdcValue amount={a.totalVolume} />
              </div>
              <p className="relative z-[2] mt-2 text-[11px] text-ink/45">
                Committed across {n(a.totalBounties)} bounties all time
              </p>
              <div className="relative z-[2] mt-6 grid grid-cols-2 gap-px border border-ink/10 bg-ink/10">
                <span className="bg-white px-4 py-3">
                  <span className="block text-lg tabular-nums text-ink">
                    {n(a.openBounties)}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-ink/40">
                    Open
                  </span>
                </span>
                <span className="bg-white px-4 py-3">
                  <span className="block text-lg tabular-nums text-ink">
                    {n(a.settledBounties)}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-ink/40">
                    Settled
                  </span>
                </span>
              </div>
            </section>
          </div>

          <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Contributors" value={n(a.contributors)} />
            <StatCard label="Total users" value={n(a.totalUsers)} dark />
            <StatCard
              label="Clips submitted"
              value={n(a.totalCaptures)}
              hint={`${n(a.acceptedCaptures)} accepted`}
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
            />
            <StatCard
              label="Data collected"
              value={`${gb} GB`}
              hint="Footage stored on the network"
              dark
              wide
            />
            <StatCard
              label="Points distributed"
              value={n(a.pointsDistributed)}
              hint="1 USDC = 100 points"
            />
            <StatCard
              label="Avg bounty"
              value={
                a.totalBounties
                  ? formatUsdc(
                      Math.round((a.totalVolume / a.totalBounties) * 100) / 100
                    )
                  : "0"
              }
              hint="USDC per bounty"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
