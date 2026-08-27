"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComingSoonTrigger } from "@/components/coming-soon";

const links = [
  { href: "/#network", label: "Explore" },
  { href: "/docs", label: "Docs" },
];

const UTOPIA_CA = "0x201ebd16f690025705e88d8bbd33b04955f49835";
const UTOPIA_CA_SHORT = `${UTOPIA_CA.slice(0, 6)}…${UTOPIA_CA.slice(-4)}`;
const UTOPIA_CA_EXPLORER = `https://basescan.org/token/${UTOPIA_CA}`;

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyCa() {
    try {
      await navigator.clipboard.writeText(UTOPIA_CA);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  useEffect(() => {
    if (!menuOpen) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="border-b border-line/70 bg-mist/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-3 py-1.5 font-mono text-[11px] text-ink sm:gap-3 sm:px-6 sm:text-xs">
            <span className="shrink-0 font-semibold tracking-tight">
              $UTOPIA CA
            </span>
            <a
              href={UTOPIA_CA_EXPLORER}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 truncate text-ink-soft underline-offset-2 hover:text-ink hover:underline"
              title={UTOPIA_CA}
            >
              <span className="sm:hidden">{UTOPIA_CA_SHORT}</span>
              <span className="hidden break-all sm:inline">{UTOPIA_CA}</span>
            </a>
            <button
              type="button"
              onClick={copyCa}
              className="shrink-0 text-ink-soft underline-offset-2 hover:text-ink hover:underline"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div className="flex justify-center px-3 pt-3 sm:px-6 sm:pt-4">
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="glass flex w-full max-w-5xl items-center justify-between gap-3 rounded-full px-3 py-2 sm:px-5 sm:py-2.5"
        >
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Image
              src="/logo-utopia.png"
              alt="Utopia"
              width={24}
              height={24}
              priority
              className="h-5 w-5 shrink-0"
            />
            <span className="truncate text-base font-semibold tracking-tight text-ink">
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

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/70 text-ink-soft transition-colors hover:border-ink/20 hover:text-ink sm:hidden"
            >
              <Menu className="h-4 w-4" strokeWidth={1.6} />
            </button>

            <ComingSoonTrigger className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-mist transition-transform hover:-translate-y-0.5 sm:px-4 sm:text-sm">
              Launch app
            </ComingSoonTrigger>
          </div>
        </motion.div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            key="site-mobile-menu"
            className="fixed inset-0 z-50 sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            />

            <motion.nav
              initial={{ y: -12, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -8, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-3 right-3 top-[7.25rem] overflow-hidden rounded-glass border border-line/70 bg-mist shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]"
            >
              <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Menu
                </span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/70 text-ink-soft transition-colors hover:text-ink"
                >
                  <X className="h-4 w-4" strokeWidth={1.6} />
                </button>
              </div>

              <ul className="flex flex-col p-2">
                {links.map((link) => {
                  const isActive =
                    link.href === "/docs"
                      ? pathname?.startsWith("/docs")
                      : false;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "block rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-ink/5 text-ink"
                            : "text-ink-soft hover:bg-ink/[0.03] hover:text-ink"
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
