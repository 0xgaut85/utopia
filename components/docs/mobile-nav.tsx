"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/docs/sidebar";

export function DocsMobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open documentation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line/70 text-ink-soft transition-colors hover:border-ink/20 hover:text-ink lg:hidden"
      >
        <Menu className="h-4 w-4" strokeWidth={1.6} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="docs-mobile-nav"
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              aria-label="Close documentation menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            />

            <motion.aside
              data-lenis-prevent
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-y-0 left-0 flex w-[min(88vw,20rem)] flex-col border-r border-line/70 bg-mist shadow-[24px_0_60px_-24px_rgba(0,0,0,0.35)]"
            >
              <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
                <span className="text-sm font-semibold tracking-tight text-ink">
                  Documentation
                </span>
                <button
                  type="button"
                  aria-label="Close documentation menu"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/70 text-ink-soft transition-colors hover:text-ink"
                >
                  <X className="h-4 w-4" strokeWidth={1.6} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-4">
                <Sidebar onNavigate={() => setOpen(false)} />
              </div>

              <div className="border-t border-line/70 px-4 py-3">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  Back to landing page
                </Link>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
