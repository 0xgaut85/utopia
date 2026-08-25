"use client";

import { useEffect, useState } from "react";
import { useAppAuth } from "@/components/app/auth-context";

const label = "text-xs text-app-faint";

export function PayoutFields() {
  const { profile, getToken, setProfile } = useAppAuth();
  const [solana, setSolana] = useState("");
  const [base, setBase] = useState("");
  const [robinhood, setRobinhood] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setSolana(profile.payoutSolanaUsdc ?? "");
    setBase(profile.payoutUsdcBase ?? "");
    setRobinhood(profile.payoutUsdgRobinhood ?? "");
  }, [profile]);

  async function save() {
    setError(null);
    setSaving(true);
    setSaved(false);

    const token = await getToken();
    if (!token) {
      setError("Sign in expired. Sign in again and retry.");
      setSaving(false);
      return;
    }

    const response = await fetch("/api/app/me", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payoutSolanaUsdc: solana,
        payoutUsdcBase: base,
        payoutUsdgRobinhood: robinhood,
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | { user?: typeof profile; error?: string }
      | null;

    setSaving(false);

    if (!response.ok || !data?.user) {
      setError(data?.error ?? "Could not save payout addresses.");
      return;
    }

    setProfile(data.user);
    setSaved(true);
  }

  return (
    <div className="border-t border-app-line px-4 py-3">
      <p className={label}>Payout addresses</p>
      <p className="mt-1 text-xs leading-relaxed text-app-faint">
        Add the wallets you want rewards sent to. A bounty cannot pay you until
        the matching network is filled.
      </p>

      <div className="mt-3 flex flex-col gap-2.5">
        <label className="flex flex-col gap-1">
          <span className={label}>USDC on Solana</span>
          <input
            value={solana}
            onChange={(event) => setSolana(event.target.value)}
            spellCheck={false}
            placeholder="Solana address"
            className="app-input font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>USDC on Base</span>
          <input
            value={base}
            onChange={(event) => setBase(event.target.value)}
            spellCheck={false}
            placeholder="0x..."
            className="app-input font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>USDG on Robinhood</span>
          <input
            value={robinhood}
            onChange={(event) => setRobinhood(event.target.value)}
            spellCheck={false}
            placeholder="0x..."
            className="app-input font-mono text-xs"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="app-btn app-btn-ghost px-3 py-2 text-xs"
        >
          {saving ? "Saving" : "Save addresses"}
        </button>
        {saved ? (
          <span className="text-xs text-app-text">Saved</span>
        ) : null}
        {error ? <span className="text-xs text-app-muted">{error}</span> : null}
      </div>
    </div>
  );
}
