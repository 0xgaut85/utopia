import Image from "next/image";
import { cn } from "@/lib/utils";

function formatUsdc(amount: number) {
  return amount % 1 === 0
    ? amount.toLocaleString("en-US")
    : amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export function UsdcAmount({
  amount,
  className,
  iconClassName,
}: {
  amount: number;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Image
        src="/usdc.svg"
        alt="USDC"
        width={16}
        height={16}
        className={cn("h-[1em] w-[1em] shrink-0", iconClassName)}
      />
      {formatUsdc(amount)} USDC
    </span>
  );
}
