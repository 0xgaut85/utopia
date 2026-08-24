export function isExpired(expiresAt: Date | string | null | undefined) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export function isBountyOpen(task: {
  status: string;
  maxSubmissions: number;
  submissionCount?: number;
  expiresAt?: Date | string | null;
}) {
  if (task.status !== "open") return false;
  if (
    task.submissionCount !== undefined &&
    task.submissionCount >= task.maxSubmissions
  ) {
    return false;
  }
  if (isExpired(task.expiresAt)) return false;
  return true;
}

export function parseDeadline(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = Date.now();
  const min = now + 60 * 60 * 1000;
  const max = now + 365 * 24 * 60 * 60 * 1000;
  if (date.getTime() < min || date.getTime() > max) return null;
  return date;
}

export function remainingLabel(expiresAt: Date | string | null | undefined) {
  if (!expiresAt) return "No deadline";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes - days * 60 * 24) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${Math.max(mins, 1)}m left`;
}
