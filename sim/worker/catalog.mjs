import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "./db.mjs";
import { logEvent } from "./log.mjs";
import { loadSimWallet, publicAddresses } from "./wallet.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const USERS = JSON.parse(
  readFileSync(join(root, "sim/plan/users.json"), "utf8")
);
export const BOUNTIES = JSON.parse(
  readFileSync(join(root, "sim/plan/bounties.json"), "utf8")
);

if (!Array.isArray(USERS) || USERS.length !== 300) {
  throw new Error("users.json must have 300 rows");
}
if (!Array.isArray(BOUNTIES) || BOUNTIES.length !== 75) {
  throw new Error("bounties.json must have 75 rows");
}

export function bountyById(id) {
  return BOUNTIES.find((row) => row.id === id) || null;
}

export function bountyFromTaskSlug(slug) {
  const match = /^sim-([a-z0-9]+)-/i.exec(String(slug || ""));
  return match ? bountyById(match[1].toUpperCase()) : null;
}

export function planUserByUsername(username) {
  const key = username.toLowerCase();
  return USERS.find((row) => row.username.toLowerCase() === key) || null;
}

export function slugFor(bounty) {
  const title = bounty.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `sim-${bounty.id.toLowerCase()}-${title || "bounty"}`;
}

export function dueAt(startedAt, day, timeMinutes) {
  return (
    startedAt.getTime() +
    Number(day) * 24 * 60 * 60 * 1000 +
    Number(timeMinutes) * 60 * 1000
  );
}

export function isDue(startedAt, day, timeMinutes, now = Date.now()) {
  return now >= dueAt(startedAt, day, timeMinutes);
}

function avatarUrlFor(row) {
  if (!row.avatar) return null;
  const value = String(row.avatar);
  if (value.startsWith("http") || value.startsWith("/")) return value;
  return `/sim-avatars/${value}`;
}

export async function ensureUser(row) {
  const privyId = `sim:${row.username}`;
  const avatarUrl = avatarUrlFor(row);
  const wallet = await loadSimWallet(row.walletIndex);
  if (!wallet) {
    await logEvent({
      kind: "error",
      level: "error",
      message: `no SimWallet for ${row.username}`,
    });
    return { user: null, created: false };
  }

  const existing =
    (await app.user.findFirst({ where: { privyId } })) ||
    (await app.user.findFirst({
      where: { isSynthetic: true, wallet: wallet.evmAddress },
    }));

  if (existing) {
    if (!existing.isSynthetic || !existing.privyId?.startsWith("sim:")) {
      if (existing.privyId === privyId) return { user: existing, created: false };
      await logEvent({
        kind: "user.join",
        level: "warn",
        message: `skip ${row.username}, name taken by a real account`,
      });
      return { user: null, created: false };
    }
    if (existing.username.toLowerCase() !== row.username.toLowerCase()) {
      const clash = await app.user.findFirst({
        where: {
          id: { not: existing.id },
          username: { equals: row.username, mode: "insensitive" },
        },
      });
      if (clash) {
        await logEvent({
          kind: "user.join",
          level: "warn",
          message: `skip ${row.username}, name taken by a real account`,
        });
        return { user: existing, created: false };
      }
    }
    const data = {};
    if (existing.username !== row.username) data.username = row.username;
    if (existing.privyId !== privyId) data.privyId = privyId;
    if (existing.avatarUrl !== avatarUrl) data.avatarUrl = avatarUrl;
    if (Object.keys(data).length === 0) {
      return { user: existing, created: false };
    }
    const updated = await app.user.update({
      where: { id: existing.id },
      data,
    });
    await logEvent({
      kind: "user.join",
      message: data.username
        ? `renamed ${existing.username} → ${updated.username}`
        : `sync ${updated.username}`,
      payload: { walletIndex: row.walletIndex },
    });
    return { user: updated, created: false };
  }

  const taken = await app.user.findFirst({
    where: { username: { equals: row.username, mode: "insensitive" } },
  });
  if (taken) {
    if (taken.privyId === privyId) return { user: taken, created: false };
    await logEvent({
      kind: "user.join",
      level: "warn",
      message: `skip ${row.username}, name taken by a real account`,
    });
    return { user: null, created: false };
  }

  const created = await app.user.create({
    data: {
      privyId,
      username: row.username,
      isSeed: false,
      isSynthetic: true,
      avatarUrl,
      ...publicAddresses(wallet),
    },
  });
  await logEvent({
    kind: "user.join",
    message: created.username,
    payload: { walletIndex: row.walletIndex },
  });
  return { user: created, created: true };
}

export async function ensureDueUsers(startedAt) {
  const now = Date.now();
  let created = 0;
  for (const row of USERS) {
    if (now < startedAt.getTime() + row.joinOffsetMinutes * 60 * 1000) {
      continue;
    }
    const result = await ensureUser(row);
    if (result.created) created += 1;
  }
  return created;
}

export async function findFunder(username) {
  return app.user.findFirst({
    where: {
      isSynthetic: true,
      privyId: `sim:${username}`,
    },
  });
}

export function launchUsers() {
  return USERS.filter((row) => row.launch);
}

export function launchBounties() {
  return BOUNTIES.filter((row) => row.launch);
}

export function dueCreates(startedAt) {
  return BOUNTIES.filter((row) =>
    isDue(startedAt, row.day, row.timeMinutes)
  );
}

export function dueCloses(startedAt) {
  return BOUNTIES.filter(
    (row) =>
      row.plannedClose &&
      isDue(startedAt, row.closeDay, row.closeTimeMinutes)
  );
}

/** Last 6 hours of a bounty, or already past the deadline. */
const CLOSE_LEAD_MS = 6 * 60 * 60 * 1000;

export function isNearDeadline(expiresAt, now = Date.now()) {
  if (!expiresAt) return false;
  return now >= new Date(expiresAt).getTime() - CLOSE_LEAD_MS;
}
