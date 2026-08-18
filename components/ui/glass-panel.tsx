import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "glass" | "solid" | "dark";
};

export function GlassPanel({
  className,
  variant = "glass",
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "rounded-glass",
        variant === "glass" && "glass",
        variant === "solid" && "glass-solid",
        variant === "dark" && "glass-dark text-white",
        className
      )}
      {...props}
    />
  );
}
