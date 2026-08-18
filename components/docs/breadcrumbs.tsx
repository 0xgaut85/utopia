"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { navTree } from "@/lib/nav";

function findGroupTitle(pathname: string): string | null {
  const group = navTree.find((g) => g.items.some((item) => item.href === pathname));
  return group?.title ?? null;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const groupTitle = findGroupTitle(pathname ?? "");

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
      <Link href="/docs" className="transition-colors hover:text-ink">
        Docs
      </Link>
      {groupTitle ? (
        <>
          <ChevronRight className="h-3 w-3" />
          <span>{groupTitle}</span>
        </>
      ) : null}
    </div>
  );
}
