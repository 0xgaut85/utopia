import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { getAuthUser } from "@/lib/app/auth";
import { taskPoints } from "@/lib/app/points";
import { isBountyOpen } from "@/lib/app/bounty";

// Clips are recorded in-app and stored as base64 video data URLs in the reused
// `photo` column. Allow ~20s of webm/mp4 at up to roughly 60MB of raw bytes.
const VIDEO_PATTERN = /^data:video\/(webm|mp4|quicktime)(;codecs=[^;]+)?;base64,/;
const VIDEO_MAX_LENGTH = 85_000_000;

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
    include: { _count: { select: { submissions: true } } },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (
    !isBountyOpen({
      status: task.status,
      maxSubmissions: task.maxSubmissions,
      submissionCount: task._count.submissions,
      expiresAt: task.expiresAt,
    })
  ) {
    return NextResponse.json(
      { error: "This bounty is closed or the deadline has passed." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    photo?: string;
    note?: string;
    lat?: number;
    lng?: number;
  };

  const photo = typeof body.photo === "string" ? body.photo : "";
  if (!VIDEO_PATTERN.test(photo) || photo.length > VIDEO_MAX_LENGTH) {
    return NextResponse.json(
      { error: "Clip must be a webm or mp4 recorded in the app." },
      { status: 400 }
    );
  }

  const note =
    typeof body.note === "string" ? body.note.slice(0, 500) : undefined;
  const lat = typeof body.lat === "number" ? body.lat : undefined;
  const lng = typeof body.lng === "number" ? body.lng : undefined;

  try {
    const submission = await prisma.submission.create({
      data: {
        taskId: task.id,
        userId: user.id,
        photo,
        note,
        lat,
        lng,
        status: "pending",
      },
    });

    return NextResponse.json({
      submission: {
        id: submission.id,
        status: submission.status,
        createdAt: submission.createdAt.toISOString(),
      },
      pointsIfAccepted: taskPoints(task.priceUsdc),
    });
  } catch {
    return NextResponse.json(
      { error: "You already submitted a clip for this task." },
      { status: 409 }
    );
  }
}
