"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronUp, X } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

export function FooterReveal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: open ? 0 : 1, y: 0 }}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.4 }}
          className="glass pointer-events-auto flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-ink-soft"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          Footer
        </motion.button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="footer-overlay"
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              type="button"
              aria-label="Close footer"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            />

            <motion.div
              data-lenis-prevent
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-glass-lg border-t border-line/70 bg-mist shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.35)]"
            >
              <div className="flex justify-center pt-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="glass-solid flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-ink-soft"
                >
                  <X className="h-3.5 w-3.5" />
                  Close
                </button>
              </div>
              <SiteFooter />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
