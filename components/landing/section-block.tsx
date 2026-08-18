"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScrambleText } from "@/components/ui/scramble-text";

type SectionBlockProps = {
  label: string;
  href?: string;
  delay?: number;
  className?: string;
  children: ReactNode;
};

export function SectionBlock({
  label,
  href,
  delay = 0,
  className,
  children,
}: SectionBlockProps) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="border-b border-line/70 bg-black/[0.035] px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
          <ScrambleText text={`${label}:`} />
        </span>
      </div>
      <div className={cn("space-y-2.5 px-3 py-2.5", className)}>{children}</div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-colors hover:bg-black/[0.02]">
        {inner}
      </Link>
    );
  }

  return inner;
}
