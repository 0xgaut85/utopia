"use client";

import { useRef, useState } from "react";
import { Camera, LocateFixed, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppAuth } from "@/components/app/auth-context";
import { compressImage } from "@/lib/app/image";

type SubmitPanelProps = {
  taskId: string;
  reward: number;
  open: boolean;
  requiresLocation: boolean;
};

type Phase = "idle" | "submitting" | "done";

export function SubmitPanel({
  taskId,
  reward,
  open,
  requiresLocation,
}: SubmitPanelProps) {
  const { configured, ready, authenticated, login, getToken, refreshProfile } =
    useAppAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locating, setLocating] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setPhoto(await compressImage(file, 1600));
    } catch {
      setError("Could not read that image. Try another file.");
    }
  }

  function captureLocation() {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setError("Could not read your location. Check browser permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit() {
    if (!photo) {
      setError("Attach a photo first.");
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
        photo,
        note: note || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
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

  const label = "font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45";

  return (
    <aside className="flex flex-col">
      <div className="border-b border-line/70 bg-black/[0.035] px-4 py-1.5">
        <span className={label}>Submit a capture:</span>
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
          <p className="font-display text-2xl font-medium tracking-tight text-ink">
            Capture accepted
          </p>
          <p className="font-mono text-sm text-ink-soft">
            +{reward} points added to your account.
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
            Sign in to submit a capture and earn +{reward} points.
          </p>
          <button
            type="button"
            onClick={login}
            disabled={!ready}
            className="cursor-pointer bg-ink px-5 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-mist transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            Sign in
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className={cn(
              "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-ink/25 transition-colors hover:border-ink/50",
              photo && "border-solid border-line/70 p-0"
            )}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of a data URL
              <img
                src={photo}
                alt="Capture preview"
                className="max-h-72 w-full object-contain"
              />
            ) : (
              <>
                <Camera className="h-5 w-5 text-ink/40" strokeWidth={1.4} />
                <span className={label}>Attach photo</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={captureLocation}
              disabled={locating}
              className="flex cursor-pointer items-center gap-1.5 border border-line/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-40"
            >
              <LocateFixed className="h-3.5 w-3.5" strokeWidth={1.6} />
              {locating ? "Locating..." : "Attach GPS"}
            </button>
            <span className="font-mono text-[10px] text-ink/45">
              {coords
                ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                : requiresLocation
                  ? "GPS recommended"
                  : "GPS optional"}
            </span>
          </div>

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Optional note about the capture"
            className="w-full resize-none border border-line/70 bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-ink/40"
          />

          {error ? (
            <p className="font-mono text-[11px] text-ink">! {error}</p>
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={phase === "submitting"}
            className="cursor-pointer bg-ink px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-mist transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {phase === "submitting" ? "Submitting..." : `Submit for +${reward} pts`}
          </button>
        </div>
      )}
    </aside>
  );
}
