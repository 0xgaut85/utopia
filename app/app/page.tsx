import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/app/db";
import { TaskCard } from "@/components/app/task-card";

export const metadata: Metadata = {
  title: "Data Marketplace",
};

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: "asc" }, { priceUsdc: "desc" }],
    include: { _count: { select: { submissions: true } } },
  });

  const openCount = tasks.filter(
    (task) =>
      task.status === "open" && task._count.submissions < task.maxSubmissions
  ).length;

  return (
    <div>
      <section className="flex flex-col gap-6 border-b border-line/70 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
            Data marketplace / {openCount} open
          </span>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl">
            Capture the physical world. Get paid in points.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
            Buyers post bounties priced in USDC for ground level photos: a
            specific place, a specific object or pure coverage. Take the shot
            with your phone and submit it. When the buyer accepts your capture
            you earn 100 points per USDC of the bounty.
          </p>
        </div>

        <Link
          href="/app/tasks/new"
          className="glass-btn glass-btn-dark inline-flex shrink-0 items-center gap-2 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em]"
        >
          Post a bounty in USDC
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
        </Link>
      </section>

      <section className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
      </section>
    </div>
  );
}
