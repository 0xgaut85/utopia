/**
 * Geography helpers for bounty filtering.
 *
 * Tasks store a free text `locationName` and optional coordinates. Country
 * identity comes from `world-countries`, so the picker and the matcher share
 * one catalogue instead of a hand-maintained list.
 */

import worldCountries from "world-countries";

export const CONTINENTS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
] as const;

export type Continent = (typeof CONTINENTS)[number];

export type CountryRecord = {
  code: string;
  name: string;
  continent: Continent | null;
};

function continentOf(region: string, subregion: string): Continent | null {
  if (region === "Africa") return "Africa";
  if (region === "Asia") return "Asia";
  if (region === "Europe") return "Europe";
  if (region === "Oceania") return "Oceania";
  if (region === "Americas") {
    return subregion === "South America" ? "South America" : "North America";
  }
  return null;
}

export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export const COUNTRIES: CountryRecord[] = worldCountries
  .filter((country) => country.cca2 && country.name.common)
  .map((country) => ({
    code: country.cca2,
    name: country.name.common,
    continent: continentOf(country.region, country.subregion),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const COUNTRY_BY_CODE = new Map(
  COUNTRIES.map((country) => [country.code, country])
);

const COUNTRY_BY_NAME = new Map<string, CountryRecord>();

for (const country of worldCountries) {
  const record = COUNTRY_BY_CODE.get(country.cca2);
  if (!record) continue;

  const aliases = [
    country.name.common,
    country.name.official,
    ...country.altSpellings,
  ];

  for (const alias of aliases) {
    COUNTRY_BY_NAME.set(normalize(alias), record);
  }
}

export function countryByCode(code: string | null) {
  if (!code) return null;
  return COUNTRY_BY_CODE.get(code) ?? null;
}

/**
 * Pull a country out of a location name written as "City, Country". The
 * trailing segment is only accepted when it is a country we recognise, so a
 * bare "Tokyo" yields nothing rather than inventing a country.
 */
export function countryFromLocationName(
  locationName: string | null
): CountryRecord | null {
  if (!locationName) return null;

  const segments = locationName
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const match = COUNTRY_BY_NAME.get(normalize(segments[i]));
    if (match) return match;
  }

  return null;
}

type Box = {
  continent: Continent;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const BOXES: Box[] = [
  { continent: "Oceania", minLat: -50, maxLat: 0, minLng: 110, maxLng: 180 },
  {
    continent: "South America",
    minLat: -60,
    maxLat: 15,
    minLng: -95,
    maxLng: -30,
  },
  {
    continent: "North America",
    minLat: 5,
    maxLat: 85,
    minLng: -170,
    maxLng: -50,
  },
  { continent: "Europe", minLat: 35, maxLat: 72, minLng: -25, maxLng: 45 },
  { continent: "Africa", minLat: -37, maxLat: 38, minLng: -20, maxLng: 52 },
  { continent: "Asia", minLat: 0, maxLat: 80, minLng: 25, maxLng: 180 },
];

export function continentFromCoords(
  lat: number | null,
  lng: number | null
): Continent | null {
  if (lat === null || lng === null) return null;

  for (const box of BOXES) {
    if (
      lat >= box.minLat &&
      lat <= box.maxLat &&
      lng >= box.minLng &&
      lng <= box.maxLng
    ) {
      return box.continent;
    }
  }

  return null;
}

/**
 * Coordinates win over the location name because they describe the exact
 * point, and the country name covers bounties posted without coordinates.
 */
export function resolvePlace(place: {
  locationName: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const country = countryFromLocationName(place.locationName);
  const continent =
    continentFromCoords(place.lat, place.lng) ?? country?.continent ?? null;

  return {
    country: country?.name ?? null,
    code: country?.code ?? null,
    continent,
  };
}
