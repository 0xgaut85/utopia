"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function AppComingSoon() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/app/beta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });

    if (!response.ok) {
      setError("That code is not valid. DM us for a fresh one.");
      setSubmitting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="app-shell flex min-h-svh items-center justify-center px-4">
      <div className="panel w-full max-w-sm p-8 text-center">
        <Image
          src="/logo-utopia.png"
          alt=""
          width={40}
          height={40}
          priority
          className="mx-auto h-10 w-10 brightness-0 invert"
        />

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-app-text">
          Private beta
        </h1>

        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-app-muted">
          The Utopia app is in private beta. Enter your access code to
          continue, or ask us for one on X.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Access code"
            autoComplete="off"
            spellCheck={false}
            className="app-input text-center"
          />
          {error ? <p className="text-sm text-app-text">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="app-btn app-btn-primary w-full"
          >
            {submitting ? "Checking" : "Enter beta"}
          </button>
        </form>

        <div className="mt-6 border-t border-app-line pt-6">
          <p className="text-sm text-app-muted">
            Need a code? DM{" "}
            <a
              href="https://x.com/utopiadata"
              target="_blank"
              rel="noreferrer"
              className="text-app-text underline underline-offset-4"
            >
              @utopiadata
            </a>
          </p>
          <a
            href="https://utopiadata.net"
            className="mt-3 inline-block text-sm text-app-faint underline underline-offset-4 hover:text-app-text"
          >
            Back to utopiadata.net
          </a>
        </div>
      </div>
    </div>
  );
}
