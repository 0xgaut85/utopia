import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/app/db";
import { TaskCard } from "@/components/app/task-card";
import { ScrambleText } from "@/components/ui/scramble-text";

export const metadata: Metadata = {
  title: "Data Marketplace",
};

export default async function MarketplacePage() {
  const [tasks, contributorCount] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ status: "asc" }, { priceUsdc: "desc" }],
      include: { _count: { select: { submissions: true } } },
    }),
    prisma.user.count(),
  ]);

  const openTasks = tasks.filter(
    (task) => task.status === "open" && task._count.submissions < task.maxSubmissions
  );
  const usdcOnOffer = openTasks.reduce((sum, task) => sum + task.priceUsdc, 0);

  return (
    <div>
      <section className="border-b border-line/70">
        <div className="border-b border-line/70 bg-black/[0.035] px-4 py-1.5 sm:px-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
            Data marketplace:
          </span>
        </div>
        <div className="grid sm:grid-cols-[1fr_auto]">
          <div className="px-4 py-8 sm:px-6 sm:py-10">
            <h1 className="max-w-2xl font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl">
              <ScrambleText text="Capture the physical world. Get paid in points." duration={1400} />
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
              Buyers post bounties priced in USDC for ground level photos: a
              specific place, a specific object or pure coverage. Take the
              shot with your phone and submit it. When the buyer accepts your
              capture you earn 100 points per USDC of the bounty.
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-mist/20 bg-ink text-mist sm:w-auto sm:grid-cols-1 sm:divide-x-0 sm:divide-y">
            <div className="px-5 py-4 sm:px-8">
              <p className="font-mono text-2xl">{openTasks.length}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-mist/50">
                Open bounties
              </p>
            </div>
            <div className="px-5 py-4 sm:px-8">
              <p className="font-mono text-2xl">
                {usdcOnOffer.toLocaleString("en-US")}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-mist/50">
                USDC on offer
              </p>
            </div>
            <div className="px-5 py-4 sm:px-8">
              <p className="font-mono text-2xl">{contributorCount}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-mist/50">
                Contributors
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
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
              priceUsdc: task.priceUsdc,
              maxSubmissions: task.maxSubmissions,
              status: task.status,
              submissionCount: task._count.submissions,
            }}
          />
        ))}
        <Link
          href="/app/tasks/new"
          className="flex min-h-44 flex-col justify-between bg-ink px-4 py-4 text-mist shadow-[1px_1px_0_0_var(--color-line)] transition-opacity hover:opacity-90"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mist/50">
            For buyers:
          </span>
          <span className="font-display text-xl font-medium leading-snug tracking-tight">
            Need eyes somewhere on Earth? Post a bounty in USDC.
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mist/50 underline underline-offset-4">
            Post a bounty
          </span>
        </Link>
      </section>
    </div>
  );
}
