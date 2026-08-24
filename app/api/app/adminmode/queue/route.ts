import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { isAdminModeAuthed } from "@/lib/app/admin-mode";

export async function GET() {
  if (!(await isAdminModeAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submissions = await prisma.submission.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      note: true,
      lat: true,
      lng: true,
      photo: true,
      createdAt: true,
      task: {
        select: {
          id: true,
          title: true,
          priceUsdc: true,
          status: true,
          depositNetwork: true,
          expiresAt: true,
        },
      },
      user: {
        select: {
          username: true,
          payoutSolanaUsdc: true,
          payoutUsdcBase: true,
          payoutUsdgRobinhood: true,
        },
      },
    },
  });

  return NextResponse.json({
    submissions: submissions.map((submission) => ({
      id: submission.id,
      note: submission.note,
      lat: submission.lat,
      lng: submission.lng,
      photo: submission.photo,
      createdAt: submission.createdAt.toISOString(),
      task: {
        ...submission.task,
        expiresAt: submission.task.expiresAt?.toISOString() ?? null,
      },
      user: submission.user,
    })),
  });
}
