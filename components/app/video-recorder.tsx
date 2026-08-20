"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Video,
  Square,
  RotateCcw,
  SwitchCamera,
  Loader2,
} from "lucide-react";

export type RecordedClip = {
  dataUrl: string;
  lat: number;
  lng: number;
};

type Coords = { lat: number; lng: number };
type Place = { country?: string; region?: string; city?: string };
type Phase = "init" | "ready" | "recording" | "recorded";

const MAX_SECONDS = 20;
const MAX_BYTES = 80 * 1024 * 1024;
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// The landing wordmark font (Instrument Serif italic) is loaded by next/font
// under a hashed family name exposed through this CSS variable. Resolved once,
// lazily, so the canvas overlay can use the exact same face.
let accentFontFamily: string | null = null;
function accentFamily() {
  if (accentFontFamily === null && typeof window !== "undefined") {
    accentFontFamily =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-instrument-serif")
        .trim() || "Georgia, serif";
  }
  return accentFontFamily ?? "Georgia, serif";
}

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

function placeLine(place: Place | null) {
  if (!place) return "";
  return [place.country, place.region, place.city].filter(Boolean).join(" / ");
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false;
}

// Draws the burned-in verification overlay: brand mark, live UTC time, GPS and
// resolved place. Kept at module scope so the frame loop has no extra deps.
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: { coords: Coords | null; place: Place | null; logo: HTMLCanvasElement | null }
) {
  const fs = Math.max(13, Math.round(w * 0.023));
  const pad = Math.round(fs * 1.1);
  const rowH = Math.round(fs * 1.4);
  const barH = pad * 2 + rowH * 3;
  const top = h - barH;

  ctx.save();
  ctx.fillStyle = "rgba(12,12,14,0.55)";
  ctx.fillRect(0, top, w, barH);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(0, top, w, Math.max(1, Math.round(h * 0.001)));

  const textTop = top + pad;
  const { logo } = data;
  const logoSize = Math.round(fs * 2.4);
  let brandX = pad;
  if (logo && logo.width > 0) {
    ctx.drawImage(logo, pad, textTop, logoSize, logoSize);
    brandX = pad + logoSize + Math.round(fs * 0.6);
  }

  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = `italic 400 ${Math.round(fs * 1.5)}px ${accentFamily()}`;
  ctx.fillText("Utopia", brandX, textTop);
  ctx.font = `${Math.round(fs * 0.72)}px ${MONO}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("VERIFIED CAPTURE", brandX, textTop + Math.round(fs * 1.6));

  const iso = new Date().toISOString();
  const timeLine = `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
  const coordLine = data.coords
    ? `${data.coords.lat.toFixed(5)}, ${data.coords.lng.toFixed(5)}`
    : "GPS acquiring...";
  const geo = placeLine(data.place) || "Locating region...";

  ctx.textAlign = "right";
  const rx = w - pad;
  ctx.font = `${fs}px ${MONO}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(timeLine, rx, textTop);
  ctx.fillText(coordLine, rx, textTop + rowH);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(geo, rx, textTop + rowH * 2);
  ctx.restore();
}

/**
 * Live in-app recorder. Captures from the device camera, burns a Utopia
 * verification overlay (logo, UTC time, GPS and place) into every frame via a
 * canvas pipeline, then hands the recorded clip back as a data URL. There is no
 * file input by design, so saved footage cannot be submitted.
 */
export function VideoRecorder({
  onChange,
}: {
  onChange: (clip: RecordedClip | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const logoRef = useRef<HTMLCanvasElement | null>(null);
  const coordsRef = useRef<Coords | null>(null);
  const placeRef = useRef<Place | null>(null);
  const lastGeocodeRef = useRef<number>(0);
  const recordedUrlRef = useRef<string | null>(null);

  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [phase, setPhase] = useState<Phase>("init");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false
  );

  // Mirror the latest GPS and place into refs so the frame loop can read them
  // without being recreated.
  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);
  useEffect(() => {
    placeRef.current = place;
  }, [place]);

  // Preload the logo mark once for the burned-in overlay, recolored to white
  // via an offscreen canvas. Also warm up the wordmark font so the overlay
  // never renders with a fallback face.
  useEffect(() => {
    const image = new window.Image();
    image.src = "/logo-utopia.png";
    image.onload = () => {
      const offscreen = document.createElement("canvas");
      offscreen.width = image.naturalWidth;
      offscreen.height = image.naturalHeight;
      const offscreenCtx = offscreen.getContext("2d");
      if (!offscreenCtx) return;
      offscreenCtx.drawImage(image, 0, 0);
      offscreenCtx.globalCompositeOperation = "source-in";
      offscreenCtx.fillStyle = "#ffffff";
      offscreenCtx.fillRect(0, 0, offscreen.width, offscreen.height);
      logoRef.current = offscreen;
    };
    void document.fonts?.load(`italic 400 24px ${accentFamily()}`);
  }, []);

  // Continuously composite the camera frame plus overlay onto the canvas. This
  // canvas is what gets recorded, so the overlay is baked into the file.
  useEffect(() => {
    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw && vh) {
          if (canvas.width !== vw || canvas.height !== vh) {
            canvas.width = vw;
            canvas.height = vh;
          }
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, vw, vh);
            drawOverlay(ctx, vw, vh, {
              coords: coordsRef.current,
              place: placeRef.current,
              logo: logoRef.current,
            });
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  // Acquire the camera whenever the facing mode changes.
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        setCameraError("This browser does not support camera capture.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        setCameraError(null);
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setPhase((current) => (current === "init" ? "ready" : current));
      } catch {
        if (!cancelled) {
          setCameraError(
            "Camera access is required. Allow the camera and reload to record."
          );
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
    };
  }, [facingMode]);

  // Live GPS. Recording is blocked until we have a fix because the overlay
  // depends on it.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
      },
      () => {
        setLocationError(
          "Location access is required for the verified overlay. Enable it and reload."
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Reverse geocode the fix to country / region / city, throttled.
  useEffect(() => {
    if (!coords) return;
    const now = Date.now();
    if (place && now - lastGeocodeRef.current < 15000) return;
    lastGeocodeRef.current = now;
    let active = true;

    (async () => {
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lng}&localityLanguage=en`
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          countryName?: string;
          principalSubdivision?: string;
          city?: string;
          locality?: string;
        };
        if (!active) return;
        setPlace({
          country: data.countryName || undefined,
          region: data.principalSubdivision || undefined,
          city: data.city || data.locality || undefined,
        });
      } catch {
        // Fall back to coordinates only.
      }
    })();

    return () => {
      active = false;
    };
  }, [coords, place]);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    stopTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [stopTimer]);

  function startRecording() {
    const canvas = canvasRef.current;
    const camera = streamRef.current;
    if (!canvas || !camera) return;
    if (!coords) {
      setError("Wait for a GPS fix before recording.");
      return;
    }
    setError(null);

    const canvasStream = canvas.captureStream(30);
    camera.getAudioTracks().forEach((track) => canvasStream.addTrack(track));

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(
        canvasStream,
        mimeType ? { mimeType } : undefined
      );
    } catch {
      setError("Recording is not supported in this browser.");
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "video/webm",
      });
      if (blob.size > MAX_BYTES) {
        setError("That clip is too large. Record a shorter one.");
        setPhase("ready");
        return;
      }
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
      const url = URL.createObjectURL(blob);
      recordedUrlRef.current = url;
      setRecordedUrl(url);
      const reader = new FileReader();
      reader.onload = () => {
        const fix = coordsRef.current;
        if (typeof reader.result === "string" && fix) {
          onChange({ dataUrl: reader.result, lat: fix.lat, lng: fix.lng });
          setPhase("recorded");
        } else {
          setError("Could not process the clip. Try again.");
          setPhase("ready");
        }
      };
      reader.readAsDataURL(blob);
    };

    recorderRef.current = recorder;
    recorder.start();
    setPhase("recording");
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      setElapsed((value) => {
        const next = value + 1;
        if (next >= MAX_SECONDS) stopRecording();
        return next;
      });
    }, 1000);
  }

  function reRecord() {
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
      recordedUrlRef.current = null;
    }
    setRecordedUrl(null);
    setElapsed(0);
    onChange(null);
    setPhase("ready");
  }

  // Tear everything down on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
    };
  }, []);

  const label = "font-mono text-[10px] uppercase tracking-[0.1em] text-ink/55";

  if (cameraError) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 border border-dashed border-ink/25 px-6 py-10 text-center">
        <Video className="h-5 w-5 text-ink/40" strokeWidth={1.4} />
        <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
          {cameraError}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden border border-line/70 bg-ink">
        <video ref={videoRef} muted playsInline className="hidden" />

        <canvas
          ref={canvasRef}
          className={recordedUrl ? "hidden" : "block w-full"}
        />

        {recordedUrl ? (
          <video
            src={recordedUrl}
            controls
            playsInline
            className="block w-full"
          />
        ) : null}

        {phase === "init" ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/70 text-mist">
            <Loader2
              className={reducedMotion ? "h-4 w-4" : "h-4 w-4 animate-spin"}
              strokeWidth={1.6}
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
              Starting camera...
            </span>
          </div>
        ) : null}

        {phase === "recording" ? (
          <div className="absolute left-3 top-3 flex items-center gap-2 bg-black/55 px-2.5 py-1 backdrop-blur-sm">
            <span
              className={
                reducedMotion
                  ? "h-2 w-2 rounded-full bg-red-500"
                  : "h-2 w-2 animate-pulse rounded-full bg-red-500"
              }
            />
            <span className="font-mono text-[11px] tabular-nums text-mist">
              {String(elapsed).padStart(2, "0")} / {MAX_SECONDS}s
            </span>
          </div>
        ) : null}

        {phase !== "recorded" && facingMode ? (
          <button
            type="button"
            onClick={() =>
              setFacingMode((mode) =>
                mode === "environment" ? "user" : "environment"
              )
            }
            className="absolute right-3 top-3 flex items-center gap-1.5 bg-black/55 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-mist backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <SwitchCamera className="h-3.5 w-3.5" strokeWidth={1.6} />
            Flip
          </button>
        ) : null}
      </div>

      <p className="text-[11px] leading-relaxed text-ink-soft">
        After submission, your clip is processed and reconstructed into a 3D
        model.
      </p>

      {locationError ? (
        <p className={`${label} normal-case text-ink`}>! {locationError}</p>
      ) : null}
      {error ? (
        <p className="font-mono text-[11px] text-ink">! {error}</p>
      ) : null}

      {phase === "recorded" ? (
        <button
          type="button"
          onClick={reRecord}
          className="glass-btn flex cursor-pointer items-center justify-center gap-2 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em]"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.6} />
          Re-record
        </button>
      ) : phase === "recording" ? (
        <button
          type="button"
          onClick={stopRecording}
          className="glass-btn glass-btn-dark flex cursor-pointer items-center justify-center gap-2 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em]"
        >
          <Square className="h-3.5 w-3.5" strokeWidth={1.6} />
          Stop recording
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          disabled={phase !== "ready" || !coords || locationError !== null}
          className="glass-btn glass-btn-dark flex cursor-pointer items-center justify-center gap-2 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Video className="h-3.5 w-3.5" strokeWidth={1.6} />
          {coords ? "Record clip" : "Waiting for GPS..."}
        </button>
      )}
    </div>
  );
}
