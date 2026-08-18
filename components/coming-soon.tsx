"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const TWITTER_URL = "https://x.com/utopiadata";

const ComingSoonContext = createContext<{ open: () => void } | null>(null);

export function useComingSoon() {
  const ctx = useContext(ComingSoonContext);
  if (!ctx) {
    throw new Error("useComingSoon must be used within ComingSoonProvider");
  }
  return ctx;
}

export function ComingSoonProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <ComingSoonContext.Provider value={{ open }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.button
              type="button"
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Coming soon"
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm rounded-2xl border border-line/70 bg-mist p-6 shadow-2xl"
            >
              <button
                type="button"
                aria-label="Close"
                onClick={close}
                className="absolute right-4 top-4 cursor-pointer rounded-full p-1 text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={1.6} />
              </button>

              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                Utopia app
              </span>
              <h2 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink">
                Coming soon
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                The app isn&apos;t live just yet. Follow{" "}
                <a
                  href={TWITTER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink underline underline-offset-4 hover:text-ink/70"
                >
                  @Utopiadata
                </a>{" "}
                for launch updates.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <a
                  href={TWITTER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-mist transition-transform hover:-translate-y-0.5"
                >
                  Follow @Utopiadata
                </a>
                <button
                  type="button"
                  onClick={close}
                  className="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ComingSoonContext.Provider>
  );
}

type ComingSoonTriggerProps = {
  className?: string;
  children: ReactNode;
};

/** Button that looks like whatever className you give it and opens the modal. */
export function ComingSoonTrigger({
  className,
  children,
}: ComingSoonTriggerProps) {
  const { open } = useComingSoon();
  return (
    <button
      type="button"
      onClick={open}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </button>
  );
}
