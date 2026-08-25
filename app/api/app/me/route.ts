import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { getAuthUser } from "@/lib/app/auth";
import { publicUser } from "@/lib/app/serialize";
import { parsePayoutAddresses } from "@/lib/app/payout-addresses";
import {
  USERNAME_PATTERN,
  normalizeUsername,
  usernameError,
} from "@/lib/app/username";
const AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,/;
const AVATAR_MAX_LENGTH = 1_500_000;

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [submissions, createdTasks] = await Promise.all([
    prisma.submission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        task: { select: { id: true, title: true, priceUsdc: true } },
      },
    }),
    prisma.task.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        priceUsdc: true,
        status: true,
        _count: { select: { submissions: { where: { status: "pending" } } } },
      },
    }),
  ]);

  return NextResponse.json({
    user: publicUser(user, true),
    submissions: submissions.map((submission) => ({
      id: submission.id,
      status: submission.status,
      createdAt: submission.createdAt.toISOString(),
      task: submission.task,
    })),
    myTasks: createdTasks.map((task) => ({
      id: task.id,
      title: task.title,
      priceUsdc: task.priceUsdc,
      status: task.status,
      pendingCount: task._count.submissions,
    })),
  });
}

export async function PATCH(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    avatar?: string;
    payoutSolanaUsdc?: string;
    payoutUsdcBase?: string;
    payoutUsdgRobinhood?: string;
  };

  const data: {
    username?: string;
    avatarUrl?: string;
    payoutSolanaUsdc?: string | null;
    payoutUsdcBase?: string | null;
    payoutUsdgRobinhood?: string | null;
  } = {};

  if (body.username !== undefined) {
    const username = normalizeUsername(String(body.username));
    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json({ error: usernameError() }, { status: 400 });
    }
    const taken = await prisma.user.findFirst({
      where: {
        id: { not: user.id },
        username: { equals: username, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }
    data.username = username;
  }

  if (body.avatar !== undefined) {
    const avatar = String(body.avatar);
    if (!AVATAR_PATTERN.test(avatar) || avatar.length > AVATAR_MAX_LENGTH) {
      return NextResponse.json(
        { error: "Avatar must be a png, jpeg or webp under 1MB." },
        { status: 400 }
      );
    }
    data.avatarUrl = avatar;
  }

  if (
    body.payoutSolanaUsdc !== undefined ||
    body.payoutUsdcBase !== undefined ||
    body.payoutUsdgRobinhood !== undefined
  ) {
    const parsed = parsePayoutAddresses({
      payoutSolanaUsdc:
        body.payoutSolanaUsdc !== undefined
          ? body.payoutSolanaUsdc
          : user.payoutSolanaUsdc,
      payoutUsdcBase:
        body.payoutUsdcBase !== undefined
          ? body.payoutUsdcBase
          : user.payoutUsdcBase,
      payoutUsdgRobinhood:
        body.payoutUsdgRobinhood !== undefined
          ? body.payoutUsdgRobinhood
          : user.payoutUsdgRobinhood,
    });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    Object.assign(data, parsed.data);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ user: publicUser(user, true) });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });
    return NextResponse.json({ user: publicUser(updated, true) });
  } catch {
    return NextResponse.json(
      { error: "That username is already taken." },
      { status: 409 }
    );
  }
}
