import type { Metadata } from "next";
import { prisma } from "@/lib/app/db";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/app/avatar";

export const metadata: Metadata = {
  title: "Leaderboard",
};

export default async function LeaderboardPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ points: "desc" }, { createdAt: "asc" }],
    take: 50,
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      points: true,
      _count: { select: { submissions: true } },
    },
  });

  return (
    <div>
      <div className="border-b border-line/70 bg-black/[0.035] px-4 py-1.5 sm:px-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
          Leaderboard / top contributors:
        </span>
      </div>

      <div className="border-b border-line/70 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          The ground truth rankings
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
          Every accepted capture earns points. The contributors below are
          building the map, one street level photo at a time.
        </p>
      </div>

      <ol>
        {users.map((user, index) => {
          const rank = index + 1;
          const podium = rank <= 3;
          return (
            <li
              key={user.id}
              className={cn(
                "flex items-center gap-4 border-b border-line/40 px-4 py-3 sm:px-6",
                podium && "bg-ink text-mist"
              )}
            >
              <span
                className={cn(
                  "w-10 shrink-0 font-mono text-sm",
                  podium ? "text-mist/60" : "text-ink/40"
                )}
              >
                {String(rank).padStart(2, "0")}
              </span>
              <Avatar
                username={user.username}
                avatarUrl={user.avatarUrl}
                size="sm"
                className={cn(podium && "border-mist/30")}
              />
              <span className="min-w-0 flex-1 truncate font-mono text-sm">
                {user.username}
              </span>
              {user._count.submissions > 0 ? (
                <span
                  className={cn(
                    "hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] sm:inline",
                    podium ? "text-mist/50" : "text-ink/40"
                  )}
                >
                  {user._count.submissions} captures
                </span>
              ) : null}
              <span className="shrink-0 font-mono text-sm">
                {user.points.toLocaleString("en-US")} pts
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
