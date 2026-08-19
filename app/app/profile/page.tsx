"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Wallet, Check } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useAppAuth } from "@/components/app/auth-context";
import { Avatar } from "@/components/app/avatar";
import { compressAvatar } from "@/lib/app/image";

const label = "font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function WalletRow() {
  const { user } = usePrivy();
  const { linkWallet } = useAppAuth();
  const wallet = user?.wallet?.address ?? null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/40 px-4 py-3 sm:px-6">
      <div className="min-w-0">
        <p className={label}>Wallet</p>
        <p className="mt-1 truncate font-mono text-sm text-ink">
          {wallet ? shortAddress(wallet) : "Not connected"}
        </p>
      </div>
      <button
        type="button"
        onClick={linkWallet}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 border border-line/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
      >
        <Wallet className="h-3.5 w-3.5" strokeWidth={1.6} />
        {wallet ? "Change" : "Connect"}
      </button>
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
        <p className="max-w-sm text-center text-sm leading-relaxed text-ink-soft">
          Sign in is not configured on this deployment yet. Set
          NEXT_PUBLIC_PRIVY_APP_ID to enable accounts.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/40">
          Loading...
        </span>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
          Create an account or sign in with email, Google, Apple or a wallet to
          manage your contributor profile.
        </p>
        <button
          type="button"
          onClick={login}
          className="cursor-pointer bg-ink px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-mist transition-opacity hover:opacity-80"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-line/70 bg-black/[0.035] px-4 py-1.5 sm:px-6">
        <span className={label}>Contributor profile:</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr]">
        <section className="border-b border-line/70 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-5 px-4 py-8 sm:px-6">
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
              <span className="absolute inset-0 flex items-center justify-center bg-ink/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Pencil className="h-4 w-4 text-mist" strokeWidth={1.6} />
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
                    className="w-40 border border-line/70 bg-transparent px-2 py-1 font-mono text-sm text-ink outline-none focus:border-ink/40"
                  />
                  <button
                    type="button"
                    onClick={saveUsername}
                    disabled={saving}
                    className="cursor-pointer bg-ink px-2.5 py-1.5 font-mono text-[10px] uppercase text-mist disabled:opacity-40"
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
                  <span className="truncate font-display text-2xl font-medium tracking-tight text-ink">
                    {profile?.username ?? "syncing..."}
                  </span>
                  <Pencil
                    className="h-3.5 w-3.5 shrink-0 text-ink/30 transition-colors group-hover:text-ink"
                    strokeWidth={1.6}
                  />
                </button>
              )}
              <p className="mt-1 truncate font-mono text-[11px] text-ink/45">
                {profile?.email ?? "no email linked"}
              </p>
              {saved ? (
                <p className="mt-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                  <Check className="h-3 w-3" strokeWidth={2} /> Saved
                </p>
              ) : null}
              {error ? (
                <p className="mt-1 font-mono text-[11px] text-ink">! {error}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-line/70 bg-ink text-mist">
            <div className="border-r border-mist/15 px-4 py-5 sm:px-6">
              <p className="font-mono text-3xl">
                {(profile?.points ?? 0).toLocaleString("en-US")}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-mist/50">
                Points
              </p>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <p className="font-mono text-3xl">{submissions.length}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-mist/50">
                Captures
              </p>
            </div>
          </div>

          <WalletRow />
        </section>

        <section>
          <div className="border-b border-line/70 bg-black/[0.035] px-4 py-1.5 sm:px-6">
            <span className={label}>My submissions:</span>
          </div>
          {submissions.length === 0 ? (
            <div className="px-4 py-12 text-center sm:px-6">
              <p className="text-sm leading-relaxed text-ink-soft">
                No captures yet. Pick a bounty in the marketplace and submit
                your first photo.
              </p>
            </div>
          ) : (
            <ul>
              {submissions.map((submission) => (
                <li
                  key={submission.id}
                  className="flex items-center justify-between gap-3 border-b border-line/40 px-4 py-3 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-ink">
                      {submission.task.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/40">
                      {new Date(submission.createdAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )}{" "}
                      / {submission.status}
                    </p>
                  </div>
                  <span className="shrink-0 bg-ink px-2 py-0.5 font-mono text-[11px] text-mist">
                    +{submission.task.reward} pts
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
