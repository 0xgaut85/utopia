"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useAppAuth } from "@/components/app/auth-context";
import { VideoRecorder, type RecordedClip } from "@/components/app/video-recorder";
import { submitPoints, taskPoints } from "@/lib/app/points";
import { clipNearTask } from "@/lib/app/geo";
import { MIN_CLIP_SECONDS } from "@/lib/app/video-duration";

type SubmitPanelProps = {
  taskId: string;
  priceUsdc: number;
  open: boolean;
  requiresLocation: boolean;
  taskLat: number | null;
  taskLng: number | null;
  radiusM: number | null;
};

type Phase = "idle" | "submitting" | "done";

export function SubmitPanel({
  taskId,
  priceUsdc,
  open,
  requiresLocation,
  taskLat,
  taskLng,
  radiusM,
}: SubmitPanelProps) {
  const winPts = taskPoints(priceUsdc).toLocaleString("en-US");
  const uploadPts = submitPoints(priceUsdc).toLocaleString("en-US");
  const { configured, ready, authenticated, login, getToken, refreshProfile } =
    useAppAuth();
  const [clip, setClip] = useState<RecordedClip | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [awarded, setAwarded] = useState<number | null>(null);

  async function submit() {
    if (!clip) {
      setError("Record a clip first.");
      return;
    }
    if (clip.durationSec < MIN_CLIP_SECONDS) {
      setError(`Clip must be at least ${MIN_CLIP_SECONDS} seconds.`);
      return;
    }
    if (
      !clipNearTask(
        { lat: taskLat, lng: taskLng, radiusM },
        { lat: clip.lat, lng: clip.lng }
      )
    ) {
      setError("You need to be at the bounty location to submit this clip.");
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
        durationSec: clip.durationSec,
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

    const data = (await response.json().catch(() => null)) as {
      pointsAwarded?: number;
    } | null;
    setAwarded(data?.pointsAwarded ?? submitPoints(priceUsdc));
    setPhase("done");
    void refreshProfile();
  }

  return (
    <aside className="panel flex flex-col">
      <div className="border-b border-app-line px-4 py-3">
        <span className="text-sm font-medium text-app-text">Record a clip</span>
      </div>

      {!open ? (
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <p className="max-w-xs text-center text-sm leading-relaxed text-app-muted">
            This bounty is closed. Browse the open bounties instead.
          </p>
        </div>
      ) : phase === "done" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-app-text text-app-bg">
            <Check className="h-5 w-5" strokeWidth={2} />
          </span>
          <p className="text-lg font-medium text-app-text">Clip submitted</p>
          <p className="max-w-xs text-sm leading-relaxed text-app-muted">
            {awarded
              ? `${awarded.toLocaleString("en-US")} points are on your account.`
              : `You earned ${uploadPts} points for the upload.`}{" "}
            If the buyer accepts this clip you get another {winPts}.
          </p>
        </div>
      ) : !configured ? (
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <p className="max-w-xs text-center text-sm leading-relaxed text-app-muted">
            Sign in is not configured on this deployment yet, so submissions
            are paused.
          </p>
        </div>
      ) : !authenticated ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <p className="max-w-xs text-sm leading-relaxed text-app-muted">
            Sign in to record a clip. A valid upload earns {uploadPts} points.
            The accepted clip earns {winPts}.
          </p>
          <button
            type="button"
            onClick={login}
            disabled={!ready}
            className="app-btn app-btn-primary"
          >
            Sign in
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 p-4">
          <p className="text-sm leading-relaxed text-app-muted">
            Record at least {MIN_CLIP_SECONDS}s from your camera
            {requiresLocation
              ? " at the bounty location"
              : " (kitchen and in-house clips can be filmed at home)"}
            . A verified Utopia overlay with your GPS, location and UTC time is
            burned into every frame. A valid upload earns {uploadPts} points
            even if you are not picked. The winner earns {winPts}.
          </p>

          <VideoRecorder onChange={setClip} />

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Add a note for the buyer (optional)"
            className="app-input resize-none"
          />

          {error ? <p className="text-sm text-app-text">{error}</p> : null}

          <button
            type="button"
            onClick={submit}
            disabled={phase === "submitting" || !clip}
            className="app-btn app-btn-primary w-full"
          >
            {phase === "submitting"
              ? "Submitting"
              : `Submit for review, ${uploadPts} pts`}
          </button>
        </div>
      )}
    </aside>
  );
}
