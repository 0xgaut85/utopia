import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { getAuthUser } from "@/lib/app/auth";
import { submitPoints, taskPoints } from "@/lib/app/points";
import { isBountyOpen } from "@/lib/app/bounty";
import { clipNearTask, isLocatedTask } from "@/lib/app/geo";
import {
  clipMeetsMinDuration,
  MIN_CLIP_SECONDS,
} from "@/lib/app/video-duration";

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
  if (user.isSynthetic || user.privyId?.startsWith("sim:")) {
    return NextResponse.json(
      { error: "Synthetic accounts cannot submit through the app." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { _count: { select: { submissions: true } } },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.creatorId && task.creatorId === user.id) {
    return NextResponse.json(
      { error: "You cannot submit a clip to your own bounty." },
      { status: 400 }
    );
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
    durationSec?: number;
  };

  const photo = typeof body.photo === "string" ? body.photo : "";
  if (!VIDEO_PATTERN.test(photo) || photo.length > VIDEO_MAX_LENGTH) {
    return NextResponse.json(
      { error: "Clip must be a webm or mp4 recorded in the app." },
      { status: 400 }
    );
  }
  const claimedSec =
    typeof body.durationSec === "number" ? body.durationSec : null;
  if (!clipMeetsMinDuration(photo, claimedSec)) {
    return NextResponse.json(
      {
        error: `Clip must be at least ${MIN_CLIP_SECONDS} seconds. Record in the app and hold until the timer allows stop.`,
      },
      { status: 400 }
    );
  }

  const note =
    typeof body.note === "string" ? body.note.slice(0, 500) : undefined;
  const lat = typeof body.lat === "number" ? body.lat : undefined;
  const lng = typeof body.lng === "number" ? body.lng : undefined;

  if (
    !clipNearTask(
      { lat: task.lat, lng: task.lng, radiusM: task.radiusM },
      { lat: lat ?? null, lng: lng ?? null }
    )
  ) {
    return NextResponse.json(
      {
        error: isLocatedTask(task)
          ? "This clip is too far from the bounty location."
          : "This clip needs a GPS fix.",
      },
      { status: 400 }
    );
  }

  const pointsAwarded = submitPoints(task.priceUsdc);

  try {
    const submission = await prisma.$transaction(async (tx) => {
      const created = await tx.submission.create({
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
      if (pointsAwarded > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { points: { increment: pointsAwarded } },
        });
      }
      return created;
    });

    return NextResponse.json({
      submission: {
        id: submission.id,
        status: submission.status,
        createdAt: submission.createdAt.toISOString(),
      },
      pointsAwarded,
      pointsIfAccepted: taskPoints(task.priceUsdc),
    });
  } catch {
    return NextResponse.json(
      { error: "You already submitted a clip for this task." },
      { status: 409 }
    );
  }
}
