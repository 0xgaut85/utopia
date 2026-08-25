import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Archive, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/app/db";
import { Avatar } from "@/components/app/avatar";
import { AppPageHeader } from "@/components/app/app-page-header";
import { payoutHashFromJob, payoutProof } from "@/lib/app/payments";
import { creatorDisplay } from "@/lib/app/creator-kind";

export const metadata: Metadata = {
  title: "Archive",
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

function formatWhen(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ArchivePage() {
  const closed = await prisma.task.findMany({
    where: { status: "closed", NOT: { creator: { isSeed: true } } },
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { username: true } },
      submissions: {
        where: { status: "accepted" },
        take: 1,
        include: {
          user: { select: { username: true, avatarUrl: true } },
        },
      },
    },
  });

  const jobs = closed.length
    ? await prisma.workerJob.findMany({
        where: {
          kind: { in: ["bounty.close", "real.payout"] },
          status: "done",
          taskId: { in: closed.map((task) => task.id) },
        },
        select: { taskId: true, hashes: true },
      })
    : [];

  const payoutByTask = new Map(
    jobs.map((job) => [job.taskId, payoutHashFromJob(job.hashes)])
  );
  for (const task of closed) {
    if (task.payoutTxHash && !payoutByTask.get(task.id)) {
      payoutByTask.set(task.id, task.payoutTxHash);
    }
  }

  return (
    <div className="app-page">
      <AppPageHeader
        eyebrow="Settled"
        title="Archive"
        description="Closed bounties, who won, and the payout transaction when one exists."
      />

      {closed.length === 0 ? (
        <div className="panel mt-8 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-app-bg text-app-faint">
            <Archive className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <p className="mt-4 text-[15px] font-medium text-app-text">
            Nothing has settled yet
          </p>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-app-muted">
            Open bounties stay on the board until a clip is accepted. Winners
            and payouts will land here.
          </p>
        </div>
      ) : (
        <ul className="panel mt-8 divide-y divide-app-line/70 overflow-hidden">
          {closed.map((task) => {
            const winner = task.submissions[0]?.user ?? null;
            const settledAt = task.submissions[0]?.createdAt ?? task.createdAt;
            const payout = payoutProof({
              depositNetwork: task.depositNetwork,
              payoutTxHash: payoutByTask.get(task.id) ?? null,
            });

            return (
              <li key={task.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-app-faint">
                      {formatWhen(settledAt)}
                      <span className="mx-1.5 text-app-line-hi">·</span>
                      {creatorDisplay(
                        task.creatorKind,
                        task.creatorKind === "user"
                          ? (task.creator?.username ?? null)
                          : null
                      )}
                    </p>
                    <Link
                      href={`/app/tasks/${task.id}`}
                      className="mt-1 block truncate text-[15px] font-medium text-app-text underline-offset-4 transition-colors hover:underline"
                    >
                      {task.title}
                    </Link>
                    <p className="mt-1 truncate text-xs text-app-muted">
                      {task.locationName ?? "Any location"}
                    </p>
                  </div>

                  <div className="flex min-w-0 items-center gap-3 sm:w-44">
                    {winner ? (
                      <>
                        <Avatar
                          username={winner.username}
                          avatarUrl={winner.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] text-app-faint">Winner</p>
                          <p className="truncate text-sm text-app-text">
                            {winner.username}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-app-faint">No winner</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 sm:w-44 sm:items-end">
                    <span className="flex items-center gap-1.5">
                      <Image
                        src="/usdc.svg"
                        alt=""
                        width={14}
                        height={14}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-sm tabular-nums text-app-text">
                        {formatUsdc(task.priceUsdc)}
                      </span>
                    </span>
                    {payout ? (
                      <a
                        href={payout.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-app-muted underline-offset-4 hover:text-app-text hover:underline"
                      >
                        {payout.label}
                        <span className="font-mono tabular-nums">
                          {payout.detail}
                        </span>
                        <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
                      </a>
                    ) : (
                      <span className="text-[11px] text-app-faint">
                        Payout not recorded
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
