"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { navTree } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-7 pr-2">
      {navTree.map((group) => (
        <div key={group.title}>
          <h3 className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft/70">
            {group.title}
          </h3>
          <ul className="mt-2 flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href} className="relative">
                  {isActive ? (
                    <motion.div
                      layoutId="sidebar-active"
                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      className="absolute inset-0 rounded-lg bg-ink/[0.06]"
                    />
                  ) : null}
                  <Link
                    href={item.href}
                    className={cn(
                      "relative z-10 block rounded-lg px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "font-medium text-ink"
                        : "text-ink-soft hover:text-ink"
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
