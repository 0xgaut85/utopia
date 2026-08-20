"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppAuth } from "@/components/app/auth-context";
import { taskPoints } from "@/lib/app/points";

type ReviewSubmission = {
  id: string;
  photo: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  createdAt: string;
  user: { username: string; avatarUrl: string | null };
};

const label = "font-mono text-[10px] uppercase tracking-[0.1em] text-ink/55";

/**
 * Buyer review area. Renders only for the bounty's creator or a team admin.
 * Accepting a submission credits the contributor and closes the bounty.
 */
export function ReviewPanel({
  taskId,
  creatorId,
  priceUsdc,
}: {
  taskId: string;
  creatorId: string | null;
  priceUsdc: number;
}) {
  const { authenticated, profile, getToken } = useAppAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<ReviewSubmission[] | null>(
    null
  );
  const [accepting, setAccepting] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canReview =
    authenticated &&
    profile !== null &&
    (profile.id === creatorId || profile.isAdmin === true);

  useEffect(() => {
    if (!canReview) return;
    let active = true;

    (async () => {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(`/api/app/tasks/${taskId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        submissions: ReviewSubmission[];
      };
      if (active) setSubmissions(data.submissions);
    })();

    return () => {
      active = false;
    };
  }, [canReview, getToken, taskId, reloadKey]);

  if (!canReview || submissions === null) return null;

  async function accept(submissionId: string) {
    setError(null);
    setAccepting(submissionId);

    const token = await getToken();
    if (!token) {
      setError("Sign in expired. Sign in again and retry.");
      setAccepting(null);
      return;
    }

    const response = await fetch(`/api/app/tasks/${taskId}/accept`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submissionId }),
    });

    setAccepting(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Could not accept this submission.");
      return;
    }

    setReloadKey((key) => key + 1);
    router.refresh();
  }

  const points = taskPoints(priceUsdc).toLocaleString("en-US");

  return (
    <section className="border-t border-line/70">
      <div className="flex items-center justify-between gap-3 border-b border-line/70 bg-black/[0.035] px-4 py-1.5 sm:px-6">
        <span className={label}>Review submissions ({submissions.length}):</span>
        <span className={label}>
          Accepting releases payment and credits +{points} pts
        </span>
      </div>

      {submissions.length === 0 ? (
        <div className="px-4 py-10 text-center sm:px-6">
          <p className="text-sm leading-relaxed text-ink-soft">
            No submissions yet. You will review clips here as they arrive.
          </p>
        </div>
      ) : (
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
          {submissions.map((submission) => (
            <article
              key={submission.id}
              className={cn(
                "flex flex-col bg-white shadow-[1px_1px_0_0_var(--color-line)]",
                submission.status === "rejected" && "opacity-45"
              )}
            >
              <video
                src={submission.photo}
                controls
                playsInline
                preload="metadata"
                className="aspect-[4/3] w-full border-b border-line/40 bg-ink object-contain"
              />
              <div className="flex flex-1 flex-col gap-1.5 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-sm text-ink">
                    {submission.user.username}
                  </span>
                  <span className={label}>
                    {new Date(submission.createdAt).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                </div>
                {submission.note ? (
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    {submission.note}
                  </p>
                ) : null}
                {submission.lat !== null && submission.lng !== null ? (
                  <p className="font-mono text-[10px] text-ink/45">
                    GPS {submission.lat.toFixed(4)}, {submission.lng.toFixed(4)}
                  </p>
                ) : null}
              </div>
              <div className="border-t border-line/40 px-4 py-2.5">
                {submission.status === "pending" ? (
                  <button
                    type="button"
                    onClick={() => accept(submission.id)}
                    disabled={accepting !== null}
                    className="glass-btn glass-btn-dark w-full cursor-pointer px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em]"
                  >
                    {accepting === submission.id
                      ? "Accepting..."
                      : "Accept and release payment"}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em]",
                      submission.status === "accepted"
                        ? "bg-ink text-mist"
                        : "text-ink/40"
                    )}
                  >
                    {submission.status === "accepted" ? (
                      <>
                        <Check className="h-3 w-3" strokeWidth={2} /> Accepted
                      </>
                    ) : (
                      "Rejected"
                    )}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {error ? (
        <p className="border-t border-line/40 px-4 py-3 font-mono text-[11px] text-ink sm:px-6">
          ! {error}
        </p>
      ) : null}
    </section>
  );
}
