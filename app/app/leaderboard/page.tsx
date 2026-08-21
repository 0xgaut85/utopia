import type { Metadata } from "next";
import { prisma } from "@/lib/app/db";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/app/avatar";

export const metadata: Metadata = {
  title: "Leaderboard",
};

export const dynamic = "force-dynamic";

const RANK_LABEL = ["1st place", "2nd place", "3rd place"];

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
    prisma.user.aggregate({ _sum: { points: true }, _count: { _all: true } }),
    prisma.submission.count(),
  ]);

  const podium = users.slice(0, 3);
  const rest = users.slice(3);
  const pointsPool = totals._sum.points ?? 0;
  const n = (value: number) => value.toLocaleString("en-US");

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-app-text sm:text-3xl">
        Leaderboard
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-app-muted">
        Every accepted clip earns points at 100 points per USDC. Here is where
        everyone stands.
      </p>

      <div className="mt-6 grid gap-3 sm:gap-4 lg:grid-cols-3">
        {podium.map((user, index) => (
          <article
            key={user.id}
            className={cn(
              "flex items-center gap-4 p-5",
              index === 0 ? "panel-invert" : "panel"
            )}
          >
            <Avatar
              username={user.username}
              avatarUrl={user.avatarUrl}
              size="lg"
            />
            <div className="min-w-0">
              <p
                className={cn(
                  "text-xs",
                  index === 0 ? "text-app-bg/60" : "text-app-faint"
                )}
              >
                {RANK_LABEL[index]}
              </p>
              <p
                className={cn(
                  "mt-0.5 truncate text-base font-medium",
                  index === 0 ? "text-app-bg" : "text-app-text"
                )}
              >
                {user.username}
              </p>
              <p
                className={cn(
                  "mt-1 text-xl tabular-nums",
                  index === 0 ? "text-app-bg" : "text-app-text"
                )}
              >
                {n(user.points)}
                <span
                  className={cn(
                    "ml-1 font-sans text-xs",
                    index === 0 ? "text-app-bg/60" : "text-app-faint"
                  )}
                >
                  pts
                </span>
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="panel px-4 py-3">
          <p className="text-xs text-app-faint">Contributors</p>
          <p className="mt-1 text-xl tabular-nums text-app-text">
            {n(totals._count._all)}
          </p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-xs text-app-faint">Points distributed</p>
          <p className="mt-1 text-xl tabular-nums text-app-text">
            {n(pointsPool)}
          </p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-xs text-app-faint">Clips submitted</p>
          <p className="mt-1 text-xl tabular-nums text-app-text">
            {n(networkClips)}
          </p>
        </div>
      </div>

      {rest.length > 0 ? (
        <div className="panel mt-3 overflow-hidden sm:mt-4">
          <div className="flex items-center justify-between border-b border-app-line px-4 py-3">
            <span className="text-sm font-medium text-app-text">
              Everyone else
            </span>
            <span className="text-xs text-app-faint">
              {rest.length} contributors
            </span>
          </div>
          <ol>
            {rest.map((user, index) => (
              <li
                key={user.id}
                className="flex items-center gap-4 border-b border-app-line/60 px-4 py-3 last:border-b-0"
              >
                <span className="w-6 shrink-0 text-sm tabular-nums text-app-faint">
                  {index + 4}
                </span>
                <Avatar
                  username={user.username}
                  avatarUrl={user.avatarUrl}
                  size="sm"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-app-text">
                  {user.username}
                </span>
                <span className="hidden shrink-0 text-xs text-app-faint sm:inline">
                  {user._count.submissions} clips
                </span>
                <span className="shrink-0 text-sm tabular-nums text-app-text">
                  {n(user.points)}
                  <span className="ml-1 font-sans text-xs text-app-faint">
                    pts
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
