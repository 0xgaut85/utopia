"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type TocItem = {
  id: string;
  text: string;
  depth: number;
};

export function TocRail() {
  const pathname = usePathname();
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const article = document.getElementById("docs-article");
    if (!article) return;

    const headings = Array.from(
      article.querySelectorAll<HTMLHeadingElement>("h2, h3")
    ).filter((heading) => heading.id);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the rendered DOM, not derivable from props/state
    setItems(
      headings.map((heading) => ({
        id: heading.id,
        text: heading.textContent ?? "",
        depth: heading.tagName === "H3" ? 3 : 2,
      }))
    );

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
  }, [pathname]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-28 hidden max-h-[calc(100svh-8rem)] w-56 shrink-0 overflow-y-auto pb-10 xl:block">
      <span className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft/70">
        On this page
      </span>
      <ul className="mt-3 flex flex-col gap-1 border-l border-line/70">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block border-l-2 py-1 pl-4 text-[13px] leading-snug transition-colors",
                item.depth === 3 && "pl-7",
                activeId === item.id
                  ? "border-ink text-ink font-medium"
                  : "border-transparent text-ink-soft hover:text-ink"
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
