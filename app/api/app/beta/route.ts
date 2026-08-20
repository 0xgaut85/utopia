import { NextResponse } from "next/server";
import { BETA_COOKIE, BETA_COOKIE_MAX_AGE } from "@/lib/app/beta";

/** Validates a private beta code and, on success, sets the access cookie. */
export async function POST(request: Request) {
  const code = process.env.APP_BETA_CODE;
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  const submitted = typeof body.code === "string" ? body.code.trim() : "";

  if (!code || submitted !== code) {
    return NextResponse.json(
      { error: "That code is not valid." },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(BETA_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BETA_COOKIE_MAX_AGE,
  });
  return response;
}
