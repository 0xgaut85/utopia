import { app } from "./db.mjs";
import { logEvent, safeError } from "./log.mjs";
import {
  assertBountyChain,
  bountyDepositTotal,
  creatorPoints,
  taskPoints,
} from "./money.mjs";
import {
  assertSpendable,
  confirmOrReplay,
  ensureGas,
  escrowAddressFor,
  escrowKeyFor,
  sendToken,
  testSignUser,
  userAddressFor,
  userKeyFor,
} from "./chain.mjs";
import { loadSimWallet } from "./wallet.mjs";
import { bountyById, planUserByUsername, slugFor } from "./catalog.mjs";

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
  return false;
}

export async function findResumableJob() {
  const jobs = await app.workerJob.findMany({
    where: {
      status: { in: ["open", "failed"] },
      kind: { in: ["bounty.create", "bounty.close"] },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return jobs.find(moneyInFlight) || jobs.find((job) => job.status === "open") || null;
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
  return /spendable|rpc|timeout|not confirmed|econn|429|fetch|network|blockhash|rate|exceeds balance|insufficient|reverted/i.test(
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
  const [task] = await app.$transaction([
    app.task.create({
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
    }),
    app.user.update({
      where: { id: creatorId },
      data: { points: { increment: creatorPoints(bounty.priceUsdc) } },
    }),
  ]);
  return task;
}

async function cancelSiblingJobs(job) {
  await app.workerJob.updateMany({
    where: {
      id: { not: job.id },
      kind: job.kind,
      bountyKey: job.bountyKey,
      status: { in: ["open", "failed"] },
    },
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
  const ranked = [];
  for (const user of users) {
    const plan = planUserByUsername(user.username);
    if (!plan) continue;
    const wallet = await loadSimWallet(plan.walletIndex);
    if (!wallet) continue;
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

export async function resumeJob(job) {
  try {
    if (job.status === "failed") {
      await app.workerJob.update({
        where: { id: job.id },
        data: { status: "open", error: null },
      });
      job.status = "open";
      await acquireLock();
    }
    if (moneyInFlight(job)) await cancelSiblingJobs(job);
    if (job.kind === "bounty.create") await runCreateJob(job);
    else if (job.kind === "bounty.close") await runCloseJob(job);
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

export async function writeClip(task, user) {
  if (!task.isSynthetic) {
    throw new Error("refusing to write a clip on a real bounty");
  }
  if (!user.isSynthetic || !user.privyId?.startsWith("sim:")) {
    throw new Error("refusing to write a clip for a real user");
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
