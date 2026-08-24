import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { isAdminModeAuthed } from "@/lib/app/admin-mode";

const LIVE_AFTER_MS = 90_000;

function serialize(event: {
  id: string;
  level: string;
  kind: string;
  message: string;
  payload: unknown;
  createdAt: Date;
}) {
  return {
    id: event.id,
    level: event.level,
    kind: event.kind,
    message: event.message,
    payload: event.payload,
    createdAt: event.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  if (!(await isAdminModeAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const before = url.searchParams.get("before");
  const take = Math.min(Number(url.searchParams.get("limit") ?? 80) || 80, 200);

  const where = after
    ? { createdAt: { gt: new Date(after) } }
    : before
      ? { createdAt: { lt: new Date(before) } }
      : undefined;

  try {
    const [events, newest] = await Promise.all([
      prisma.workerEvent.findMany({
        where,
        orderBy: { createdAt: after ? "asc" : "desc" },
        take,
        select: {
          id: true,
          level: true,
          kind: true,
          message: true,
          payload: true,
          createdAt: true,
        },
      }),
      prisma.workerEvent.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const live =
      newest !== null &&
      Date.now() - newest.createdAt.getTime() < LIVE_AFTER_MS;

    return NextResponse.json({
      live,
      latestAt: newest?.createdAt.toISOString() ?? null,
      hasMore: events.length === take,
      events: events.map(serialize),
    });
  } catch {
    return NextResponse.json({
      live: false,
      latestAt: null,
      hasMore: false,
      events: [],
    });
  }
}