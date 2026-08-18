import Link from "next/link";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/docs/sidebar";
import { TocRail } from "@/components/docs/toc-rail";
import { SearchPalette } from "@/components/docs/search-palette";
import { ComingSoonTrigger } from "@/components/coming-soon";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-mist/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-6 px-6 py-3.5 sm:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-base font-semibold tracking-tight text-ink">
              Utopia
            </Link>
            <span className="hidden text-sm text-ink-soft sm:inline">Documentation</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-4">
            <SearchPalette />
            <ComingSoonTrigger className="hidden shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-medium text-mist transition-transform hover:-translate-y-0.5 sm:inline-block">
              Launch app
            </ComingSoonTrigger>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[100rem] gap-10 px-6 py-10 sm:px-8">
        <aside className="sticky top-24 hidden h-[calc(100svh-7rem)] w-64 shrink-0 overflow-y-auto lg:block">
          <Sidebar />
        </aside>

        <main className="min-w-0 flex-1 py-2">
          <div className="mx-auto flex max-w-4xl gap-10">
            <article id="docs-article" className="min-w-0 flex-1 pb-24">
              {children}
            </article>
            <TocRail />
          </div>
        </main>
      </div>
    </div>
  );
}
