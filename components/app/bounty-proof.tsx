import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { bountyProof } from "@/lib/app/payments";

export function BountyProof({
  depositNetwork,
  depositTxHash,
  className,
}: {
  depositNetwork: string | null;
  depositTxHash: string | null;
  className?: string;
}) {
  const proof = bountyProof({ depositNetwork, depositTxHash });

  return (
    <a
      href={proof.href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 text-app-muted underline-offset-4 hover:text-app-text hover:underline",
        className
      )}
    >
      <span className="shrink-0">{proof.label}</span>
      <span className="min-w-0 truncate font-mono tabular-nums">
        {proof.detail}
      </span>
      <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.8} />
    </a>
  );
}
