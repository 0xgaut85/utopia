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

export function AdminModeDesk() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<QueueItem[]>([]);
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

  useEffect(() => {
    void loadQueue().finally(() => setChecking(false));
  }, []);

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
            Accept a clip, then send the reward yourself to the winner&apos;s
            address.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            void fetch("/api/app/adminmode/session", { method: "DELETE" }).then(
              () => {
                setAuthed(false);
                setItems([]);
              }
            )
          }
          className="app-btn app-btn-ghost text-xs"
        >
          Lock
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-app-text">{error}</p> : null}

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
