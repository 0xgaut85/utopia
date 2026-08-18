"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import Fuse from "fuse.js";
import { Search } from "lucide-react";

type SearchEntry = {
  title: string;
  description: string;
  href: string;
  group: string;
};

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open || entries.length > 0) return;
    fetch("/search-index.json")
      .then((res) => res.json())
      .then((data: SearchEntry[]) => setEntries(data))
      .catch(() => setEntries([]));
  }, [open, entries.length]);

  const fuse = useMemo(
    () =>
      new Fuse(entries, {
        keys: ["title", "description", "group"],
        threshold: 0.36,
      }),
    [entries]
  );

  const results = query.trim()
    ? fuse.search(query).map((result) => result.item)
    : entries;

  function handleSelect(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink sm:w-64 sm:px-4"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">Search docs</span>
        <kbd className="hidden rounded border border-line bg-white/60 px-1.5 py-0.5 font-mono text-[10px] text-ink-soft sm:inline">
          Ctrl K
        </kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Search documentation"
        shouldFilter={false}
        className="cmdk-glass"
      >
        <div className="flex items-center gap-3 border-b border-line/70 px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-soft" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search Utopia documentation..."
            className="w-full bg-transparent py-4 text-sm text-ink outline-none placeholder:text-ink-soft/60"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-4 py-8 text-center text-sm text-ink-soft">
            No results found.
          </Command.Empty>
          {results.slice(0, 20).map((item) => (
            <Command.Item
              key={item.href}
              value={item.href}
              onSelect={() => handleSelect(item.href)}
              className="flex cursor-pointer flex-col gap-0.5 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-ink/[0.06]"
            >
              <span className="flex items-center gap-2 font-medium text-ink">
                {item.title}
                <span className="text-[11px] font-normal text-ink-soft/70">
                  {item.group}
                </span>
              </span>
              {item.description ? (
                <span className="line-clamp-1 text-xs text-ink-soft">
                  {item.description}
                </span>
              ) : null}
            </Command.Item>
          ))}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
