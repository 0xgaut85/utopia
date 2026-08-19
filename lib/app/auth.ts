import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/lib/app/db";
import type { User } from "@prisma/client";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!appId) return null;
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`)
    );
  }
  return jwks;
}

/** Verifies a Privy access token and returns the Privy DID, or null. */
export async function verifyPrivyToken(
  token: string | null
): Promise<string | null> {
  const keySet = getJwks();
  if (!keySet || !token) return null;

  try {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: "privy.io",
      audience: appId,
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

/** Resolves the authenticated database user from a request, or null. */
export async function getAuthUser(request: Request): Promise<User | null> {
  const privyId = await verifyPrivyToken(bearerToken(request));
  if (!privyId) return null;
  return prisma.user.findUnique({ where: { privyId } });
}

/** Resolves just the verified Privy DID from a request, or null. */
export async function getAuthPrivyId(request: Request): Promise<string | null> {
  return verifyPrivyToken(bearerToken(request));
}
