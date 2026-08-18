"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getAdjacentPages } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Pager() {
  const pathname = usePathname();
  const { prev, next } = getAdjacentPages(pathname ?? "");

  if (!prev && !next) return null;

  return (
    <div className="mt-14 grid grid-cols-1 gap-3 border-t border-line/70 pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="glass group flex flex-col gap-1 rounded-glass-sm px-5 py-4"
        >
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Previous
          </span>
          <span className="text-sm font-semibold text-ink">{prev.title}</span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={next.href}
          className={cn(
            "glass group flex flex-col items-end gap-1 rounded-glass-sm px-5 py-4 text-right sm:col-start-2"
          )}
        >
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
            Next
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="text-sm font-semibold text-ink">{next.title}</span>
        </Link>
      ) : null}
    </div>
  );
}
