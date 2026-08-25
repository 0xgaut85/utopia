import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppAuthProvider } from "@/components/app/auth-context";
import { AppHeader } from "@/components/app/app-header";
import { AppShell } from "@/components/app/app-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Utopia App",
    template: "%s | Utopia App",
  },
  description:
    "Earn from the ground truth network. Browse bounties, record verified clips and climb the contributor leaderboard.",
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppAuthProvider>
      <AppShell>
        <AppHeader />
        <main className="flex w-full flex-1 flex-col">{children}</main>
        <footer className="border-t border-app-line/70">
          <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-2 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
            <span className="text-xs text-app-faint">
              Utopia Data, the ground truth network
            </span>
            <a
              href="https://x.com/utopiadata"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-app-faint transition-colors hover:text-app-text"
            >
              @utopiadata
            </a>
          </div>
        </footer>
      </AppShell>
    </AppAuthProvider>
  );
}
