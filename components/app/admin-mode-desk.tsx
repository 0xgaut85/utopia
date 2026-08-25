"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DEPOSIT_NETWORKS } from "@/lib/app/payments";

type QueueItem = {
  id: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
  photo: string;
  createdAt: string;
  task: {
    id: string;
    title: string;
    priceUsdc: number;
    status: string;
    depositNetwork: string | null;
    expiresAt: string | null;
  };
  user: {
    username: string;
    payoutSolanaUsdc: string | null;
    payoutUsdcBase: string | null;
    payoutUsdgRobinhood: string | null;
  };
};

function networkLabel(id: string | null) {
  return DEPOSIT_NETWORKS.find((network) => network.id === id)?.network ?? "Unknown";
}

function AddressRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-app-faint">{label}</span>
      {value ? (
        <button
          type="button"
          onClick={copy}
          className="break-all text-left font-mono text-xs text-app-text underline-offset-4 hover:underline"
        >
          {copied ? "Copied" : value}
        </button>
      ) : (
        <span className="text-xs text-app-faint">Not set</span>
      )}
    </div>
  );
}

type WorkerEvent = {
  id: string;
  level: string;
  kind: string;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function levelClass(level: string) {
  if (level === "error") return "text-red-400";
  if (level === "warn") return "text-amber-400";
  return "text-app-muted";
}

export function AdminModeDesk() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [events, setEvents] = useState<WorkerEvent[]>([]);
  const [workerLive, setWorkerLive] = useState(false);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  async function loadQueue() {
    const response = await fetch("/api/app/adminmode/queue");
    if (response.status === 401) {
      setAuthed(false);
      setItems([]);
      return false;
    }
    if (!response.ok) {
      setError("Could not load the queue.");
      return false;
    }
    const data = (await response.json()) as { submissions: QueueItem[] };
    setItems(data.submissions);
    setAuthed(true);
    return true;
  }

  async function loadActivity(opts?: { before?: string }) {
    const query = opts?.before
      ? `?before=${encodeURIComponent(opts.before)}&limit=80`
      : "?limit=80";
    const response = await fetch(`/api/app/adminmode/activity${query}`);
    if (response.status === 401) {
      setAuthed(false);
      return;
    }
    if (!response.ok) return;
    const data = (await response.json()) as {
      live: boolean;
      latestAt: string | null;
      hasMore: boolean;
      events: WorkerEvent[];
    };
    setWorkerLive(data.live);
    setLatestAt(data.latestAt);
    setEvents((current) => {
      if (opts?.before) {
        const seen = new Set(current.map((event) => event.id));
        return [...current, ...data.events.filter((event) => !seen.has(event.id))];
      }
      const incoming = data.events;
      const seen = new Set(incoming.map((event) => event.id));
      const older = current.filter((event) => !seen.has(event.id));
      return [...incoming, ...older].slice(0, 300);
    });
    if (opts?.before) {
      setHasOlder(data.hasMore);
    } else {
      setHasOlder((was) => was || data.events.length >= 80);
    }
  }

  async function loadOlder() {
    const oldest = events[events.length - 1]?.createdAt;
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    await loadActivity({ before: oldest });
    setLoadingOlder(false);
  }

  useEffect(() => {
    void loadQueue()
      .then((ok) => {
        if (ok) return loadActivity();
      })
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    const id = window.setInterval(() => {
      void loadActivity();
    }, 2500);
    return () => window.clearInterval(id);
  }, [authed]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/app/adminmode/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Could not sign in.");
      return;
    }
    setPassword("");
    await loadQueue();
    await loadActivity();
  }

  async function accept(item: QueueItem) {
    setError(null);
    setAccepting(item.id);
    const response = await fetch("/api/app/adminmode/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: item.id }),
    });
    setAccepting(null);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Could not accept this submission.");
      return;
    }
    await loadQueue();
  }

  if (checking) {
    return <p className="text-sm text-app-faint">Checking session</p>;
  }

  if (!authed) {
    return (
      <form onSubmit={login} className="mx-auto w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-app-text">
          Admin
        </h1>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="app-input"
        />
        {error ? <p className="text-sm text-app-text">{error}</p> : null}
        <button type="submit" className="app-btn app-btn-primary w-full">
          Enter
        </button>
      </form>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-app-text">
            Payout desk
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            Accepting pays the reward from escrow to the winner&apos;s saved
            address. The 10% fee stays in escrow.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            void fetch("/api/app/adminmode/session", { method: "DELETE" }).then(
              () => {
                setAuthed(false);
                setItems([]);
                setEvents([]);
                setWorkerLive(false);
                setLatestAt(null);
              }
            )
          }
          className="app-btn app-btn-ghost text-xs"
        >
          Lock
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-app-text">{error}</p> : null}

      <section className="panel mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-app-line px-4 py-3">
          <div>
            <p className="text-sm font-medium text-app-text">Worker</p>
            <p className="mt-0.5 text-xs text-app-faint">
              {latestAt
                ? `Last event ${formatWhen(latestAt)}`
                : "No events yet"}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
              workerLive
                ? "border-emerald-500/40 text-emerald-400"
                : "border-app-line text-app-faint"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                workerLive ? "bg-emerald-400" : "bg-app-faint"
              }`}
            />
            {workerLive ? "Live" : "Idle"}
          </span>
        </div>
        {events.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-app-muted">
            Waiting for the worker. Heartbeats and money moves will show here.
          </p>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto">
            <ol className="divide-y divide-app-line">
              {events.map((event) => (
                <li key={event.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-app-faint">
                      {event.kind}
                    </span>
                    <time className="text-[11px] text-app-faint">
                      {formatWhen(event.createdAt)}
                    </time>
                  </div>
                  <p className={`mt-1 text-sm ${levelClass(event.level)}`}>
                    {event.message}
                  </p>
                  {event.payload && Object.keys(event.payload).length > 0 ? (
                    <pre className="mt-2 overflow-x-auto text-[11px] leading-relaxed text-app-faint">
                      {JSON.stringify(event.payload)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ol>
            {hasOlder ? (
              <div className="border-t border-app-line px-4 py-3">
                <button
                  type="button"
                  onClick={() => void loadOlder()}
                  disabled={loadingOlder}
                  className="app-btn app-btn-ghost w-full text-xs"
                >
                  {loadingOlder ? "Loading" : "Load earlier"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {items.length === 0 ? (
        <div className="panel mt-6 px-6 py-16 text-center">
          <p className="text-sm text-app-muted">No pending submissions.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="panel overflow-hidden">
              <video
                src={item.photo}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full bg-black object-contain"
              />
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-sm font-medium text-app-text">
                    {item.task.title}
                  </p>
                  <p className="mt-1 text-xs text-app-faint">
                    {item.user.username} · {item.task.priceUsdc} USDC ·{" "}
                    {networkLabel(item.task.depositNetwork)}
                  </p>
                </div>
                {item.note ? (
                  <p className="text-sm text-app-muted">{item.note}</p>
                ) : null}
                <div className="grid gap-2">
                  <AddressRow
                    label="USDC Solana"
                    value={item.user.payoutSolanaUsdc}
                  />
                  <AddressRow
                    label="USDC Base"
                    value={item.user.payoutUsdcBase}
                  />
                  <AddressRow
                    label="USDG Robinhood"
                    value={item.user.payoutUsdgRobinhood}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => accept(item)}
                  disabled={accepting !== null || item.task.status !== "open"}
                  className="app-btn app-btn-primary w-full"
                >
                  {accepting === item.id
                    ? "Accepting"
                    : "Accept and mark paid by me"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
