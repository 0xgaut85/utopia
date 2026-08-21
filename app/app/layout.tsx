import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppAuthProvider } from "@/components/app/auth-context";
import { AppHeader } from "@/components/app/app-header";
import { AppComingSoon } from "@/components/app/coming-soon-page";
import { BETA_COOKIE } from "@/lib/app/beta";

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
  const code = process.env.APP_BETA_CODE;

  // When a beta code is configured, gate the app behind it. Access is granted
  // by a cookie set once the correct code is entered. With no code set (local
  // dev), the app is open.
  if (code) {
    const store = await cookies();
    if (store.get(BETA_COOKIE)?.value !== code) {
      return <AppComingSoon />;
    }
  }

  return (
    <AppAuthProvider>
      <div className="app-shell flex min-h-svh flex-col">
        <AppHeader />
        <main className="w-full flex-1">{children}</main>
        <footer className="border-t border-app-line">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
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
