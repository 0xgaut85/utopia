import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppAuthProvider } from "@/components/app/auth-context";
import { AppHeader } from "@/components/app/app-header";

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
      <div className="app-shell flex min-h-svh flex-col overflow-x-clip">
        <AppHeader />
        <main className="w-full flex-1">{children}</main>
        <footer className="border-t border-app-line">
          <div className="flex flex-col gap-2 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
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
      </div>
    </AppAuthProvider>
  );
}
