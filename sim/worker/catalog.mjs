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

export async function ensureUser(row) {
  const privyId = `sim:${row.username}`;
  const taken = await app.user.findFirst({
    where: { username: { equals: row.username, mode: "insensitive" } },
  });
  if (taken) {
    if (taken.privyId === privyId) return taken;
    await logEvent({
      kind: "user.join",
      level: "warn",
      message: `skip ${row.username}, name taken by a real account`,
    });
    return null;
  }
  const wallet = await loadSimWallet(row.walletIndex);
  if (!wallet) {
    await logEvent({
      kind: "error",
      level: "error",
      message: `no SimWallet for ${row.username}`,
    });
    return null;
  }
  const created = await app.user.create({
    data: {
      privyId,
      username: row.username,
      isSeed: false,
      isSynthetic: true,
      ...publicAddresses(wallet),
    },
  });
  await logEvent({
    kind: "user.join",
    message: created.username,
    payload: { walletIndex: row.walletIndex },
  });
  return created;
}

export async function ensureDueUsers(startedAt) {
  const now = Date.now();
  let created = 0;
  for (const row of USERS) {
    if (now < startedAt.getTime() + row.joinOffsetMinutes * 60 * 1000) {
      continue;
    }
    const existing = await app.user.findFirst({
      where: { privyId: `sim:${row.username}` },
    });
    if (existing) continue;
    const user = await ensureUser(row);
    if (user) created += 1;
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
