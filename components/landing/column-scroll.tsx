"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { AutoScrollColumn } from "@/components/landing/auto-scroll-column";

type ColumnScrollProps = {
  direction: "up" | "down";
  speed?: number;
  className?: string;
  children: ReactNode;
};

export function ColumnScroll({
  direction,
  speed = 55,
  className,
  children,
}: ColumnScrollProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (isDesktop) {
    return (
      <AutoScrollColumn
        direction={direction}
        speed={speed}
        className={cn("min-h-0 flex-1", className)}
      >
        {children}
      </AutoScrollColumn>
    );
  }

  return (
    <div
      data-lenis-prevent
      className={cn("flex flex-col divide-y divide-line/70", className)}
    >
      {children}
    </div>
  );
}
