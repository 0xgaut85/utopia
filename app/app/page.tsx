import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/app/db";
import { TaskCard } from "@/components/app/task-card";

export const metadata: Metadata = {
  title: "Data Marketplace",
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

export default async function MarketplacePage() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: "asc" }, { priceUsdc: "desc" }],
    include: { _count: { select: { submissions: true } } },
  });

  const open = tasks.filter(
    (task) =>
      task.status === "open" && task._count.submissions < task.maxSubmissions
  );
  const onOffer = open.reduce((total, task) => total + task.priceUsdc, 0);

  return (
    <div>
      <section className="panel-dark grain border-x-0 border-t-0">
        <div aria-hidden className="wash-dark" />
        <div
          aria-hidden
          className="grid-lines-dark pointer-events-none absolute inset-0 z-0"
        />

        <div className="relative z-[2] border-b border-white/12 px-4 py-2 sm:px-6 lg:px-8">
          <span className="text-[10px] uppercase tracking-[0.16em] text-mist/45">
            Data marketplace / open bounties for street level video
          </span>
        </div>

        <div className="relative z-[2] flex flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-medium leading-[1.15] tracking-tight text-mist sm:text-5xl">
              Film the physical world.
              <br />
              Get paid for the footage.
            </h1>
            <p className="mt-5 max-w-xl text-[13px] leading-relaxed text-mist/65">
              Buyers post bounties priced in USDC for ground level video: a
              specific place, a specific object or pure coverage. Record a short
              clip in the app and submit it. The buyer accepts the clip they
              prefer and the reward releases to you.
            </p>

            <Link
              href="/app/tasks/new"
              className="glass-btn mt-8 inline-flex items-center gap-2 border-white/20 bg-white/10 px-5 py-3 text-[11px] uppercase tracking-[0.14em] text-mist backdrop-blur-xl transition-colors hover:bg-white/20"
            >
              Post a bounty in USDC
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
            </Link>
          </div>

          <dl className="grid shrink-0 grid-cols-2 gap-px border border-white/12 bg-white/12 lg:grid-cols-1">
            <div className="bg-ink px-6 py-5">
              <dt className="text-[10px] uppercase tracking-[0.16em] text-mist/45">
                On offer now
              </dt>
              <dd className="mt-2 text-3xl tabular-nums tracking-tight text-mist">
                {formatUsdc(onOffer)}
                <span className="ml-1.5 text-[11px] uppercase tracking-[0.14em] text-mist/45">
                  USDC
                </span>
              </dd>
            </div>
            <div className="bg-ink px-6 py-5">
              <dt className="text-[10px] uppercase tracking-[0.16em] text-mist/45">
                Open bounties
              </dt>
              <dd className="mt-2 text-3xl tabular-nums tracking-tight text-mist">
                {open.length}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="bar flex items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <span className="text-[10px] uppercase tracking-[0.16em] text-ink/50">
          All bounties / {tasks.length} total
        </span>
        <span className="hidden text-[10px] uppercase tracking-[0.16em] text-ink/35 sm:inline">
          Highest reward first
        </span>
      </section>

      {tasks.length === 0 ? (
        <div className="px-6 py-24 text-center">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            No bounties posted yet. Be the first to buy footage from the
            network.
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-2 items-start gap-3 px-3 py-4 sm:gap-4 sm:px-6 sm:py-6 md:grid-cols-3 lg:grid-cols-4 lg:px-8 xl:grid-cols-5 2xl:grid-cols-6">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              index={index}
              task={{
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
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}
