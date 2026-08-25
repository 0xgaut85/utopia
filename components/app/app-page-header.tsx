import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AppPageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="max-w-xl">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-app-faint">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "font-display text-[2.05rem] font-semibold leading-[1.08] tracking-[-0.035em] text-app-text sm:text-[2.55rem]",
            eyebrow && "mt-2"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-app-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
