"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useAppAuth } from "@/components/app/auth-context";
import { VideoRecorder, type RecordedClip } from "@/components/app/video-recorder";
import { taskPoints } from "@/lib/app/points";

type SubmitPanelProps = {
  taskId: string;
  priceUsdc: number;
  open: boolean;
  requiresLocation: boolean;
};

type Phase = "idle" | "submitting" | "done";

export function SubmitPanel({ taskId, priceUsdc, open }: SubmitPanelProps) {
  const points = taskPoints(priceUsdc).toLocaleString("en-US");
  const { configured, ready, authenticated, login, getToken, refreshProfile } =
    useAppAuth();
  const [clip, setClip] = useState<RecordedClip | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!clip) {
      setError("Record a clip first.");
      return;
    }
    setError(null);
    setPhase("submitting");

    const token = await getToken();
    if (!token) {
      setError("Sign in expired. Sign in again and retry.");
      setPhase("idle");
      return;
    }

    const response = await fetch(`/api/app/tasks/${taskId}/submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        photo: clip.dataUrl,
        note: note || undefined,
        lat: clip.lat,
        lng: clip.lng,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Submission failed. Try again.");
      setPhase("idle");
      return;
    }

    setPhase("done");
    void refreshProfile();
  }

  const label = "text-[10px] uppercase tracking-[0.16em] text-ink/50";

  return (
    <aside className="flex flex-col bg-white">
      <div className="bar px-4 py-2 sm:px-6">
        <span className={label}>Record a clip:</span>
      </div>

      {!open ? (
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <p className="max-w-xs text-center text-sm leading-relaxed text-ink-soft">
            This bounty is closed. Browse the marketplace for open tasks.
          </p>
        </div>
      ) : phase === "done" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center bg-ink text-mist">
            <Check className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <p className="text-2xl font-medium tracking-tight text-ink">
            Clip submitted
          </p>
          <p className="max-w-xs text-sm text-ink-soft">
            The buyer is reviewing submissions. You earn +{points} points if
            yours is accepted.
          </p>
        </div>
      ) : !configured ? (
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <p className="max-w-xs text-center text-sm leading-relaxed text-ink-soft">
            Sign in is not configured on this deployment yet, so submissions
            are paused.
          </p>
        </div>
      ) : !authenticated ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
            Sign in to record a clip. Earn +{points} points if the buyer accepts
            it.
          </p>
          <button
            type="button"
            onClick={login}
            disabled={!ready}
            className="glass-btn glass-btn-dark cursor-pointer px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em]"
          >
            Sign in
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Record a live clip from your camera. A verified Utopia overlay
            with your GPS, location and UTC time is burned into every frame.
          </p>

          <VideoRecorder onChange={setClip} />

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Optional note about the clip"
            className="w-full resize-none border border-line/70 bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-ink/40"
          />

          {error ? (
            <p className="font-mono text-[11px] text-ink">! {error}</p>
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={phase === "submitting" || !clip}
            className="glass-btn glass-btn-dark cursor-pointer px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {phase === "submitting"
              ? "Submitting..."
              : `Submit for review / +${points} pts`}
          </button>
        </div>
      )}
    </aside>
  );
}
