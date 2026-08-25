"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppAuth } from "@/components/app/auth-context";
import { Avatar } from "@/components/app/avatar";

const brandLink = {
  href: "/app/archive",
  label: "Archive",
  match: /archive/,
};

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
        className="flex items-center gap-2 rounded-full px-1.5 py-1 transition-colors hover:bg-app-surface"
      >
        <Avatar
          username={profile?.username ?? "?"}
          avatarUrl={profile?.avatarUrl}
          size="sm"
        />
        <span className="hidden max-w-28 truncate text-[13px] font-medium text-app-text sm:inline">
          {profile?.username ?? "syncing"}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => logout()}
        className="app-btn app-btn-ghost px-3 py-1.5 text-xs"
      >
        Sign out
      </button>
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-app-text text-app-bg shadow-sm"
          : "text-app-muted hover:bg-app-surface hover:text-app-text"
      )}
    >
      {label}
    </Link>
  );
}

export function AppHeader() {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const archiveActive = brandLink.match.test(pathname);
  const light = /analytics/.test(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-app-line/70 bg-app-bg/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center justify-between gap-3 px-4 sm:h-[3.75rem] sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-1">
          <Link href="/app" className="flex min-w-0 items-center gap-2.5 pr-1">
            <Image
              src="/logo-utopia.png"
              alt=""
              width={24}
              height={24}
              priority
              className={cn(
                "h-6 w-6 shrink-0 brightness-0",
                !light && "invert"
              )}
            />
            <span className="truncate font-display text-[17px] font-semibold tracking-tight text-app-text">
              Utopia
            </span>
          </Link>
          <Link
            href={brandLink.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              archiveActive
                ? "bg-app-surface text-app-text"
                : "text-app-muted hover:bg-app-surface hover:text-app-text"
            )}
          >
            Archive
          </Link>
        </div>

        <nav className="app-seg hidden items-center rounded-full p-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={link.match.test(pathname)}
            />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AuthControls />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-app-line text-app-muted transition-colors hover:bg-app-surface hover:text-app-text md:hidden"
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
        <nav className="border-t border-app-line px-3 py-2.5 md:hidden">
          <div className="app-seg flex flex-col gap-1 rounded-[1.15rem] p-1.5">
            <NavLink
              href={brandLink.href}
              label={brandLink.label}
              active={archiveActive}
              onClick={() => setMenuOpen(false)}
            />
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={link.match.test(pathname)}
                onClick={() => setMenuOpen(false)}
              />
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
