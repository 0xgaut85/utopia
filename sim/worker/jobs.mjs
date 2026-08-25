import { app } from "./db.mjs";
import { logEvent, safeError } from "./log.mjs";
import {
  assertBountyChain,
  bountyDepositTotal,
  taskPoints,
} from "./money.mjs";
import {
  assertSpendable,
  confirmOrReplay,
  ensureGas,
  ensureRecipientAta,
  escrowAddressFor,
  escrowKeyFor,
  reservedRealDeposits,
  sendToken,
  testSignUser,
  tokenBalance,
  userAddressFor,
  userKeyFor,
} from "./chain.mjs";
import { loadSimWallet } from "./wallet.mjs";
import { bountyById, launchUsers, planUserByUsername, slugFor } from "./catalog.mjs";
import {
  canUserClip,
  clipSplit,
  dominantHome,
  isIndoorTask,
  MAX_LOCATED_CLIPS,
  sameMetro,
  taskPin,
} from "./cohesion.mjs";
import { EVM_ESCROW, SOLANA_ESCROW } from "./money.mjs";

export async function ensureState() {
  return app.workerState.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

export async function acquireLock() {
  const result = await app.workerState.updateMany({
    where: { id: "singleton", moneyLocked: false },
    data: { moneyLocked: true, moneyLockAt: new Date() },
  });
  return result.count === 1;
}

export async function releaseLock() {
  await app.workerState.update({
    where: { id: "singleton" },
    data: { moneyLocked: false },
  });
}

export async function openJob() {
  return app.workerJob.findFirst({
    where: { status: "open" },
    orderBy: { createdAt: "asc" },
  });
}

function moneyInFlight(job) {
  const hashes = job.hashes || {};
  if (job.kind === "bounty.create") {
    return Boolean(hashes.escrowOut && !hashes.deposit);
  }
  if (job.kind === "bounty.close") {
    return Boolean(hashes.payout && !hashes.returnTx);
  }
  if (job.kind === "real.payout") {
    return job.status !== "done" && Boolean(hashes.payout || hashes.ata);
  }
  return false;
}

export async function findResumableJob() {
  const jobs = await app.workerJob.findMany({
    where: {
      status: { in: ["open", "failed"] },
      kind: { in: ["bounty.create", "bounty.close", "real.payout"] },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return (
    jobs.find(moneyInFlight) ||
    jobs.find((job) => job.kind === "real.payout" && job.status === "open") ||
    jobs.find((job) => job.status === "open") ||
    null
  );
}

async function persist(job, hashes, step) {
  await app.workerJob.update({
    where: { id: job.id },
    data: { hashes, step, error: null },
  });
  job.hashes = hashes;
  job.step = step;
}

function isRetryable(err) {
  return /spendable|rpc|timeout|not confirmed|econn|429|fetch|network|blockhash|rate|exceeds balance|insufficient|reverted|lock busy/i.test(
    String(err?.message || err)
  );
}

async function failJob(job, err, fatal) {
  const message = safeError(err);
  await app.workerJob.update({
    where: { id: job.id },
    data: {
      error: message,
      status: fatal ? "failed" : "open",
    },
  });
  await logEvent({
    kind: "error",
    level: "error",
    message,
    payload: { jobId: job.id, kind: job.kind, fatal },
  });
  if (fatal) await releaseLock();
}

async function keysForUser(user) {
  const plan = planUserByUsername(user.username);
  if (!plan) throw new Error(`no plan row for ${user.username}`);
  const keys = await loadSimWallet(plan.walletIndex);
  if (!keys) throw new Error(`no SimWallet ${plan.walletIndex}`);
  return { plan, keys };
}

async function locatedClipsByUser(userIds) {
  if (userIds.length === 0) return new Map();
  const rows = await app.submission.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      taskId: true,
      createdAt: true,
      task: { select: { lat: true, lng: true, locationName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const byUser = new Map();
  for (const row of rows) {
    const list = byUser.get(row.userId) || [];
    list.push(row);
    byUser.set(row.userId, list);
  }
  return byUser;
}

function samePayoutAddress(chainId, left, right) {
  if (!left || !right) return false;
  if (chainId === "usdc-solana") return left === right;
  return left.toLowerCase() === right.toLowerCase();
}

function isEscrowAddress(chainId, address) {
  if (!address) return false;
  if (chainId === "usdc-solana") return address === SOLANA_ESCROW;
  return address.toLowerCase() === EVM_ESCROW.toLowerCase();
}

export async function findTaskByBounty(bountyId) {
  return app.task.findFirst({
    where: {
      slug: { startsWith: `sim-${bountyId.toLowerCase()}-` },
      isSynthetic: true,
    },
  });
}

async function insertTask(bounty, creatorId, depositTxHash) {
  const existing = await findTaskByBounty(bounty.id);
  if (existing) return existing;
  const reused = await app.task.findFirst({
    where: { depositTxHash },
    select: { id: true, slug: true },
  });
  if (reused) return reused;
  let slug = slugFor(bounty);
  const clash = await app.task.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  return app.task.create({
    data: {
      slug,
      title: bounty.title,
      brief: bounty.brief,
      category: bounty.category,
      locationName: bounty.locationName,
      lat: bounty.lat,
      lng: bounty.lng,
      radiusM: bounty.radiusM,
      priceUsdc: bounty.priceUsdc,
      maxSubmissions: 20,
      status: "open",
      depositNetwork: bounty.chain,
      depositTxHash,
      fundedAt: new Date(),
      creatorKind: bounty.creatorKind,
      isSynthetic: true,
      creatorId,
      expiresAt: new Date(
        Date.now() + bounty.deadlineDays * 24 * 60 * 60 * 1000
      ),
    },
  });
}

async function cancelSiblingJobs(job) {
  const where = {
    id: { not: job.id },
    kind: job.kind,
    status: { in: ["open", "failed"] },
  };
  if (job.kind === "real.payout" && job.taskId) {
    where.taskId = job.taskId;
  } else if (job.bountyKey) {
    where.bountyKey = job.bountyKey;
  }
  await app.workerJob.updateMany({
    where,
    data: { status: "cancelled", error: "superseded by in-flight job" },
  });
}

export async function runCreateJob(job) {
  const bounty = bountyById(job.bountyKey);
  if (!bounty) throw new Error(`unknown bounty ${job.bountyKey}`);
  const already = await findTaskByBounty(bounty.id);
  if (already) {
    await app.workerJob.update({
      where: { id: job.id },
      data: { status: "done", taskId: already.id, step: 5 },
    });
    await releaseLock();
    return;
  }
  assertBountyChain(bounty);
  const hashes = { ...(job.hashes || {}) };
  const user = await app.user.findUnique({ where: { id: job.userId } });
  if (!user?.isSynthetic || !user.privyId?.startsWith("sim:")) {
    throw new Error("create funder is not a sim user");
  }
  const { keys } = await keysForUser(user);
  const amount = bountyDepositTotal(bounty.priceUsdc);
  const userAddress = userAddressFor(bounty.chain, keys);

  await persist(job, hashes, 1);
  await ensureGas(bounty.chain, userAddress, hashes, (next) =>
    persist(job, next, 1)
  );

  await persist(job, hashes, 2);
  if (!hashes.escrowOut) {
    await assertSpendable(bounty.chain, amount);
  }
  await sendToken({
    chainId: bounty.chain,
    fromKey: escrowKeyFor(bounty.chain),
    toAddress: userAddress,
    amount,
    hashes,
    hashKey: "escrowOut",
    persist: (next) => persist(job, next, 2),
  });
  await logEvent({
    kind: "fund",
    message: `escrow → ${user.username} ${amount} ${bounty.chain}`,
    payload: { bounty: bounty.id },
  });

  await persist(job, hashes, 3);
  await testSignUser(bounty.chain, keys);
  await sendToken({
    chainId: bounty.chain,
    fromKey: userKeyFor(bounty.chain, keys),
    toAddress: escrowAddressFor(bounty.chain),
    amount,
    hashes,
    hashKey: "deposit",
    persist: (next) => persist(job, next, 3),
  });

  const task = await insertTask(bounty, user.id, hashes.deposit);
  await app.workerJob.update({
    where: { id: job.id },
    data: { taskId: task.id, hashes, step: 4, status: "done" },
  });
  await releaseLock();
  await logEvent({
    kind: "bounty.create",
    message: `posted ${bounty.id} ${bounty.title}`,
    payload: { taskId: task.id, slug: task.slug },
  });
}

async function acceptSubmission(taskId, submissionId) {
  const task = await app.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, priceUsdc: true },
  });
  if (!task) throw new Error("Task not found");
  if (task.status !== "open") throw new Error("bounty already settled");
  const submission = await app.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, taskId: true, userId: true, status: true },
  });
  if (!submission || submission.taskId !== task.id) {
    throw new Error("submission not on task");
  }
  if (submission.status !== "pending") {
    throw new Error("submission already reviewed");
  }
  const points = taskPoints(task.priceUsdc);
  await app.$transaction([
    app.submission.update({
      where: { id: submission.id },
      data: { status: "accepted" },
    }),
    app.submission.updateMany({
      where: { taskId: task.id, status: "pending", id: { not: submission.id } },
      data: { status: "rejected" },
    }),
    app.user.update({
      where: { id: submission.userId },
      data: { points: { increment: points } },
    }),
    app.task.update({
      where: { id: task.id },
      data: { status: "closed" },
    }),
  ]);
  return { accepted: submission.id, pointsAwarded: points };
}

export async function pickWinner(task) {
  if (!task.isSynthetic) return null;
  const users = await app.user.findMany({
    where: {
      isSynthetic: true,
      isSeed: false,
      id: { not: task.creatorId },
      privyId: { startsWith: "sim:" },
    },
    include: {
      submissions: {
        where: { status: "accepted" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const locatedByUser = await locatedClipsByUser(
    users.map((user) => user.id)
  );
  const ranked = [];
  for (const user of users) {
    const plan = planUserByUsername(user.username);
    if (!plan) continue;
    const wallet = await loadSimWallet(plan.walletIndex);
    if (!wallet) continue;
    const clips = locatedByUser.get(user.id) || [];
    const already = clips.some((row) => row.taskId === task.id);
    if (!already && !canAcceptClip(user.username, task, clips)) continue;
    ranked.push({ user, plan, wins: user.submissions.length });
  }
  ranked.sort((a, b) => a.wins - b.wins || a.plan.walletIndex - b.plan.walletIndex);
  return ranked[0] || null;
}

export async function runCloseJob(job) {
  const bounty = bountyById(job.bountyKey);
  if (!bounty) throw new Error(`unknown bounty ${job.bountyKey}`);
  const task =
    (job.taskId &&
      (await app.task.findUnique({
        where: { id: job.taskId },
      }))) ||
    (await findTaskByBounty(bounty.id));
  if (!task) throw new Error(`task missing for ${bounty.id}`);
  if (!task.isSynthetic) throw new Error("refusing to close a real task");
  if (task.status !== "open") {
    await app.workerJob.update({
      where: { id: job.id },
      data: { status: "done", taskId: task.id, step: 5 },
    });
    await releaseLock();
    return;
  }

  const winner = await app.user.findUnique({ where: { id: job.userId } });
  if (
    !winner?.isSynthetic ||
    !winner.privyId?.startsWith("sim:") ||
    winner.id === task.creatorId
  ) {
    throw new Error("winner failed the sim rule");
  }
  const { keys } = await keysForUser(winner);
  const hashes = { ...(job.hashes || {}) };
  const amount = task.priceUsdc;
  const userAddress = userAddressFor(task.depositNetwork, keys);

  await persist(job, hashes, 1);
  await ensureGas(task.depositNetwork, userAddress, hashes, (next) =>
    persist(job, next, 1)
  );

  await persist(job, hashes, 2);
  await testSignUser(task.depositNetwork, keys);
  if (!hashes.payout) {
    await assertSpendable(task.depositNetwork, amount);
  }
  await sendToken({
    chainId: task.depositNetwork,
    fromKey: escrowKeyFor(task.depositNetwork),
    toAddress: userAddress,
    amount,
    hashes,
    hashKey: "payout",
    persist: (next) => persist(job, next, 2),
  });
  await logEvent({
    kind: "payout",
    message: `escrow → ${winner.username} ${amount} ${task.depositNetwork}`,
    payload: { bounty: bounty.id },
  });

  await persist(job, hashes, 3);
  await sendToken({
    chainId: task.depositNetwork,
    fromKey: userKeyFor(task.depositNetwork, keys),
    toAddress: escrowAddressFor(task.depositNetwork),
    amount,
    hashes,
    hashKey: "returnTx",
    persist: (next) => persist(job, next, 3),
  });
  if (hashes.returnTx) {
    await confirmOrReplay(
      task.depositNetwork,
      hashes.returnTx,
      hashes.returnTxRaw
    );
  }

  const clip = await ensureWinnerClip(task, winner);
  const result = await acceptSubmission(task.id, clip.id);
  await app.workerJob.update({
    where: { id: job.id },
    data: { taskId: task.id, hashes, step: 5, status: "done" },
  });
  await releaseLock();
  await logEvent({
    kind: "close",
    message: `closed ${bounty.id} → ${winner.username} +${result.pointsAwarded}`,
    payload: { taskId: task.id, submissionId: clip.id },
  });
}

/**
 * Real bounty payout. Never used for synthetic tasks. Sends only priceUsdc
 * (the 10% fee stays in escrow) to the address snapshotted at accept time.
 */
export async function runRealPayoutJob(job) {
  const task = await app.task.findUnique({
    where: { id: job.taskId },
    include: {
      creator: {
        select: {
          id: true,
          payoutSolanaUsdc: true,
          payoutUsdcBase: true,
          payoutUsdgRobinhood: true,
        },
      },
      submissions: {
        where: { status: "accepted" },
        take: 1,
        include: {
          user: {
            select: {
              id: true,
              isSynthetic: true,
              privyId: true,
            },
          },
        },
      },
    },
  });
  if (!task) throw new Error("real payout task missing");
  if (task.isSynthetic) {
    throw new Error("refusing real.payout on a synthetic bounty");
  }
  if (task.status !== "closed") {
    throw new Error("real payout requires a closed bounty");
  }
  if (!task.depositTxHash || !task.fundedAt || !task.depositNetwork) {
    throw new Error("real payout requires a verified deposit");
  }
  if (task.payoutTxHash) {
    await app.workerJob.update({
      where: { id: job.id },
      data: {
        status: "done",
        taskId: task.id,
        step: 5,
        hashes: { ...(job.hashes || {}), payout: task.payoutTxHash },
      },
    });
    await releaseLock();
    return;
  }

  const hashes = { ...(job.hashes || {}) };
  const amount = Math.round(Number(task.priceUsdc) * 100) / 100;
  const toAddress = String(task.payoutAddress || hashes.toAddress || "");
  const lockedAmount = Number(hashes.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
    throw new Error("real payout amount is outside the allowed range");
  }
  if (Number.isFinite(lockedAmount) && Math.abs(lockedAmount - amount) > 0.001) {
    throw new Error("real payout amount does not match the accepted bounty");
  }
  if (!toAddress || !samePayoutAddress(task.depositNetwork, toAddress, task.payoutAddress)) {
    throw new Error("real payout address was changed after accept");
  }
  if (isEscrowAddress(task.depositNetwork, toAddress)) {
    throw new Error("refusing to pay the escrow wallet");
  }

  const winner = task.submissions[0]?.user;
  if (
    !winner ||
    winner.isSynthetic ||
    winner.privyId?.startsWith("sim:") ||
    winner.id === task.creatorId
  ) {
    throw new Error("real payout winner failed the real-user rule");
  }

  const onChain = await tokenBalance(
    task.depositNetwork,
    escrowAddressFor(task.depositNetwork)
  );
  const reserved = await reservedRealDeposits(task.depositNetwork, task.id);
  if (onChain + 0.001 < reserved + amount) {
    throw new Error(
      `escrow ${task.depositNetwork} has ${onChain.toFixed(2)}, need ${amount} plus ${reserved.toFixed(2)} reserved`
    );
  }

  await persist(job, hashes, 1);
  if (task.depositNetwork === "usdc-solana") {
    await ensureRecipientAta(toAddress, hashes, (next) => persist(job, next, 1));
  }

  await persist(job, hashes, 2);
  await sendToken({
    chainId: task.depositNetwork,
    fromKey: escrowKeyFor(task.depositNetwork),
    toAddress,
    amount,
    hashes,
    hashKey: "payout",
    persist: (next) => persist(job, next, 2),
  });

  await app.task.update({
    where: { id: task.id },
    data: { payoutTxHash: hashes.payout, payoutAddress: toAddress },
  });
  await app.workerJob.update({
    where: { id: job.id },
    data: { taskId: task.id, hashes, step: 5, status: "done" },
  });
  await releaseLock();
  await logEvent({
    kind: "payout",
    message: `real escrow → ${toAddress.slice(0, 6)}… ${amount} ${task.depositNetwork}`,
    payload: { taskId: task.id, amount, chain: task.depositNetwork },
  });
}

export async function resumeJob(job) {
  try {
    if (job.status === "failed") {
      await app.workerJob.update({
        where: { id: job.id },
        data: { status: "open", error: null },
      });
      job.status = "open";
      await acquireLock();
    } else if (job.kind === "real.payout") {
      const state = await app.workerState.findUnique({
        where: { id: "singleton" },
      });
      if (!state?.moneyLocked && !(await acquireLock())) {
        throw new Error("money lock busy");
      }
    }
    if (moneyInFlight(job)) await cancelSiblingJobs(job);
    if (job.kind === "bounty.create") await runCreateJob(job);
    else if (job.kind === "bounty.close") await runCloseJob(job);
    else if (job.kind === "real.payout") await runRealPayoutJob(job);
    else throw new Error(`unknown job kind ${job.kind}`);
    return { ok: true };
  } catch (err) {
    const fatal = !isRetryable(err);
    await failJob(job, err, fatal);
    return { ok: false, fatal, error: safeError(err) };
  }
}

export async function startCreateJob(bounty, funder) {
  const existingTask = await findTaskByBounty(bounty.id);
  if (existingTask) return { skipped: true, taskId: existingTask.id };
  const existingJobs = await app.workerJob.findMany({
    where: {
      kind: "bounty.create",
      bountyKey: bounty.id,
      status: { in: ["open", "failed"] },
    },
    orderBy: { createdAt: "asc" },
  });
  const inFlight = existingJobs.find(moneyInFlight);
  if (inFlight) return resumeJob(inFlight);
  const openExisting = existingJobs.find((job) => job.status === "open");
  if (openExisting) return resumeJob(openExisting);
  if (!(await acquireLock())) return { locked: true };
  const job = await app.workerJob.create({
    data: {
      kind: "bounty.create",
      status: "open",
      step: 0,
      bountyKey: bounty.id,
      userId: funder.id,
      chain: bounty.chain,
      hashes: {},
    },
  });
  return resumeJob(job);
}

export async function startCloseJob(bounty, task, winner) {
  const existingJobs = await app.workerJob.findMany({
    where: {
      kind: "bounty.close",
      bountyKey: bounty.id,
      status: { in: ["open", "failed"] },
    },
    orderBy: { createdAt: "asc" },
  });
  const inFlight = existingJobs.find(moneyInFlight);
  if (inFlight) return resumeJob(inFlight);
  const openExisting = existingJobs.find((job) => job.status === "open");
  if (openExisting) return resumeJob(openExisting);
  if (!(await acquireLock())) return { locked: true };
  const job = await app.workerJob.create({
    data: {
      kind: "bounty.close",
      status: "open",
      step: 0,
      bountyKey: bounty.id,
      taskId: task.id,
      userId: winner.id,
      chain: task.depositNetwork,
      hashes: {},
    },
  });
  return resumeJob(job);
}

async function ensureWinnerClip(task, user) {
  const existing = await app.submission.findUnique({
    where: { taskId_userId: { taskId: task.id, userId: user.id } },
  });
  if (existing) return existing;
  return writeClip(task, user);
}

const PLACEHOLDER =
  "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE=";

export function clipSizeBytes(seed) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 40 * 1024 * 1024 + (hash % (81 * 1024 * 1024));
}

function hashString(value) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/**
 * Indoor / in-house clips. Kitchen, laundry, aisle — same person is fine.
 * 12% still submit nothing. Located street clips are capped separately.
 */
export function plannedClipCount(username) {
  const bucket = hashString(String(username).toLowerCase()) % 100;
  if (bucket < 12) return 0;
  if (bucket < 50) return 1;
  if (bucket < 78) return 2;
  if (bucket < 93) return 3;
  return 4;
}

export function canAcceptClip(username, task, submissions = []) {
  const wantIndoor = plannedClipCount(username);
  if (wantIndoor === 0) return false;
  const { indoor, located } = clipSplit(submissions);
  if (isIndoorTask(task)) return indoor < wantIndoor;
  if (located >= MAX_LOCATED_CLIPS) return false;
  return canUserClip(username, task, submissions);
}

function isSyntheticOpen(task) {
  if (!task?.isSynthetic || task.status !== "open") return false;
  if (task.expiresAt && new Date(task.expiresAt).getTime() <= Date.now()) {
    return false;
  }
  return task._count.submissions < task.maxSubmissions;
}

const DRIP_GAP_MS = 12 * 60 * 1000;
const FIRST_CLIP_MIN_MS = 8 * 60 * 1000;
const FIRST_CLIP_JITTER_MS = 12 * 60 * 1000;
const NEXT_CLIP_MIN_MS = 35 * 60 * 1000;
const NEXT_CLIP_JITTER_MS = 40 * 60 * 1000;

function jitterMs(seed, min, span) {
  return min + (hashString(seed) % span);
}

/**
 * Later joiners drip clips onto open synthetic bounties only. Launch users
 * already had their burst; this never writes on real tasks or as real users.
 * At most one clip every ~12 minutes, and a user's next clip waits much longer.
 */
export async function writeDripClips(limit = 1) {
  const launchNames = new Set(
    launchUsers().map((row) => row.username.toLowerCase())
  );
  const lastDrip = await app.submission.findFirst({
    where: {
      user: {
        isSynthetic: true,
        privyId: { startsWith: "sim:" },
        NOT: {
          username: { in: [...launchNames], mode: "insensitive" },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (
    lastDrip &&
    Date.now() - lastDrip.createdAt.getTime() < DRIP_GAP_MS
  ) {
    return 0;
  }

  const users = await app.user.findMany({
    where: {
      isSynthetic: true,
      isSeed: false,
      privyId: { startsWith: "sim:" },
    },
    include: {
      submissions: {
        select: {
          taskId: true,
          createdAt: true,
          task: { select: { lat: true, lng: true, locationName: true } },
        },
      },
      createdTasks: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const tasks = await app.task.findMany({
    where: { isSynthetic: true, status: "open" },
    include: { _count: { select: { submissions: true } } },
  });
  const open = tasks.filter(isSyntheticOpen);
  if (open.length === 0) return 0;

  const now = Date.now();
  let written = 0;
  for (const user of users) {
    if (written >= limit) break;
    if (launchNames.has(user.username.toLowerCase())) continue;
    if (plannedClipCount(user.username) === 0) continue;

    const lastMine = user.submissions.reduce(
      (latest, row) =>
        !latest || row.createdAt > latest ? row.createdAt : latest,
      null
    );
    const wait = lastMine
      ? lastMine.getTime() +
        jitterMs(`${user.id}:next`, NEXT_CLIP_MIN_MS, NEXT_CLIP_JITTER_MS)
      : user.createdAt.getTime() +
        jitterMs(`${user.id}:first`, FIRST_CLIP_MIN_MS, FIRST_CLIP_JITTER_MS);
    if (now < wait) continue;

    const mine = new Set(user.createdTasks.map((task) => task.id));
    const have = new Set(user.submissions.map((row) => row.taskId));
    const options = open
      .filter(
        (task) =>
          !have.has(task.id) &&
          !mine.has(task.id) &&
          canAcceptClip(user.username, task, user.submissions)
      )
      .sort((a, b) => a._count.submissions - b._count.submissions);
    if (options.length === 0) continue;
    const pick =
      options[
        hashString(`${user.id}:${user.submissions.length}`) %
          Math.min(3, options.length)
      ];
    await writeClip(pick, user);
    pick._count.submissions += 1;
    written += 1;
  }
  return written;
}

/**
 * Drop only street clips that teleport someone. Indoor / in-house clips
 * (kitchen, laundry) are allowed to stack on the same person.
 */
export async function purgeIncoherentClips() {
  const users = await app.user.findMany({
    where: { isSynthetic: true, privyId: { startsWith: "sim:" } },
    include: {
      submissions: {
        where: { status: "pending" },
        include: {
          task: {
            select: {
              id: true,
              isSynthetic: true,
              lat: true,
              lng: true,
              locationName: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const remove = [];
  for (const user of users) {
    const mine = user.submissions.filter((row) => row.task?.isSynthetic);
    const home = dominantHome(mine);
    const locatedOk = [];
    for (const row of mine) {
      const pin = taskPin(row.task);
      if (!pin) continue;
      if (home && !sameMetro(home, pin)) {
        remove.push(row.id);
        continue;
      }
      locatedOk.push(row);
    }
    for (const row of locatedOk.slice(MAX_LOCATED_CLIPS)) {
      remove.push(row.id);
    }
  }

  if (remove.length === 0) return 0;
  await app.submission.deleteMany({
    where: {
      id: { in: remove },
      status: "pending",
      user: { isSynthetic: true, privyId: { startsWith: "sim:" } },
      task: { isSynthetic: true },
    },
  });
  await logEvent({
    kind: "tick",
    message: `purged ${remove.length} incoherent clips`,
  });
  return remove.length;
}

export async function writeClip(task, user) {
  if (!task.isSynthetic) {
    throw new Error("refusing to write a clip on a real bounty");
  }
  if (!user.isSynthetic || !user.privyId?.startsWith("sim:")) {
    throw new Error("refusing to write a clip for a real user");
  }
  const prior = await app.submission.findMany({
    where: { userId: user.id },
    select: {
      createdAt: true,
      task: { select: { lat: true, lng: true, locationName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!canAcceptClip(user.username, task, prior)) {
    throw new Error(
      isIndoorTask(task)
        ? "refusing clip: indoor cap reached"
        : "refusing clip: user would teleport or exceed located cap"
    );
  }
  const created = await app.submission.create({
    data: {
      taskId: task.id,
      userId: user.id,
      photo: PLACEHOLDER,
      sizeBytes: clipSizeBytes(`${task.id}:${user.id}`),
      status: "pending",
      lat: task.lat ?? undefined,
      lng: task.lng ?? undefined,
    },
  });
  await logEvent({
    kind: "clip.submit",
    message: `${user.username} → ${task.slug}`,
    payload: { taskId: task.id, submissionId: created.id },
  });
  return created;
}
