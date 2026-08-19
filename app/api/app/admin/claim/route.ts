import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { getAuthUser } from "@/lib/app/auth";
import { publicUser } from "@/lib/app/serialize";

/** Grants the team reviewer role to the signed in user via the admin code. */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.ADMIN_SECRET;
  const body = (await request.json().catch(() => ({}))) as { code?: string };

  if (!secret || body.code !== secret) {
    return NextResponse.json({ error: "Invalid team code." }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
  });

  return NextResponse.json({ user: publicUser(updated, true) });
}
