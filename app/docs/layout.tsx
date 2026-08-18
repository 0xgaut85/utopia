import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/docs/sidebar";
import { TocRail, MobileToc } from "@/components/docs/toc-rail";
import { SearchPalette } from "@/components/docs/search-palette";
import { DocsMobileNav } from "@/components/docs/mobile-nav";
import { ComingSoonTrigger } from "@/components/coming-soon";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-mist/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[100rem] items-center gap-3 px-4 py-3 sm:gap-6 sm:px-8 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <DocsMobileNav />
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <Image
                src="/logo-utopia.png"
                alt="Utopia"
                width={24}
                height={24}
                className="h-5 w-5 shrink-0"
              />
              <span className="truncate text-base font-semibold tracking-tight text-ink">
                Utopia
              </span>
            </Link>
            <span className="hidden text-sm text-ink-soft md:inline">
              Documentation
            </span>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-4">
            <SearchPalette />
            <ComingSoonTrigger className="hidden shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-medium text-mist transition-transform hover:-translate-y-0.5 sm:inline-block">
              Launch app
            </ComingSoonTrigger>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[100rem] gap-10 px-4 py-6 sm:px-8 sm:py-10">
        <aside className="sticky top-24 hidden h-[calc(100svh-7rem)] w-64 shrink-0 overflow-y-auto lg:block">
          <Sidebar />
        </aside>

        <main className="min-w-0 flex-1 py-1 sm:py-2">
          <div className="mx-auto flex max-w-4xl gap-10">
            <article id="docs-article" className="min-w-0 flex-1 pb-20 sm:pb-24">
              <MobileToc />
              {children}
            </article>
            <TocRail />
          </div>
        </main>
      </div>
    </div>
  );
}
