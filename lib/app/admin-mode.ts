import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_MODE_COOKIE = "ud_adminmode";

function adminPassword() {
  return process.env.ADMIN_MODE_PASSWORD ?? "";
}

export function isAdminModeConfigured() {
  return adminPassword().length > 0;
}

export function adminPasswordMatches(input: string) {
  const expected = adminPassword();
  if (!expected) return false;
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function adminSessionToken() {
  return createHmac("sha256", adminPassword())
    .update("ud-adminmode-v1")
    .digest("hex");
}

export function adminSessionMatches(token: string | undefined) {
  if (!token || !isAdminModeConfigured()) return false;
  const expected = Buffer.from(adminSessionToken());
  const received = Buffer.from(token);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export async function isAdminModeAuthed() {
  const jar = await cookies();
  return adminSessionMatches(jar.get(ADMIN_MODE_COOKIE)?.value);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}
