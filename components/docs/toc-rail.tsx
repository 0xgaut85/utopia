"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type TocItem = {
  id: string;
  text: string;
  depth: number;
};

function useTocItems() {
  const pathname = usePathname();
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const article = document.getElementById("docs-article");
    if (!article) return;

    const headings = Array.from(
      article.querySelectorAll<HTMLHeadingElement>("h2, h3")
    ).filter((heading) => heading.id);

    // Sync from rendered headings after navigation; not derivable from props alone.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM read after route change
    setItems(
      headings.map((heading) => ({
        id: heading.id,
        text: heading.textContent ?? "",
        depth: heading.tagName === "H3" ? 3 : 2,
      }))
    );
  }, [pathname]);

  return items;
}

function useActiveHeading(items: TocItem[]) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (items.length === 0) return;

    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((heading): heading is HTMLElement => Boolean(heading));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [items]);

  return activeId;
}

function TocList({
  items,
  activeId,
}: {
  items: TocItem[];
  activeId: string;
}) {
  return (
    <ul className="flex flex-col gap-1 border-l border-line/70">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className={cn(
              "block border-l-2 py-1 pl-4 text-[13px] leading-snug transition-colors",
              item.depth === 3 && "pl-7",
              activeId === item.id
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function MobileToc() {
  const items = useTocItems();
  const activeId = useActiveHeading(items);

  if (items.length === 0) {
    return null;
  }

  return (
    <details className="group mb-6 rounded-glass-sm border border-line/70 bg-white/40 xl:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
        <span>On this page</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line/70 px-4 py-3">
        <TocList items={items} activeId={activeId} />
      </div>
    </details>
  );
}

export function TocRail() {
  const items = useTocItems();
  const activeId = useActiveHeading(items);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-28 hidden max-h-[calc(100svh-8rem)] w-56 shrink-0 overflow-y-auto pb-10 xl:block">
      <span className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft/70">
        On this page
      </span>
      <div className="mt-3">
        <TocList items={items} activeId={activeId} />
      </div>
    </div>
  );
}
