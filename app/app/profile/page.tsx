"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, Wallet, Check, ShieldCheck } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { cn } from "@/lib/utils";
import { useAppAuth } from "@/components/app/auth-context";
import { Avatar } from "@/components/app/avatar";
import { compressAvatar } from "@/lib/app/image";
import { taskPoints } from "@/lib/app/points";

const label = "text-xs text-app-faint";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function WalletRow() {
  const { user } = usePrivy();
  const { linkWallet } = useAppAuth();
  const wallet = user?.wallet?.address ?? null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-app-line px-4 py-3">
      <div className="min-w-0">
        <p className={label}>Wallet</p>
        <p className="mt-1 truncate font-mono text-sm text-app-text">
          {wallet ? shortAddress(wallet) : "Not connected"}
        </p>
      </div>
      <button
        type="button"
        onClick={linkWallet}
        className="app-btn app-btn-ghost shrink-0 px-3 py-2 text-xs"
      >
        <Wallet className="h-3.5 w-3.5" strokeWidth={1.8} />
        {wallet ? "Change" : "Connect"}
      </button>
    </div>
  );
}

function TeamAccessRow() {
  const { profile, getToken, setProfile, refreshProfile } = useAppAuth();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (profile?.isAdmin) {
    return (
      <div className="flex items-center gap-2 border-t border-app-line px-4 py-3">
        <ShieldCheck className="h-4 w-4 text-app-text" strokeWidth={1.8} />
        <span className="text-sm text-app-text">
          Team reviewer access active
        </span>
      </div>
    );
  }

  async function claim() {
    if (!code.trim()) return;
    setError(null);
    setChecking(true);

    const token = await getToken();
    const response = token
      ? await fetch("/api/app/admin/claim", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: code.trim() }),
        })
      : null;

    setChecking(false);

    if (!response?.ok) {
      setError("Invalid team code.");
      return;
    }

    const data = (await response.json()) as {
      user: NonNullable<typeof profile>;
    };
    setProfile(data.user);
    void refreshProfile();
  }

  return (
    <div className="border-t border-app-line px-4 py-3">
      <p className={label}>Team access</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          type="password"
          placeholder="Team code"
          className="app-input w-40"
        />
        <button
          type="button"
          onClick={claim}
          disabled={checking}
          className="app-btn app-btn-ghost px-3 py-2 text-xs"
        >
          {checking ? "Checking" : "Unlock"}
        </button>
        {error ? (
          <span className="text-xs text-app-muted">{error}</span>
        ) : null}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const {
    configured,
    ready,
    authenticated,
    profile,
    submissions,
    myTasks,
    login,
    getToken,
    refreshProfile,
    setProfile,
  } = useAppAuth();

  const avatarInput = useRef<HTMLInputElement>(null);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated) void refreshProfile();
  }, [authenticated, refreshProfile]);

  // Adopt the loaded username as the edit draft, adjusting during render.
  if (profile && profile.username !== draftFor) {
    setDraftFor(profile.username);
    if (!editingUsername) setUsernameDraft(profile.username);
  }

  async function patchProfile(body: { username?: string; avatar?: string }) {
    setError(null);
    setSaving(true);
    setSaved(false);

    const token = await getToken();
    if (!token) {
      setError("Sign in expired. Sign in again and retry.");
      setSaving(false);
      return false;
    }

    const response = await fetch("/api/app/me", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => null)) as
      | { user?: never; error: string }
      | { user: NonNullable<typeof profile>; error?: never }
      | null;

    setSaving(false);

    if (!response.ok || !data?.user) {
      setError(data?.error ?? "Could not save. Try again.");
      return false;
    }

    setProfile(data.user);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
    return true;
  }

  async function handleAvatarFile(file: File | undefined) {
    if (!file) return;
    try {
      const avatar = await compressAvatar(file);
      await patchProfile({ avatar });
    } catch {
      setError("Could not read that image. Try another file.");
    }
  }

  async function saveUsername() {
    const ok = await patchProfile({ username: usernameDraft });
    if (ok) setEditingUsername(false);
  }

  if (!configured) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <p className="max-w-sm text-center text-sm leading-relaxed text-app-muted">
          Sign in is not configured on this deployment yet. Set
          NEXT_PUBLIC_PRIVY_APP_ID to enable accounts.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="text-sm text-app-faint">Loading</span>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-app-muted">
          Create an account or sign in with email, Google, Apple or a wallet to
          manage your contributor profile.
        </p>
        <button
          type="button"
          onClick={login}
          className="app-btn app-btn-primary px-6"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-app-text sm:text-3xl">
        Profile
      </h1>

      <div className="mt-6 grid gap-3 sm:gap-4 lg:grid-cols-[1fr_1.3fr]">
        <section className="panel self-start">
          <div className="flex items-center gap-4 p-5">
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleAvatarFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              className="group relative cursor-pointer"
              aria-label="Change profile picture"
            >
              <Avatar
                username={profile?.username ?? "?"}
                avatarUrl={profile?.avatarUrl}
                size="lg"
              />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Pencil className="h-4 w-4 text-white" strokeWidth={1.8} />
              </span>
            </button>

            <div className="min-w-0">
              {editingUsername ? (
                <div className="flex items-center gap-2">
                  <input
                    value={usernameDraft}
                    onChange={(event) =>
                      setUsernameDraft(event.target.value.toLowerCase())
                    }
                    maxLength={20}
                    autoFocus
                    className="app-input w-40"
                  />
                  <button
                    type="button"
                    onClick={saveUsername}
                    disabled={saving}
                    className="app-btn app-btn-primary px-3 py-2 text-xs"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingUsername(true)}
                  className="group flex cursor-pointer items-center gap-2"
                >
                  <span className="truncate text-xl font-medium tracking-tight text-app-text">
                    {profile?.username ?? "syncing"}
                  </span>
                  <Pencil
                    className="h-3.5 w-3.5 shrink-0 text-app-faint transition-colors group-hover:text-app-text"
                    strokeWidth={1.8}
                  />
                </button>
              )}
              <p className="mt-1 truncate text-sm text-app-faint">
                {profile?.email ?? "No email linked"}
              </p>
              {saved ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-app-text">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} /> Saved
                </p>
              ) : null}
              {error ? (
                <p className="mt-1 text-xs text-app-text">{error}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-app-line border-t border-app-line">
            <div className="px-5 py-4">
              <p className="font-mono text-3xl tabular-nums text-app-text">
                {(profile?.points ?? 0).toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-xs text-app-faint">Points</p>
            </div>
            <div className="px-5 py-4">
              <p className="font-mono text-3xl tabular-nums text-app-text">
                {submissions.length}
              </p>
              <p className="mt-1 text-xs text-app-faint">Clips</p>
            </div>
          </div>

          <WalletRow />
          <TeamAccessRow />
        </section>

        <div className="flex flex-col gap-3 sm:gap-4">
          <section className="panel overflow-hidden">
            <div className="border-b border-app-line px-4 py-3">
              <span className="text-sm font-medium text-app-text">
                My clips
              </span>
            </div>
            {submissions.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm leading-relaxed text-app-muted">
                  No clips yet. Pick a bounty and record your first one.
                </p>
              </div>
            ) : (
              <ul>
                {submissions.map((submission) => (
                  <li
                    key={submission.id}
                    className="flex items-center justify-between gap-3 border-b border-app-line/60 px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-app-text">
                        {submission.task.title}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-app-faint">
                        {new Date(submission.createdAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                        , {submission.status}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-1 font-mono text-xs tabular-nums",
                        submission.status === "accepted"
                          ? "bg-app-text text-app-bg"
                          : "bg-app-bg text-app-faint"
                      )}
                    >
                      {taskPoints(submission.task.priceUsdc).toLocaleString(
                        "en-US"
                      )}{" "}
                      pts
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b border-app-line px-4 py-3">
              <span className="text-sm font-medium text-app-text">
                My bounties
              </span>
            </div>
            {myTasks.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm leading-relaxed text-app-muted">
                  No bounties posted.{" "}
                  <Link
                    href="/app/tasks/new"
                    className="text-app-text underline underline-offset-4"
                  >
                    Post one
                  </Link>{" "}
                  to buy clips from the network.
                </p>
              </div>
            ) : (
              <ul>
                {myTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/app/tasks/${task.id}`}
                      className="flex items-center justify-between gap-3 border-b border-app-line/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-app-surface-hi"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-app-text">
                          {task.title}
                        </p>
                        <p className="mt-0.5 text-xs text-app-faint">
                          {task.status === "open"
                            ? `${task.pendingCount} pending review`
                            : "Settled"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-app-bg px-2 py-1 font-mono text-xs tabular-nums text-app-text">
                        {task.priceUsdc.toLocaleString("en-US")} USDC
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
