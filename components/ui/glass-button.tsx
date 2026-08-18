"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlassButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
  external?: boolean;
};

export function GlassButton({
  href,
  children,
  variant = "primary",
  className,
  external = false,
}: GlassButtonProps) {
  const content = (
    <motion.span
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium tracking-tight transition-shadow",
        variant === "primary" &&
          "bg-ink text-mist shadow-[0_16px_32px_-16px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_40px_-16px_rgba(0,0,0,0.55)]",
        variant === "ghost" &&
          "glass text-ink hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.2)]",
        className
      )}
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </motion.span>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={href}>{content}</Link>;
}
