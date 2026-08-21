"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCard, type TaskCardData } from "@/components/app/task-card";
import { CONTINENTS, normalize, resolvePlace } from "@/lib/app/geo";
import { CountryMenu } from "@/components/app/country-menu";

export type BrowsableTask = TaskCardData & {
  createdAt: string;
};

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "location", label: "Location" },
  { id: "object", label: "Object" },
  { id: "coverage", label: "Coverage" },
];

const SORTS = [
  { id: "reward-desc", label: "Highest reward" },
  { id: "reward-asc", label: "Lowest reward" },
  { id: "newest", label: "Newest first" },
];

const ANYWHERE = "anywhere";

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="relative flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="app-input w-auto cursor-pointer appearance-none py-2 pl-3 pr-8 text-sm"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 10 6"
        className="pointer-events-none absolute right-3 h-1.5 w-2.5 fill-none stroke-app-faint"
      >
        <path d="M1 1l4 4 4-4" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </label>
  );
}

export function BountyBrowser({ tasks }: { tasks: BrowsableTask[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [region, setRegion] = useState("all");
  const [country, setCountry] = useState("all");
  const [availability, setAvailability] = useState("open");
  const [sort, setSort] = useState("reward-desc");

  // Resolve each bounty's geography once, and keep a haystack for the search.
  const entries = useMemo(
    () =>
      tasks.map((task) => {
        const {
          country: taskCountry,
          code,
          continent,
        } = resolvePlace(task);
        const open =
          task.status === "open" &&
          task.submissionCount < task.maxSubmissions;

        return {
          task,
          country: taskCountry,
          code,
          continent,
          open,
          haystack: normalize(
            [
              task.title,
              task.brief,
              task.locationName ?? "Anywhere",
              taskCountry ?? "",
              continent ?? "",
              task.category,
            ].join(" ")
          ),
        };
      }),
    [tasks]
  );

  const regionOptions = [
    { id: "all", label: "Every region" },
    ...CONTINENTS.map((continent) => ({ id: continent, label: continent })),
    { id: ANYWHERE, label: "Anywhere on Earth" },
  ];

  const terms = useMemo(
    () => normalize(query).split(/\s+/).filter(Boolean),
    [query]
  );

  const results = useMemo(() => {
    const filtered = entries.filter((entry) => {
      if (category !== "all" && entry.task.category !== category) return false;
      if (availability === "open" && !entry.open) return false;

      if (country !== "all") {
        if (entry.code !== country) return false;
      } else if (region === ANYWHERE) {
        if (entry.continent !== null) return false;
      } else if (region !== "all" && entry.continent !== region) {
        return false;
      }
      if (!terms.every((term) => entry.haystack.includes(term))) return false;

      return true;
    });

    // Closed bounties always sink to the bottom, whatever the sort is.
    return filtered.sort((a, b) => {
      if (a.open !== b.open) return a.open ? -1 : 1;
      if (sort === "reward-asc") return a.task.priceUsdc - b.task.priceUsdc;
      if (sort === "newest") {
        return b.task.createdAt.localeCompare(a.task.createdAt);
      }
      return b.task.priceUsdc - a.task.priceUsdc;
    });
  }, [entries, category, availability, region, country, terms, sort]);

  const filtersActive =
    query !== "" ||
    category !== "all" ||
    region !== "all" ||
    country !== "all" ||
    availability !== "open" ||
    sort !== "reward-desc";

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setRegion("all");
    setCountry("all");
    setAvailability("open");
    setSort("reward-desc");
  }

  return (
    <div>
      <div className="panel relative z-20 mt-8 overflow-visible p-3 sm:p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-faint"
            strokeWidth={1.8}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="Search bounties by title, place or country"
            className="app-input py-2.5 pl-9 pr-9"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-app-faint transition-colors hover:text-app-text"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-app-bg p-1">
            {CATEGORIES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setCategory(option.id)}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors",
                  category === option.id
                    ? "bg-app-text text-app-bg"
                    : "text-app-muted hover:text-app-text"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Select
            label="Region"
            value={region}
            onChange={(next) => {
              setRegion(next);
              setCountry("all");
            }}
            options={regionOptions}
          />

          <CountryMenu value={country} onChange={setCountry} />

          <Select
            label="Availability"
            value={availability}
            onChange={setAvailability}
            options={[
              { id: "open", label: "Open only" },
              { id: "all", label: "Open and closed" },
            ]}
          />

          <Select
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={SORTS}
          />

          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer text-sm text-app-faint underline underline-offset-4 transition-colors hover:text-app-text"
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-sm text-app-muted">
        {results.length === tasks.length
          ? `${tasks.length} bounties`
          : `${results.length} of ${tasks.length} bounties`}
      </p>

      {results.length === 0 ? (
        <div className="panel mt-3 flex flex-col items-center gap-4 px-6 py-16 text-center">
          <SlidersHorizontal
            className="h-5 w-5 text-app-faint"
            strokeWidth={1.8}
          />
          <p className="max-w-xs text-sm leading-relaxed text-app-muted">
            No bounties match what you are looking for. Try a wider region or
            clear the filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="app-btn app-btn-ghost"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 items-start gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {results.map((entry) => (
            <TaskCard key={entry.task.id} task={entry.task} />
          ))}
        </div>
      )}
    </div>
  );
}
