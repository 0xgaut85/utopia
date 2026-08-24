import { prisma } from "@/lib/app/db";

export type WorkerEventLevel = "info" | "warn" | "error";

export async function logWorkerEvent(input: {
  level?: WorkerEventLevel;
  kind: string;
  message: string;
  payload?: Record<string, unknown>;
}) {
  try {
    return await prisma.workerEvent.create({
      data: {
        level: input.level ?? "info",
        kind: input.kind,
        message: input.message,
        payload: input.payload ?? undefined,
      },
    });
  } catch (error) {
    console.error("[worker-log]", input.kind, input.message, error);
    return null;
  }
}