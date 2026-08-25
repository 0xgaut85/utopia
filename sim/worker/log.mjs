import { app } from "./db.mjs";

export function safeError(err) {
  return String(err?.message || err)
    .replace(/0x[a-fA-F0-9]{64}/g, "0x…")
    .slice(0, 400);
}

export async function logEvent({
  level = "info",
  kind,
  message,
  payload = null,
}) {
  const line = `[${kind}] ${message}`;
  if (level === "error") console.error(line);
  else console.log(line);
  try {
    await app.workerEvent.create({
      data: { level, kind, message: message.slice(0, 1000), payload },
    });
  } catch (err) {
    console.error(`[error] failed to persist WorkerEvent: ${safeError(err)}`);
  }
}
