import type { User } from "@prisma/client";

export type PublicUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  points: number;
  wallet: string | null;
  email?: string | null;
  isAdmin?: boolean;
  createdAt: string;
};

export function publicUser(user: User, includePrivate = false): PublicUser {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    points: user.points,
    wallet: user.wallet,
    ...(includePrivate ? { email: user.email, isAdmin: user.isAdmin } : {}),
    createdAt: user.createdAt.toISOString(),
  };
}
