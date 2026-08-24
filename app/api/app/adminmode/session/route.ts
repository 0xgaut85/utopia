import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_MODE_COOKIE,
  adminCookieOptions,
  adminPasswordMatches,
  adminSessionToken,
  isAdminModeConfigured,
} from "@/lib/app/admin-mode";

export async function POST(request: Request) {
  if (!isAdminModeConfigured()) {
    return NextResponse.json(
      { error: "Admin mode is not configured." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    password?: string;
  };
  const password = typeof body.password === "string" ? body.password : "";

  if (!adminPasswordMatches(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(ADMIN_MODE_COOKIE, adminSessionToken(), adminCookieOptions());
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.set(ADMIN_MODE_COOKIE, "", { ...adminCookieOptions(), maxAge: 0 });
  return NextResponse.json({ ok: true });
}
