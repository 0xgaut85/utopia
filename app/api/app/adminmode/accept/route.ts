import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { isAdminModeAuthed } from "@/lib/app/admin-mode";
import { acceptSubmission } from "@/lib/app/accept-submission";

export async function POST(request: Request) {
  if (!(await isAdminModeAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    submissionId?: string;
  };
  const submissionId =
    typeof body.submissionId === "string" ? body.submissionId : "";

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { taskId: true },
  });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const result = await acceptSubmission(submission.taskId, submissionId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const winner = await prisma.user.findUnique({
    where: { id: result.userId },
    select: {
      username: true,
      payoutSolanaUsdc: true,
      payoutUsdcBase: true,
      payoutUsdgRobinhood: true,
    },
  });

  return NextResponse.json({
    accepted: result.accepted,
    pointsAwarded: result.pointsAwarded,
    winner,
  });
}
