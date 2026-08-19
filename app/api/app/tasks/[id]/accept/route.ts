import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { getAuthUser } from "@/lib/app/auth";
import { taskPoints } from "@/lib/app/points";

/**
 * The buyer accepts the submission they prefer. The contributor is credited
 * priceUsdc x 100 points, every other pending submission is rejected and the
 * bounty closes.
 */
export async function POST(
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
    select: { id: true, creatorId: true, status: true, priceUsdc: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.creatorId !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (task.status !== "open") {
    return NextResponse.json(
      { error: "This bounty is already settled." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    submissionId?: string;
  };
  const submissionId =
    typeof body.submissionId === "string" ? body.submissionId : "";

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, taskId: true, userId: true, status: true },
  });

  if (!submission || submission.taskId !== task.id) {
    return NextResponse.json(
      { error: "Submission not found on this task." },
      { status: 404 }
    );
  }
  if (submission.status !== "pending") {
    return NextResponse.json(
      { error: "This submission was already reviewed." },
      { status: 400 }
    );
  }

  const points = taskPoints(task.priceUsdc);

  await prisma.$transaction([
    prisma.submission.update({
      where: { id: submission.id },
      data: { status: "accepted" },
    }),
    prisma.submission.updateMany({
      where: { taskId: task.id, status: "pending", id: { not: submission.id } },
      data: { status: "rejected" },
    }),
    prisma.user.update({
      where: { id: submission.userId },
      data: { points: { increment: points } },
    }),
    prisma.task.update({
      where: { id: task.id },
      data: { status: "closed" },
    }),
  ]);

  return NextResponse.json({ accepted: submission.id, pointsAwarded: points });
}
