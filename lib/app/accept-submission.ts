import { prisma } from "@/lib/app/db";
import { taskPoints } from "@/lib/app/points";

export async function acceptSubmission(taskId: string, submissionId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, priceUsdc: true },
  });

  if (!task) return { error: "Task not found", status: 404 };
  if (task.status !== "open") {
    return { error: "This bounty is already settled.", status: 400 };
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, taskId: true, userId: true, status: true },
  });

  if (!submission || submission.taskId !== task.id) {
    return { error: "Submission not found on this task.", status: 404 };
  }
  if (submission.status !== "pending") {
    return { error: "This submission was already reviewed.", status: 400 };
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

  return { accepted: submission.id, pointsAwarded: points, userId: submission.userId };
}
