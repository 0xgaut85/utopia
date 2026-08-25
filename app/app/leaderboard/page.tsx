import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/app/db";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/app/avatar";
import { SearchField } from "@/components/app/search-field";

export const metadata: Metadata = {
  title: "Leaderboard",
};

export const dynamic = "force-dynamic";

const RANK_LABEL = ["1st place", "2nd place", "3rd place"];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 30);

  const [ranked, totals, networkClips] = await Promise.all([
    prisma.user.findMany({
      where: { isSeed: false },
      orderBy: [{ points: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        points: true,
        _count: { select: { submissions: true } },
      },
    }),
    prisma.user.aggregate({
      where: { isSeed: false },
      _sum: { points: true },
      _count: { _all: true },
    }),
    prisma.submission.count({ where: { user: { isSeed: false } } }),
  ]);

  const withRank = ranked.map((user, index) => ({ ...user, rank: index + 1 }));
  const searching = query.length > 0;
  const matches = searching
    ? withRank
        .filter((user) =>
          user.username.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 50)
    : withRank.slice(0, 50);

  const podium = searching ? [] : matches.slice(0, 3);
  const rest = searching ? matches : matches.slice(3);
  const pointsPool = totals._sum.points ?? 0;
  const n = (value: number) => value.toLocaleString("en-US");

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-app-text sm:text-3xl">
            Leaderboard
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-app-muted">
            Every accepted clip earns points at 100 points per USDC. Here is
            where the top 50 stand.
          </p>
        </div>

        <form action="/app/leaderboard" className="flex items-center gap-2">
          <SearchField
            name="q"
            defaultValue={query}
            maxLength={30}
            placeholder="Search a username"
            className="w-56"
          />
          <button type="submit" className="app-btn app-btn-ghost px-3 py-2 text-xs">
            Search
          </button>
          {searching ? (
            <Link
              href="/app/leaderboard"
              className="text-xs text-app-faint underline underline-offset-4 hover:text-app-text"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      {podium.length > 0 ? (
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
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
        <div className="panel min-w-0 px-2.5 py-2.5 sm:px-4 sm:py-3">
          <p className="text-[11px] text-app-faint sm:text-xs">Contributors</p>
          <p className="mt-1 text-base tabular-nums text-app-text sm:text-xl">
            {n(totals._count._all)}
          </p>
        </div>
        <div className="panel min-w-0 px-2.5 py-2.5 sm:px-4 sm:py-3">
          <p className="text-[11px] text-app-faint sm:text-xs">
            Points distributed
          </p>
          <p className="mt-1 text-base tabular-nums text-app-text sm:text-xl">
            {n(pointsPool)}
          </p>
        </div>
        <div className="panel min-w-0 px-2.5 py-2.5 sm:px-4 sm:py-3">
          <p className="text-[11px] text-app-faint sm:text-xs">
            Clips submitted
          </p>
          <p className="mt-1 text-base tabular-nums text-app-text sm:text-xl">
            {n(networkClips)}
          </p>
        </div>
      </div>

      {searching && rest.length === 0 ? (
        <div className="panel mt-4 px-6 py-12 text-center">
          <p className="text-sm text-app-muted">
            No contributor matches &quot;{query}&quot;.
          </p>
        </div>
      ) : rest.length > 0 ? (
        <div className="panel mt-3 overflow-hidden sm:mt-4">
          <div className="flex items-center justify-between border-b border-app-line px-4 py-3">
            <span className="text-sm font-medium text-app-text">
              {searching ? `Results for "${query}"` : "Everyone else"}
            </span>
            <span className="text-xs text-app-faint">
              {rest.length} contributors
            </span>
          </div>
          <ol>
            {rest.map((user) => (
              <li
                key={user.id}
                className="flex items-center gap-4 border-b border-app-line/60 px-4 py-3 last:border-b-0"
              >
                <span className="w-8 shrink-0 text-sm tabular-nums text-app-faint">
                  {user.rank}
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
