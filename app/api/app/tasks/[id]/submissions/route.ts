import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { getAuthUser } from "@/lib/app/auth";

/** Lists a task's submissions with photos, for its buyer or an admin. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    select: { id: true, creatorId: true, status: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.creatorId !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submissions = await prisma.submission.findMany({
    where: { taskId: task.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      photo: true,
      note: true,
      lat: true,
      lng: true,
      status: true,
      createdAt: true,
      user: { select: { username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    taskStatus: task.status,
    submissions: submissions.map((submission) => ({
      ...submission,
      createdAt: submission.createdAt.toISOString(),
    })),
  });
}
