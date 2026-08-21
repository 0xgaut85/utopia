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
  {
    href: "/app",
    label: "Bounties",
    match: /^\/(app)?\/?$|^\/(app\/)?tasks/,
  },
  { href: "/app/analytics", label: "Analytics", match: /analytics/ },
  { href: "/app/leaderboard", label: "Leaderboard", match: /leaderboard/ },
  { href: "/app/profile", label: "Profile", match: /profile/ },
];

function AuthControls() {
  const { configured, ready, authenticated, profile, login, logout } =
    useAppAuth();

  if (!configured) {
    return (
      <span className="hidden text-xs text-app-faint sm:inline">
        Sign in offline
      </span>
    );
  }

  if (!ready) {
    return <span className="text-xs text-app-faint">Loading</span>;
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={login}
        className="app-btn app-btn-primary px-4 py-2"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/app/profile"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-app-surface"
      >
        <Avatar
          username={profile?.username ?? "?"}
          avatarUrl={profile?.avatarUrl}
          size="sm"
        />
        <span className="hidden max-w-28 truncate text-sm text-app-text sm:inline">
          {profile?.username ?? "syncing"}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => logout()}
        className="app-btn app-btn-ghost px-3 py-2 text-xs"
      >
        Sign out
      </button>
    </div>
  );
}

export function AppHeader() {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-app-line bg-app-bg/85 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/app" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/logo-utopia.png"
            alt=""
            width={24}
            height={24}
            priority
            className="h-6 w-6 shrink-0 brightness-0 invert"
          />
          <span className="truncate text-base font-medium tracking-tight text-app-text">
            Utopia
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = link.match.test(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-app-surface text-app-text"
                    : "text-app-muted hover:bg-app-surface/60 hover:text-app-text"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <AuthControls />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-app-line text-app-muted transition-colors hover:text-app-text md:hidden"
          >
            {menuOpen ? (
              <X className="h-4 w-4" strokeWidth={1.8} />
            ) : (
              <Menu className="h-4 w-4" strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="border-t border-app-line px-3 py-2 md:hidden">
          {navLinks.map((link) => {
            const active = link.match.test(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm",
                  active
                    ? "bg-app-surface text-app-text"
                    : "text-app-muted hover:text-app-text"
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
