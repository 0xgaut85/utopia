"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppAuth } from "@/components/app/auth-context";
import { Avatar } from "@/components/app/avatar";

const navLinks = [
  { href: "/app", label: "Marketplace", match: /^\/(app)?\/?$|^\/(app\/)?tasks/ },
  { href: "/app/analytics", label: "Analytics", match: /analytics/ },
  { href: "/app/leaderboard", label: "Leaderboard", match: /leaderboard/ },
  { href: "/app/profile", label: "Profile", match: /profile/ },
];

function AuthControls() {
  const { configured, ready, authenticated, profile, login, logout } =
    useAppAuth();

  if (!configured) {
    return (
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-ink/40 sm:inline">
        Auth offline
      </span>
    );
  }

  if (!ready) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/40">
        ...
      </span>
    );
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={login}
        className="glass-btn glass-btn-dark cursor-pointer px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <Link href="/app/profile" className="flex items-center gap-2">
        <Avatar
          username={profile?.username ?? "?"}
          avatarUrl={profile?.avatarUrl}
          size="sm"
        />
        <span className="hidden max-w-28 truncate font-mono text-[11px] text-ink sm:inline">
          {profile?.username ?? "syncing"}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => logout()}
        className="glass-btn cursor-pointer px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft"
      >
        Exit
      </button>
    </div>
  );
}

export function AppHeader() {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-mist/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/app" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/logo-utopia.png"
            alt="Utopia"
            width={22}
            height={22}
            priority
            className="h-5 w-5 shrink-0"
          />
          <span className="truncate font-mono text-xs uppercase tracking-[0.18em] text-ink">
            Utopia <span className="text-ink/40">/ App</span>
          </span>
        </Link>

        <nav className="hidden items-center md:flex">
          {navLinks.map((link) => {
            const active = link.match.test(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "border-b-2 px-4 py-[1.05rem] font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-ink/45 hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <AuthControls />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-8 w-8 items-center justify-center border border-line/70 text-ink-soft transition-colors hover:text-ink md:hidden"
          >
            {menuOpen ? (
              <X className="h-4 w-4" strokeWidth={1.6} />
            ) : (
              <Menu className="h-4 w-4" strokeWidth={1.6} />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="border-t border-line/70 md:hidden">
          {navLinks.map((link) => {
            const active = link.match.test(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "block border-b border-line/40 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em]",
                  active ? "bg-ink text-mist" : "text-ink-soft hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
