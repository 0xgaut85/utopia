import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/app/db";

export type WorkerEventLevel = "info" | "warn" | "error";

export async function logWorkerEvent(input: {
  level?: WorkerEventLevel;
  kind: string;
  message: string;
  payload?: Prisma.InputJsonValue;
}) {
  try {
    return await prisma.workerEvent.create({
      data: {
        level: input.level ?? "info",
        kind: input.kind,
        message: input.message,
        payload: input.payload,
      },
    });
  } catch (error) {
    console.error("[worker-log]", input.kind, input.message, error);
    return null;
  }
}
