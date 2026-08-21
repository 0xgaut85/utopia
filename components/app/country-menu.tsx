"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Search, X } from "lucide-react";
import { Command } from "cmdk";
import { cn } from "@/lib/utils";
import { COUNTRIES, countryByCode, normalize } from "@/lib/app/geo";
import { CountryFlag } from "@/components/app/country-flag";

export function CountryMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = countryByCode(value === "all" ? null : value);

  const matches = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return COUNTRIES;
    return COUNTRIES.filter(
      (country) =>
        normalize(country.name).includes(needle) ||
        normalize(country.code).includes(needle)
    );
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function pick(code: string) {
    onChange(code);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className="app-input flex w-auto cursor-pointer items-center gap-2 py-2 pr-2 text-left"
      >
        {selected ? (
          <CountryFlag
            code={selected.code}
            title={selected.name}
            className="h-3.5 w-5 shrink-0 rounded-[2px]"
          />
        ) : null}
        <span className="max-w-40 truncate">
          {selected ? selected.name : "Every country"}
        </span>
        <ChevronsUpDown
          className="ml-1 h-3.5 w-3.5 shrink-0 text-app-faint"
          strokeWidth={1.8}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-app-line bg-app-surface shadow-2xl">
          <Command shouldFilter={false} label="Choose a country">
            <div className="relative border-b border-app-line">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-faint"
                strokeWidth={1.8}
              />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search countries"
                className="w-full bg-transparent py-2.5 pl-9 pr-9 text-sm text-app-text outline-none placeholder:text-app-faint"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear country search"
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center text-app-faint hover:text-app-text"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              ) : null}
            </div>

            <Command.List className="max-h-72 overflow-y-auto p-1">
              <Command.Item
                value="every-country"
                onSelect={() => pick("all")}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-app-text outline-none data-[selected=true]:bg-app-bg",
                  value === "all" && "bg-app-bg"
                )}
              >
                Every country
              </Command.Item>

              {matches.map((country) => (
                <Command.Item
                  key={country.code}
                  value={country.code}
                  onSelect={() => pick(country.code)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-app-text outline-none data-[selected=true]:bg-app-bg",
                    value === country.code && "bg-app-bg"
                  )}
                >
                  <CountryFlag
                    code={country.code}
                    title={country.name}
                    className="h-3.5 w-5 shrink-0 rounded-[2px]"
                  />
                  <span className="min-w-0 flex-1 truncate">{country.name}</span>
                  <span className="shrink-0 text-xs text-app-faint">
                    {country.code}
                  </span>
                </Command.Item>
              ))}

              {matches.length === 0 ? (
                <p className="px-2.5 py-6 text-center text-sm text-app-faint">
                  No country matches that search
                </p>
              ) : null}
            </Command.List>
          </Command>
        </div>
      ) : null}
    </div>
  );
}
