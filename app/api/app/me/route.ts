import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { getAuthUser } from "@/lib/app/auth";
import { publicUser } from "@/lib/app/serialize";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,/;
const AVATAR_MAX_LENGTH = 1_500_000;

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submissions = await prisma.submission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      task: { select: { id: true, title: true, reward: true } },
    },
  });

  return NextResponse.json({
    user: publicUser(user, true),
    submissions: submissions.map((submission) => ({
      id: submission.id,
      status: submission.status,
      createdAt: submission.createdAt.toISOString(),
      task: submission.task,
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
  };

  const data: { username?: string; avatarUrl?: string } = {};

  if (body.username !== undefined) {
    const username = String(body.username).toLowerCase().trim();
    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json(
        {
          error:
            "Usernames are 3 to 20 characters, lowercase letters, numbers and underscores only.",
        },
        { status: 400 }
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
