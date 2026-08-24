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
    <section className="mt-10 border-t border-app-line pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium text-app-text">
          Submissions ({submissions.length})
        </h2>
        <span className="text-sm text-app-muted">
          Accepting credits {points} points. USDC is sent from the payout desk.
        </span>
      </div>

      {submissions.length === 0 ? (
        <div className="panel mt-4 px-6 py-12 text-center">
          <p className="text-sm text-app-muted">
            No submissions yet. Clips will appear here as they arrive.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {submissions.map((submission) => (
            <article
              key={submission.id}
              className={cn(
                "panel flex flex-col overflow-hidden",
                submission.status === "rejected" && "opacity-50"
              )}
            >
              <video
                src={submission.photo}
                controls
                playsInline
                preload="metadata"
                className="aspect-[3/4] w-full border-b border-app-line bg-black object-contain"
              />
              <div className="flex flex-1 flex-col gap-1.5 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-app-text">
                    {submission.user.username}
                  </span>
                  <span className="shrink-0 text-xs text-app-faint">
                    {new Date(submission.createdAt).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                </div>
                {submission.note ? (
                  <p className="text-sm leading-relaxed text-app-muted">
                    {submission.note}
                  </p>
                ) : null}
                {submission.lat !== null && submission.lng !== null ? (
                  <p className="font-mono text-xs tabular-nums text-app-faint">
                    {submission.lat.toFixed(4)}, {submission.lng.toFixed(4)}
                  </p>
                ) : null}
              </div>
              <div className="border-t border-app-line p-3">
                {submission.status === "pending" ? (
                  <button
                    type="button"
                    onClick={() => accept(submission.id)}
                    disabled={accepting !== null}
                    className="app-btn app-btn-primary w-full"
                  >
                    {accepting === submission.id
                      ? "Accepting"
                      : "Accept and pay"}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 text-sm",
                      submission.status === "accepted"
                        ? "text-app-text"
                        : "text-app-faint"
                    )}
                  >
                    {submission.status === "accepted" ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={2} /> Accepted
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

      {error ? <p className="mt-4 text-sm text-app-text">{error}</p> : null}
    </section>
  );
}
