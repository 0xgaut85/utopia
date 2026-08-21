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
  isValidTxHash,
  type DepositNetworkId,
} from "@/lib/app/payments";

const label = "text-xs text-app-faint";
const field = "app-input";

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
  const [price, setPrice] = useState("12");
  const [maxSubmissions, setMaxSubmissions] = useState("10");
  const [network, setNetwork] = useState<DepositNetworkId>("usdc-base");
  const [txHash, setTxHash] = useState("");
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
        depositTxHash: txHash.trim(),
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
    <div className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 text-sm text-app-muted transition-colors hover:text-app-text"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            All bounties
          </Link>
          <span className={label}>
            {step === "details" ? "Step 1 of 2" : "Step 2 of 2"}
          </span>
        </div>

      {!configured ? (
        <div className="flex min-h-[50vh] items-center justify-center px-6">
          <p className="max-w-sm text-center text-sm leading-relaxed text-app-muted">
            Sign in is not configured on this deployment yet, so posting
            bounties is paused.
          </p>
        </div>
      ) : !authenticated ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="max-w-sm text-sm leading-relaxed text-app-muted">
            Sign in to post a bounty. You set the price in USDC, fund it and
            review submissions as they arrive.
          </p>
          <button
            type="button"
            onClick={login}
            disabled={!ready}
            className="app-btn app-btn-primary px-6"
          >
            Sign in
          </button>
        </div>
      ) : step === "details" ? (
        <div className="mt-6 flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-text sm:text-3xl">
              Post a bounty
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-app-muted">
              Describe the clip you need and set a price in USDC. Contributors
              record footage in the app, you accept the one you prefer and the
              reward releases to them at 100 points per USDC.
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
              placeholder="What exactly should the clip show? Framing, time of day, what must be readable in the footage."
              className={cn(field, "resize-none")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={label}>Category</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {CATEGORIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCategory(option.id)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors",
                    category === option.id
                      ? "border-app-text bg-app-text text-app-bg"
                      : "border-app-line text-app-text hover:border-app-line-hi"
                  )}
                >
                  <span className="text-sm font-medium">{option.name}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs leading-snug",
                      category === option.id
                        ? "text-app-bg/60"
                        : "text-app-faint"
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
              <span className={label}>Location (optional)</span>
              <input
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
                maxLength={80}
                placeholder="Shibuya, Tokyo, Japan"
                className={field}
              />
              <span className="text-xs text-app-faint">
                End with the country so contributors can filter by region
              </span>
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
                  className={cn(field, "pl-9")}
                />
              </div>
              <span className="text-xs text-app-faint">
                {points} pts for the contributor
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
                className={field}
              />
            </div>
          </div>

          {error ? <p className="text-sm text-app-text">{error}</p> : null}

          <button
            type="button"
            onClick={continueToFunding}
            className="app-btn app-btn-primary self-start px-5"
          >
            Continue to funding
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-text sm:text-3xl">
              Fund the bounty
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-app-muted">
              Send the exact amount to the Utopia treasury on the network of
              your choice. The bounty goes live once you confirm the transfer
              and payment is held until you accept a submission.
            </p>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-app-line px-4 py-3">
              <span className={label}>Amount due</span>
              <span className="flex items-center gap-1.5 text-lg tabular-nums text-app-text">
                <Image
                  src="/usdc.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px]"
                />
                {priceValue.toLocaleString("en-US")}{" "}
                {network === "usdg-robinhood" ? "USDG" : "USDC"}
              </span>
            </div>

            <div className="grid border-b border-app-line sm:grid-cols-3">
              {DEPOSIT_NETWORKS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setNetwork(option.id)}
                  className={cn(
                    "cursor-pointer px-4 py-3 text-left transition-colors",
                    network === option.id
                      ? "bg-app-text text-app-bg"
                      : "text-app-text hover:bg-app-surface-hi"
                  )}
                >
                  <span className="text-sm font-medium">{option.token}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs",
                      network === option.id
                        ? "text-app-bg/60"
                        : "text-app-faint"
                    )}
                  >
                    on {option.network}
                  </span>
                </button>
              ))}
            </div>

            <div className="px-4 py-3">
              <span className={label}>Deposit address</span>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all font-mono text-xs text-app-text">
                  {DEPOSIT_ADDRESS}
                </code>
                <button
                  type="button"
                  onClick={copyAddress}
                  aria-label="Copy deposit address"
                  className="app-btn app-btn-ghost shrink-0 px-3 py-2 text-xs"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={label}>Transaction hash</span>
            <input
              value={txHash}
              onChange={(event) => setTxHash(event.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder="Paste the hash after you send the deposit"
              className={field}
            />
            <span className="text-xs text-app-faint">
              This becomes the public proof that the reward reached the escrow
              wallet
            </span>
          </div>

          {error ? <p className="text-sm text-app-text">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep("details")}
              className="app-btn app-btn-ghost px-5"
            >
              Back to details
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={publishing || !isValidTxHash(txHash)}
              className="app-btn app-btn-primary flex-1 px-5"
            >
              {publishing ? "Publishing" : "I sent the deposit, publish bounty"}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
