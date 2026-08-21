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
        "inline-flex items-center gap-1 text-app-muted underline-offset-4 hover:text-app-text hover:underline",
        className
      )}
    >
      {proof.label}
      <span className="font-mono tabular-nums">{proof.detail}</span>
      <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.8} />
    </a>
  );
}
