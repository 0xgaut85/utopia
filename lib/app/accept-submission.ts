import { prisma } from "@/lib/app/db";
import { taskPoints } from "@/lib/app/points";
import { EVM_DEPOSIT_ADDRESS, SOLANA_DEPOSIT_ADDRESS } from "@/lib/app/payments";
import {
  payoutAddressFor,
  payoutNetworkLabel,
  samePayoutAddress,
} from "@/lib/app/payout-addresses";

class AcceptError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function isEscrowAddress(network: string | null, address: string) {
  if (network === "usdc-solana") return address === SOLANA_DEPOSIT_ADDRESS;
  return address.toLowerCase() === EVM_DEPOSIT_ADDRESS.toLowerCase();
}

export async function acceptSubmission(taskId: string, submissionId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      status: true,
      priceUsdc: true,
      isSynthetic: true,
      creatorId: true,
      depositNetwork: true,
      depositTxHash: true,
      fundedAt: true,
      payoutTxHash: true,
      creator: {
        select: {
          payoutSolanaUsdc: true,
          payoutUsdcBase: true,
          payoutUsdgRobinhood: true,
        },
      },
    },
  });

  if (!task) return { error: "Task not found", status: 404 };
  if (task.status !== "open") {
    return { error: "This bounty is already settled.", status: 400 };
  }
  if (task.payoutTxHash) {
    return { error: "This bounty was already paid.", status: 400 };
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      taskId: true,
      userId: true,
      status: true,
      user: {
        select: {
          id: true,
          isSynthetic: true,
          privyId: true,
          payoutSolanaUsdc: true,
          payoutUsdcBase: true,
          payoutUsdgRobinhood: true,
        },
      },
    },
  });

  if (!submission || submission.taskId !== task.id) {
    return { error: "Submission not found on this task.", status: 404 };
  }
  if (submission.status !== "pending") {
    return { error: "This submission was already reviewed.", status: 400 };
  }

  const points = taskPoints(task.priceUsdc);
  const winner = submission.user;

  if (task.isSynthetic) {
    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submission.id },
        data: { status: "accepted" },
      }),
      prisma.submission.updateMany({
        where: { taskId: task.id, status: "pending", id: { not: submission.id } },
        data: { status: "rejected" },
      }),
      prisma.user.update({
        where: { id: winner.id },
        data: { points: { increment: points } },
      }),
      prisma.task.update({
        where: { id: task.id },
        data: { status: "closed" },
      }),
    ]);
    return {
      accepted: submission.id,
      pointsAwarded: points,
      userId: winner.id,
      payoutQueued: false,
    };
  }

  if (!task.depositTxHash || !task.fundedAt || !task.depositNetwork) {
    return {
      error: "This bounty has no verified deposit, so it cannot be paid.",
      status: 400,
    };
  }
  if (winner.isSynthetic || winner.privyId?.startsWith("sim:")) {
    return { error: "Synthetic accounts cannot be paid on a real bounty.", status: 400 };
  }
  if (winner.id === task.creatorId) {
    return { error: "You cannot accept your own clip.", status: 400 };
  }

  const address = payoutAddressFor(task.depositNetwork, winner);
  if (!address) {
    return {
      error: `This contributor has not set a payout address for ${payoutNetworkLabel(task.depositNetwork)}. Ask them to add it on their profile before you accept.`,
      status: 400,
    };
  }
  if (isEscrowAddress(task.depositNetwork, address)) {
    return { error: "That payout address is the Utopia escrow. It cannot be paid.", status: 400 };
  }

  const creatorAddress = payoutAddressFor(task.depositNetwork, task.creator);
  if (
    creatorAddress &&
    samePayoutAddress(task.depositNetwork, creatorAddress, address)
  ) {
    return {
      error: "Winner payout address matches the bounty creator. Choose another clip.",
      status: 400,
    };
  }

  const amount = Math.round(task.priceUsdc * 100) / 100;
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
    return { error: "Bounty reward is outside the payable range.", status: 400 };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const closed = await tx.task.updateMany({
        where: {
          id: task.id,
          status: "open",
          payoutTxHash: null,
        },
        data: {
          status: "closed",
          payoutAddress: address,
        },
      });
      if (closed.count !== 1) {
        throw new AcceptError("This bounty is already settled.", 400);
      }

      const claimed = await tx.submission.updateMany({
        where: { id: submission.id, taskId: task.id, status: "pending" },
        data: { status: "accepted" },
      });
      if (claimed.count !== 1) {
        throw new AcceptError("This submission was already reviewed.", 400);
      }

      await tx.submission.updateMany({
        where: { taskId: task.id, status: "pending", id: { not: submission.id } },
        data: { status: "rejected" },
      });
      await tx.user.update({
        where: { id: winner.id },
        data: { points: { increment: points } },
      });

      const existingJob = await tx.workerJob.findFirst({
        where: {
          kind: "real.payout",
          taskId: task.id,
        },
        select: { id: true },
      });
      if (existingJob) {
        throw new AcceptError("A payout is already queued for this bounty.", 400);
      }

      await tx.workerJob.create({
        data: {
          kind: "real.payout",
          status: "open",
          taskId: task.id,
          userId: winner.id,
          chain: task.depositNetwork,
          hashes: { amount, toAddress: address },
        },
      });
    });
  } catch (err) {
    if (err instanceof AcceptError) {
      return { error: err.message, status: err.status };
    }
    throw err;
  }

  return {
    accepted: submission.id,
    pointsAwarded: points,
    userId: winner.id,
    payoutQueued: true,
  };
}
