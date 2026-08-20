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
    <div className="flex min-h-svh items-center justify-center bg-mist px-4">
      <div className="w-full max-w-md border border-line/70 bg-white">
        <div className="flex items-center justify-between border-b border-line/70 bg-black/[0.035] px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
            Utopia / app status:
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
            001
          </span>
        </div>

        <div className="space-y-6 px-6 py-10 text-center">
          <Image
            src="/logo-utopia.png"
            alt="Utopia"
            width={40}
            height={40}
            priority
            className="mx-auto h-10 w-10"
          />

          <h1 className="font-display text-4xl font-medium tracking-tight text-ink">
            Private beta
          </h1>

          <p className="mx-auto max-w-xs text-sm leading-relaxed text-ink-soft">
            The Utopia data marketplace is in private beta. Enter your access
            code to continue, or DM us on X to request one.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Access code"
              autoComplete="off"
              spellCheck={false}
              className="w-full border border-line/70 bg-transparent px-3 py-2.5 text-center font-mono text-sm tracking-[0.2em] text-ink outline-none placeholder:tracking-normal placeholder:text-ink/30 focus:border-ink/40"
            />
            {error ? (
              <p className="font-mono text-[11px] text-ink">! {error}</p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full cursor-pointer bg-ink px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-mist transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {submitting ? "Checking..." : "Enter beta"}
            </button>
          </form>

          <div className="bg-ink px-4 py-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mist/60">
              DM us for a private beta code
            </p>
            <a
              href="https://x.com/utopiadata"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-mono text-sm text-mist underline underline-offset-4 hover:text-mist/70"
            >
              @utopiadata
            </a>
          </div>

          <a
            href="https://utopiadata.net"
            className="inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-ink/45 underline underline-offset-4 hover:text-ink"
          >
            Back to utopiadata.net
          </a>
        </div>
      </div>
    </div>
  );
}
