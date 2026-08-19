import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppAuthProvider } from "@/components/app/auth-context";
import { AppHeader } from "@/components/app/app-header";
import { AppComingSoon } from "@/components/app/coming-soon-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Utopia App",
    template: "%s | Utopia App",
  },
  description:
    "Earn from the ground truth network. Browse capture bounties, submit photos and climb the contributor leaderboard.",
};

export default function AppLayout({ children }: { children: ReactNode }) {
  if (process.env.APP_LIVE !== "1") {
    return <AppComingSoon />;
  }

  return (
    <AppAuthProvider>
      <div className="flex min-h-svh flex-col bg-mist">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 border-x border-line/70 bg-white">
          {children}
        </main>
        <footer className="border-t border-line/70">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 border-x border-line/70 bg-white px-4 py-3 sm:px-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/40">
              Utopia Data / ground truth network
            </span>
            <a
              href="https://x.com/utopiadata"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/40 transition-colors hover:text-ink"
            >
              @utopiadata
            </a>
          </div>
        </footer>
      </div>
    </AppAuthProvider>
  );
}
