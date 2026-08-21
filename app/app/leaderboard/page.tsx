import type { Metadata } from "next";
import { Trophy, Video, Coins, Users } from "lucide-react";
import { prisma } from "@/lib/app/db";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/app/avatar";

export const metadata: Metadata = {
  title: "Leaderboard",
};

export const dynamic = "force-dynamic";

const RANK_LABEL = ["First", "Second", "Third"];

export default async function LeaderboardPage() {
  const [users, totals, networkClips] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ points: "desc" }, { createdAt: "asc" }],
      take: 50,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        points: true,
        _count: { select: { submissions: true } },
      },
    }),
    prisma.user.aggregate({
      _sum: { points: true },
      _count: { _all: true },
    }),
    prisma.submission.count(),
  ]);

  const podium = users.slice(0, 3);
  const rest = users.slice(3);
  const pointsPool = totals._sum.points ?? 0;
  const clips = podium.reduce((sum, user) => sum + user._count.submissions, 0);
  const ranked = totals._count._all;
  const avgPoints = ranked ? Math.round(pointsPool / ranked) : 0;
  const n = (value: number) => value.toLocaleString("en-US");

  return (
    <div>
      <div className="bar px-4 py-2 sm:px-6 lg:px-8">
        <span className="text-[10px] uppercase tracking-[0.16em] text-ink/50">
          Leaderboard / top contributors:
        </span>
      </div>

      <div className="relative overflow-hidden px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div aria-hidden className="wash" />

        <div className="relative z-[2]">
          {/* Bento: headline tile, podium tiles, stat tiles. */}
          <div className="grid auto-rows-[minmax(0,1fr)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <section className="panel-dark grain col-span-2 flex flex-col justify-between p-6 sm:p-8 lg:row-span-2">
              <div
                aria-hidden
                className="grid-lines-dark pointer-events-none absolute inset-0 z-0"
              />
              <div className="relative z-[2]">
                <span className="text-[10px] uppercase tracking-[0.16em] text-mist/45">
                  Standings
                </span>
                <h1 className="mt-4 text-3xl font-medium leading-[1.15] tracking-tight text-mist sm:text-4xl">
                  The ground truth rankings
                </h1>
                <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-mist/60">
                  Every accepted clip earns points at 1 USDC to 100 points. The
                  contributors below are building the map one street level clip
                  at a time.
                </p>
              </div>
              <div className="relative z-[2] mt-8 flex flex-wrap gap-x-8 gap-y-4">
                <span>
                  <span className="block text-2xl tabular-nums tracking-tight text-mist">
                    {n(pointsPool)}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-mist/45">
                    Points distributed
                  </span>
                </span>
                <span>
                  <span className="block text-2xl tabular-nums tracking-tight text-mist">
                    {n(ranked)}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-mist/45">
                    Contributors ranked
                  </span>
                </span>
              </div>
            </section>

            {podium.map((user, index) => (
              <article
                key={user.id}
                className={cn(
                  "panel grain flex flex-col justify-between p-5",
                  index === 0 && "lg:col-span-2"
                )}
              >
                <div
                  aria-hidden
                  className="grid-lines pointer-events-none absolute inset-0 z-0"
                />
                <div className="relative z-[2] flex items-start justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-ink/45">
                    {RANK_LABEL[index]}
                  </span>
                  {index === 0 ? (
                    <Trophy className="h-4 w-4 text-ink" strokeWidth={1.5} />
                  ) : (
                    <span className="text-[10px] tabular-nums text-ink/30">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                </div>

                <div className="relative z-[2] mt-5 flex items-center gap-3">
                  <Avatar
                    username={user.username}
                    avatarUrl={user.avatarUrl}
                    size={index === 0 ? "lg" : "sm"}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">
                      {user.username}
                    </span>
                    <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-ink/40">
                      {user._count.submissions} clips
                    </span>
                  </span>
                </div>

                <div className="relative z-[2] mt-5 flex items-baseline gap-1.5 border-t border-ink/10 pt-3">
                  <span
                    className={cn(
                      "tabular-nums tracking-tight text-ink",
                      index === 0 ? "text-4xl" : "text-2xl"
                    )}
                  >
                    {n(user.points)}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-ink/40">
                    pts
                  </span>
                </div>
              </article>
            ))}

            <article className="panel grain flex flex-col justify-between p-5">
              <div className="relative z-[2] flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] text-ink/45">
                  Podium clips
                </span>
                <Video className="h-4 w-4 text-ink/40" strokeWidth={1.5} />
              </div>
              <span className="relative z-[2] mt-6 text-3xl tabular-nums tracking-tight text-ink">
                {n(clips)}
              </span>
            </article>

            <article className="panel-dark grain flex flex-col justify-between p-5">
              <div className="relative z-[2] flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] text-mist/45">
                  Top score
                </span>
                <Coins className="h-4 w-4 text-mist/50" strokeWidth={1.5} />
              </div>
              <span className="relative z-[2] mt-6 text-3xl tabular-nums tracking-tight text-mist">
                {n(podium[0]?.points ?? 0)}
              </span>
            </article>

            <article className="panel grain flex flex-col justify-between p-5">
              <div className="relative z-[2] flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] text-ink/45">
                  Network clips
                </span>
                <Video className="h-4 w-4 text-ink/40" strokeWidth={1.5} />
              </div>
              <span className="relative z-[2] mt-6 text-3xl tabular-nums tracking-tight text-ink">
                {n(networkClips)}
              </span>
            </article>

            <article className="panel grain flex flex-col justify-between p-5">
              <div className="relative z-[2] flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] text-ink/45">
                  Avg per contributor
                </span>
                <Users className="h-4 w-4 text-ink/40" strokeWidth={1.5} />
              </div>
              <span className="relative z-[2] mt-6 text-3xl tabular-nums tracking-tight text-ink">
                {n(avgPoints)}
                <span className="ml-1.5 text-[10px] uppercase tracking-[0.14em] text-ink/40">
                  pts
                </span>
              </span>
            </article>
          </div>

          {rest.length > 0 ? (
            <div className="panel mt-3 sm:mt-4">
              <div className="bar px-4 py-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-ink/50">
                  Ranks 04 to {String(users.length).padStart(2, "0")}
                </span>
              </div>
              <ol>
                {rest.map((user, index) => (
                  <li
                    key={user.id}
                    className="flex items-center gap-4 border-b border-ink/8 px-4 py-2.5 transition-colors last:border-b-0 hover:bg-ink/[0.03]"
                  >
                    <span className="w-8 shrink-0 text-xs tabular-nums text-ink/35">
                      {String(index + 4).padStart(2, "0")}
                    </span>
                    <Avatar
                      username={user.username}
                      avatarUrl={user.avatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                      {user.username}
                    </span>
                    <span className="hidden shrink-0 text-[10px] uppercase tracking-[0.12em] text-ink/35 sm:inline">
                      {user._count.submissions} clips
                    </span>
                    <span className="shrink-0 text-[13px] tabular-nums text-ink">
                      {n(user.points)}
                      <span className="ml-1 text-[10px] uppercase tracking-[0.12em] text-ink/40">
                        pts
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
