import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { getAuthPrivyId } from "@/lib/app/auth";
import { publicUser } from "@/lib/app/serialize";

function randomUsername() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `scout_${suffix}`;
}

export async function POST(request: Request) {
  const privyId = await getAuthPrivyId(request);
  if (!privyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    wallet?: string;
  };

  const email = typeof body.email === "string" ? body.email.slice(0, 320) : undefined;
  const wallet = typeof body.wallet === "string" ? body.wallet.slice(0, 100) : undefined;

  const existing = await prisma.user.findUnique({ where: { privyId } });
  if (existing) {
    const updated = await prisma.user.update({
      where: { privyId },
      data: {
        email: email ?? existing.email,
        wallet: wallet ?? existing.wallet,
      },
    });
    return NextResponse.json({ user: publicUser(updated, true) });
  }

  // Retry on the rare username collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await prisma.user.create({
        data: {
          privyId,
          username: randomUsername(),
          email,
          wallet,
          points: 25,
        },
      });
      return NextResponse.json({ user: publicUser(created, true) });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Could not create account" }, { status: 500 });
}
