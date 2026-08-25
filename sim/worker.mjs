import { app, disconnect } from "./worker/db.mjs";
import { logEvent, safeError } from "./worker/log.mjs";
import { escrowKeysReady } from "./worker/money.mjs";
import {
  BOUNTIES,
  dueCreates,
  isNearDeadline,
  ensureDueUsers,
  findFunder,
  launchBounties,
  launchUsers,
} from "./worker/catalog.mjs";
import {
  ensureState,
  findTaskByBounty,
  findResumableJob,
  openJob,
  pickWinner,
  releaseLock,
  resumeJob,
  startCloseJob,
  startCreateJob,
  canAcceptClip,
  purgeIncoherentClips,
  writeClip,
  writeDripClips,
} from "./worker/jobs.mjs";

const TICK_MS = 20_000;
const HEARTBEAT_MS = 60_000;

let ticking = false;
let waitingLogged = false;

async function heartbeat() {
  const state = await app.workerState.findUnique({
    where: { id: "singleton" },
  });
  const job = await openJob();
  const users = await app.user.count({ where: { isSynthetic: true } });
  const tasks = await app.task.count({ where: { isSynthetic: true } });
  const clips = await app.submission.count({
    where: { user: { isSynthetic: true } },
  });
  const ready = escrowKeysReady();
  await logEvent({
    kind: "heartbeat",
    message: ready
      ? `t+${state?.startedAt ? Math.floor((Date.now() - state.startedAt.getTime()) / 60000) : "?"}m users=${users} tasks=${tasks} clips=${clips}`
      : "waiting for escrow keys",
    payload: {
      waitingForKeys: !ready,
      startedAt: state?.startedAt?.toISOString() || null,
      moneyLocked: Boolean(state?.moneyLocked),
      openJob: job?.id || null,
      users,
      tasks,
      clips,
    },
  });
}

async function writeLaunchClips() {
  const launch = launchUsers();
  for (const bounty of launchBounties()) {
    const task = await findTaskByBounty(bounty.id);
    if (!task?.isSynthetic) continue;
    const have = await app.submission.count({ where: { taskId: task.id } });
    const need = (bounty.launchClips || 0) - have;
    if (need <= 0) continue;
    const creator = task.creatorId
      ? await app.user.findUnique({ where: { id: task.creatorId } })
      : null;
    const candidates = [];
    for (const row of launch) {
      if (creator && row.username.toLowerCase() === creator.username.toLowerCase()) {
        continue;
      }
      const user = await app.user.findFirst({
        where: { privyId: `sim:${row.username}` },
      });
      if (!user) continue;
      const already = await app.submission.findUnique({
        where: { taskId_userId: { taskId: task.id, userId: user.id } },
      });
      if (already) continue;
      const prior = await app.submission.findMany({
        where: { userId: user.id },
        select: {
          createdAt: true,
          task: { select: { lat: true, lng: true, locationName: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      if (canAcceptClip(user.username, task, prior)) candidates.push(user);
    }
    for (const user of candidates.slice(0, need)) {
      await writeClip(task, user);
    }
  }
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    if (!escrowKeysReady()) {
      if (!waitingLogged) {
        await logEvent({
          kind: "heartbeat",
          level: "warn",
          message: "waiting for ESCROW_KEY_EVM and ESCROW_KEY_SOLANA",
        });
        waitingLogged = true;
      }
      return;
    }

    const state = await ensureState();
    if (!state.startedAt) {
      const started = await app.workerState.update({
        where: { id: "singleton" },
        data: { startedAt: new Date() },
      });
      await logEvent({
        kind: "tick",
        message: `T+0 ${started.startedAt.toISOString()}`,
      });
    }

    const current = await app.workerState.findUnique({
      where: { id: "singleton" },
    });
    const startedAt = current.startedAt;
    const job = await findResumableJob();
    if (job) {
      const result = await resumeJob(job);
      await logEvent({
        kind: "tick",
        message: result.ok
          ? `resumed ${job.kind} ${job.bountyKey || job.taskId}`
          : `retry ${job.kind} ${job.bountyKey || job.taskId}: ${result.error}`,
        payload: { jobId: job.id, ok: result.ok },
      });
      return;
    }

    if (current.moneyLocked) {
      await releaseLock();
    }

    const joined = await ensureDueUsers(startedAt);
    if (joined) {
      await logEvent({
        kind: "tick",
        message: `joined ${joined} users`,
      });
    }

    for (const bounty of dueCreates(startedAt)) {
      const existing = await findTaskByBounty(bounty.id);
      if (existing) continue;
      const funder = await findFunder(bounty.funder);
      if (!funder) {
        await logEvent({
          kind: "error",
          level: "warn",
          message: `funder ${bounty.funder} not created yet for ${bounty.id}`,
        });
        continue;
      }
      await logEvent({
        kind: "tick",
        message: `create ${bounty.id}`,
      });
      await startCreateJob(bounty, funder);
      await writeLaunchClips();
      return;
    }

    await writeLaunchClips();
    const dripped = await writeDripClips(1);
    if (dripped) {
      await logEvent({
        kind: "tick",
        message: `drip ${dripped} clips`,
      });
    }

    for (const bounty of BOUNTIES.filter((row) => row.plannedClose)) {
      const task = await findTaskByBounty(bounty.id);
      if (!task || task.status !== "open") continue;
      if (!isNearDeadline(task.expiresAt)) continue;
      const picked = await pickWinner(task);
      if (!picked) {
        await logEvent({
          kind: "error",
          level: "warn",
          message: `no eligible winner for ${bounty.id}`,
        });
        continue;
      }
      await logEvent({
        kind: "tick",
        message: `close ${bounty.id} → ${picked.user.username}`,
      });
      await startCloseJob(bounty, task, picked.user);
      return;
    }
  } catch (err) {
    await logEvent({
      kind: "error",
      level: "error",
      message: safeError(err),
    });
  } finally {
    ticking = false;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  if (!process.env.SIM_WALLET_DATABASE_URL) {
    throw new Error("SIM_WALLET_DATABASE_URL is required");
  }
  if (!process.env.SIM_WALLET_SECRET) {
    throw new Error("SIM_WALLET_SECRET is required");
  }

  await ensureState();
  await purgeIncoherentClips();
  const leftover = await openJob();
  if (!leftover) {
    const state = await app.workerState.findUnique({
      where: { id: "singleton" },
    });
    if (state?.moneyLocked) await releaseLock();
  }

  await logEvent({
    kind: "tick",
    message: `worker boot catalog=${BOUNTIES.length} keys=${escrowKeysReady()}`,
  });
  await heartbeat();
  await tick();

  setInterval(() => {
    heartbeat().catch((err) => console.error(safeError(err)));
  }, HEARTBEAT_MS);
  setInterval(() => {
    tick().catch((err) => console.error(safeError(err)));
  }, TICK_MS);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    disconnect().finally(() => process.exit(0));
  });
}

main().catch(async (err) => {
  console.error(safeError(err));
  await disconnect();
  process.exit(1);
});
