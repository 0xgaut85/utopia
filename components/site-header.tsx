"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ComingSoonTrigger } from "@/components/coming-soon";

const links = [
  { href: "/#network", label: "Explore" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4 sm:px-6">
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="glass flex w-full max-w-5xl items-center justify-between rounded-full px-5 py-2.5"
      >
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-utopia.png"
            alt="Utopia"
            width={24}
            height={24}
            priority
            className="h-5 w-5"
          />
          <span className="text-base font-semibold tracking-tight text-ink">
            Utopia
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => {
            const isActive =
              link.href === "/docs"
                ? pathname?.startsWith("/docs")
                : false;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink",
                  isActive && "bg-ink/5 text-ink"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ComingSoonTrigger className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-mist transition-transform hover:-translate-y-0.5">
            Launch app
          </ComingSoonTrigger>
        </div>
      </motion.div>
    </header>
  );
}
