import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { getAuthUser } from "@/lib/app/auth";
import { taskPoints } from "@/lib/app/points";

const PHOTO_PATTERN = /^data:image\/(png|jpeg|webp);base64,/;
const PHOTO_MAX_LENGTH = 6_000_000;

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
  if (task.status !== "open") {
    return NextResponse.json({ error: "This task is closed." }, { status: 400 });
  }
  if (task._count.submissions >= task.maxSubmissions) {
    return NextResponse.json(
      { error: "This task has reached its submission limit." },
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
  if (!PHOTO_PATTERN.test(photo) || photo.length > PHOTO_MAX_LENGTH) {
    return NextResponse.json(
      { error: "Photo must be a png, jpeg or webp under 4MB." },
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
      { error: "You already submitted a capture for this task." },
      { status: 409 }
    );
  }
}
