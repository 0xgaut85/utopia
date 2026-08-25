import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { getAuthUser } from "@/lib/app/auth";
import { acceptSubmission } from "@/lib/app/accept-submission";
import { isExpired } from "@/lib/app/bounty";

/**
 * The buyer accepts the submission they prefer. The contributor is credited
 * priceUsdc x 100 points, every other pending submission is rejected and the
 * bounty closes. Real bounties also queue an escrow payout of priceUsdc only.
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
    select: { id: true, creatorId: true, expiresAt: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.creatorId !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isExpired(task.expiresAt) && !user.isAdmin) {
    return NextResponse.json(
      { error: "This bounty has ended." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    submissionId?: string;
  };
  const submissionId =
    typeof body.submissionId === "string" ? body.submissionId : "";

  const result = await acceptSubmission(id, submissionId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    accepted: result.accepted,
    pointsAwarded: result.pointsAwarded,
    payoutQueued: result.payoutQueued,
  });
}
