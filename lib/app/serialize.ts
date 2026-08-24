import type { User } from "@prisma/client";

export type PublicUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  points: number;
  wallet: string | null;
  email?: string | null;
  isAdmin?: boolean;
  payoutSolanaUsdc?: string | null;
  payoutUsdcBase?: string | null;
  payoutUsdgRobinhood?: string | null;
  createdAt: string;
};

export function publicUser(user: User, includePrivate = false): PublicUser {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    points: user.points,
    wallet: user.wallet,
    ...(includePrivate
      ? {
          email: user.email,
          isAdmin: user.isAdmin,
          payoutSolanaUsdc: user.payoutSolanaUsdc,
          payoutUsdcBase: user.payoutUsdcBase,
          payoutUsdgRobinhood: user.payoutUsdgRobinhood,
        }
      : {}),
    createdAt: user.createdAt.toISOString(),
  };
}
