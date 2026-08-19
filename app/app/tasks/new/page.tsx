"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppAuth } from "@/components/app/auth-context";
import { taskPoints } from "@/lib/app/points";
import {
  DEPOSIT_ADDRESS,
  DEPOSIT_NETWORKS,
  type DepositNetworkId,
} from "@/lib/app/payments";

const label = "font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45";
const field =
  "w-full border border-line/70 bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-ink/40";

const CATEGORIES = [
  { id: "location", name: "Location", hint: "A specific place on the map" },
  { id: "object", name: "Object", hint: "A thing, wherever it exists" },
  { id: "coverage", name: "Coverage", hint: "Pure map coverage, anywhere" },
];

export default function NewBountyPage() {
  const { configured, ready, authenticated, login, getToken } = useAppAuth();
  const router = useRouter();

  const [step, setStep] = useState<"details" | "funding">("details");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [category, setCategory] = useState("location");
  const [locationName, setLocationName] = useState("");
  const [price, setPrice] = useState("25");
  const [maxSubmissions, setMaxSubmissions] = useState("25");
  const [network, setNetwork] = useState<DepositNetworkId>("usdc-base");
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceValue = Number(price);
  const priceOk = Number.isFinite(priceValue) && priceValue >= 1;
  const points = priceOk ? taskPoints(priceValue).toLocaleString("en-US") : "0";

  function continueToFunding() {
    setError(null);
    if (title.trim().length < 8) {
      setError("Title must be at least 8 characters.");
      return;
    }
    if (brief.trim().length < 40) {
      setError("Brief must be at least 40 characters.");
      return;
    }
    if (!priceOk) {
      setError("Price must be at least 1 USDC.");
      return;
    }
    setStep("funding");
  }

  async function copyAddress() {
    await navigator.clipboard.writeText(DEPOSIT_ADDRESS);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function publish() {
    setError(null);
    setPublishing(true);

    const token = await getToken();
    if (!token) {
      setError("Sign in expired. Sign in again and retry.");
      setPublishing(false);
      return;
    }

    const response = await fetch("/api/app/tasks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title.trim(),
        brief: brief.trim(),
        category,
        locationName: locationName.trim() || undefined,
        priceUsdc: priceValue,
        maxSubmissions: Number(maxSubmissions) || 25,
        depositNetwork: network,
      }),
    });

    const data = (await response.json().catch(() => null)) as {
      task?: { id: string };
      error?: string;
    } | null;

    if (!response.ok || !data?.task) {
      setError(data?.error ?? "Could not publish the bounty. Try again.");
      setPublishing(false);
      return;
    }

    router.push(`/app/tasks/${data.task.id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-line/70 bg-black/[0.035] px-4 py-1.5 sm:px-6">
        <Link
          href="/app"
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.6} />
          Marketplace
        </Link>
        <span className={label}>
          {step === "details" ? "Post a bounty / 1 of 2" : "Fund it / 2 of 2"}
        </span>
      </div>

      {!configured ? (
        <div className="flex min-h-[50vh] items-center justify-center px-6">
          <p className="max-w-sm text-center text-sm leading-relaxed text-ink-soft">
            Sign in is not configured on this deployment yet, so posting
            bounties is paused.
          </p>
        </div>
      ) : !authenticated ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            Sign in to post a bounty. You set the price in USDC, fund it and
            review submissions as they arrive.
          </p>
          <button
            type="button"
            onClick={login}
            disabled={!ready}
            className="cursor-pointer bg-ink px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-mist transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            Sign in
          </button>
        </div>
      ) : step === "details" ? (
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
          <div>
            <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-ink">
              Post a bounty
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Describe the photo you need and set a price in USDC. Contributors
              submit captures, you accept the one you prefer and payment
              releases to them as points at 1 USDC = 100 points.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={label}>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={90}
              placeholder="EV charging station in use, any city"
              className={field}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={label}>Brief</span>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              rows={5}
              maxLength={1200}
              placeholder="What exactly should the capture show? Framing, time of day, what must be readable in the shot."
              className={cn(field, "resize-none")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={label}>Category</span>
            <div className="grid gap-px sm:grid-cols-3">
              {CATEGORIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCategory(option.id)}
                  className={cn(
                    "cursor-pointer border px-3 py-2.5 text-left transition-colors",
                    category === option.id
                      ? "border-ink bg-ink text-mist"
                      : "border-line/70 text-ink hover:border-ink/40"
                  )}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em]">
                    {option.name}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[11px] leading-snug",
                      category === option.id ? "text-mist/60" : "text-ink/40"
                    )}
                  >
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <span className={label}>Zone (optional)</span>
              <input
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
                maxLength={80}
                placeholder="Shibuya, Tokyo"
                className={field}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={label}>Price in USDC</span>
              <div className="relative">
                <Image
                  src="/usdc.svg"
                  alt="USDC"
                  width={16}
                  height={16}
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                />
                <input
                  value={price}
                  onChange={(event) =>
                    setPrice(event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  inputMode="decimal"
                  className={cn(field, "pl-9 font-mono")}
                />
              </div>
              <span className="font-mono text-[10px] text-ink/45">
                = {points} pts for the contributor
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={label}>Max submissions</span>
              <input
                value={maxSubmissions}
                onChange={(event) =>
                  setMaxSubmissions(event.target.value.replace(/[^0-9]/g, ""))
                }
                inputMode="numeric"
                className={cn(field, "font-mono")}
              />
            </div>
          </div>

          {error ? (
            <p className="font-mono text-[11px] text-ink">! {error}</p>
          ) : null}

          <button
            type="button"
            onClick={continueToFunding}
            className="cursor-pointer bg-ink px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-mist transition-opacity hover:opacity-80"
          >
            Continue to funding
          </button>
        </div>
      ) : (
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
          <div>
            <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-ink">
              Fund the bounty
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Send the exact amount to the Utopia treasury on the network of
              your choice. The bounty goes live once you confirm the transfer
              and payment is held until you accept a submission.
            </p>
          </div>

          <div className="border border-line/70">
            <div className="flex items-center justify-between gap-3 border-b border-line/70 bg-black/[0.035] px-4 py-2.5">
              <span className={label}>Amount due</span>
              <span className="flex items-center gap-1.5 font-mono text-lg text-ink">
                <Image
                  src="/usdc.svg"
                  alt="USDC"
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px]"
                />
                {priceValue.toLocaleString("en-US")}{" "}
                {network === "usdg-robinhood" ? "USDG" : "USDC"}
              </span>
            </div>

            <div className="grid gap-px border-b border-line/70 sm:grid-cols-3">
              {DEPOSIT_NETWORKS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setNetwork(option.id)}
                  className={cn(
                    "cursor-pointer px-3 py-2.5 text-left transition-colors",
                    network === option.id
                      ? "bg-ink text-mist"
                      : "text-ink hover:bg-black/[0.03]"
                  )}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em]">
                    {option.token}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[11px]",
                      network === option.id ? "text-mist/60" : "text-ink/40"
                    )}
                  >
                    on {option.network}
                  </span>
                </button>
              ))}
            </div>

            <div className="px-4 py-3">
              <span className={label}>Deposit address</span>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-ink">
                  {DEPOSIT_ADDRESS}
                </code>
                <button
                  type="button"
                  onClick={copyAddress}
                  aria-label="Copy deposit address"
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 border border-line/70 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
                >
                  {copied ? (
                    <Check className="h-3 w-3" strokeWidth={2} />
                  ) : (
                    <Copy className="h-3 w-3" strokeWidth={1.6} />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <p className="font-mono text-[11px] text-ink">! {error}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep("details")}
              className="cursor-pointer border border-line/70 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
            >
              Back to details
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={publishing}
              className="flex-1 cursor-pointer bg-ink px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-mist transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {publishing
                ? "Publishing..."
                : "I sent the deposit / publish bounty"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
