/**
 * Geography helpers for bounty filtering.
 *
 * Tasks store only a free text `locationName` and optional coordinates, so
 * country and continent are derived rather than stored. A country is only
 * recognised when the trailing segment of the location name matches a known
 * country, which keeps the filter dropdowns free of stray city names.
 */

export const CONTINENTS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
] as const;

export type Continent = (typeof CONTINENTS)[number];

type CountryEntry = {
  name: string;
  continent: Continent;
  aliases?: string[];
};

const COUNTRIES: CountryEntry[] = [
  // Africa
  { name: "Algeria", continent: "Africa" },
  { name: "Angola", continent: "Africa" },
  { name: "Botswana", continent: "Africa" },
  { name: "Cameroon", continent: "Africa" },
  { name: "Egypt", continent: "Africa" },
  { name: "Ethiopia", continent: "Africa" },
  { name: "Ghana", continent: "Africa" },
  { name: "Ivory Coast", continent: "Africa", aliases: ["cote d'ivoire"] },
  { name: "Kenya", continent: "Africa" },
  { name: "Morocco", continent: "Africa" },
  { name: "Mozambique", continent: "Africa" },
  { name: "Namibia", continent: "Africa" },
  { name: "Nigeria", continent: "Africa" },
  { name: "Rwanda", continent: "Africa" },
  { name: "Senegal", continent: "Africa" },
  { name: "South Africa", continent: "Africa" },
  { name: "Tanzania", continent: "Africa" },
  { name: "Tunisia", continent: "Africa" },
  { name: "Uganda", continent: "Africa" },
  { name: "Zambia", continent: "Africa" },
  { name: "Zimbabwe", continent: "Africa" },

  // Asia
  { name: "Bangladesh", continent: "Asia" },
  { name: "Cambodia", continent: "Asia" },
  { name: "China", continent: "Asia" },
  { name: "Hong Kong", continent: "Asia" },
  { name: "India", continent: "Asia" },
  { name: "Indonesia", continent: "Asia" },
  { name: "Iraq", continent: "Asia" },
  { name: "Israel", continent: "Asia" },
  { name: "Japan", continent: "Asia" },
  { name: "Jordan", continent: "Asia" },
  { name: "Kazakhstan", continent: "Asia" },
  { name: "Kuwait", continent: "Asia" },
  { name: "Lebanon", continent: "Asia" },
  { name: "Malaysia", continent: "Asia" },
  { name: "Mongolia", continent: "Asia" },
  { name: "Nepal", continent: "Asia" },
  { name: "Pakistan", continent: "Asia" },
  { name: "Philippines", continent: "Asia" },
  { name: "Qatar", continent: "Asia" },
  { name: "Saudi Arabia", continent: "Asia" },
  { name: "Singapore", continent: "Asia" },
  { name: "South Korea", continent: "Asia", aliases: ["korea"] },
  { name: "Sri Lanka", continent: "Asia" },
  { name: "Taiwan", continent: "Asia" },
  { name: "Thailand", continent: "Asia" },
  { name: "Turkey", continent: "Asia", aliases: ["turkiye"] },
  {
    name: "United Arab Emirates",
    continent: "Asia",
    aliases: ["uae", "u.a.e."],
  },
  { name: "Uzbekistan", continent: "Asia" },
  { name: "Vietnam", continent: "Asia" },

  // Europe
  { name: "Austria", continent: "Europe" },
  { name: "Belgium", continent: "Europe" },
  { name: "Bulgaria", continent: "Europe" },
  { name: "Croatia", continent: "Europe" },
  { name: "Czechia", continent: "Europe", aliases: ["czech republic"] },
  { name: "Denmark", continent: "Europe" },
  { name: "Estonia", continent: "Europe" },
  { name: "Finland", continent: "Europe" },
  { name: "France", continent: "Europe" },
  { name: "Germany", continent: "Europe" },
  { name: "Greece", continent: "Europe" },
  { name: "Hungary", continent: "Europe" },
  { name: "Iceland", continent: "Europe" },
  { name: "Ireland", continent: "Europe" },
  { name: "Italy", continent: "Europe" },
  { name: "Latvia", continent: "Europe" },
  { name: "Lithuania", continent: "Europe" },
  { name: "Luxembourg", continent: "Europe" },
  { name: "Netherlands", continent: "Europe", aliases: ["the netherlands"] },
  { name: "Norway", continent: "Europe" },
  { name: "Poland", continent: "Europe" },
  { name: "Portugal", continent: "Europe" },
  { name: "Romania", continent: "Europe" },
  { name: "Russia", continent: "Europe" },
  { name: "Serbia", continent: "Europe" },
  { name: "Slovakia", continent: "Europe" },
  { name: "Slovenia", continent: "Europe" },
  { name: "Spain", continent: "Europe" },
  { name: "Sweden", continent: "Europe" },
  { name: "Switzerland", continent: "Europe" },
  { name: "Ukraine", continent: "Europe" },
  {
    name: "United Kingdom",
    continent: "Europe",
    aliases: ["uk", "u.k.", "england", "scotland", "wales", "great britain"],
  },

  // North America
  { name: "Canada", continent: "North America" },
  { name: "Costa Rica", continent: "North America" },
  { name: "Cuba", continent: "North America" },
  { name: "Dominican Republic", continent: "North America" },
  { name: "Guatemala", continent: "North America" },
  { name: "Jamaica", continent: "North America" },
  { name: "Mexico", continent: "North America" },
  { name: "Panama", continent: "North America" },
  {
    name: "United States",
    continent: "North America",
    aliases: ["usa", "u.s.", "u.s.a.", "us", "united states of america"],
  },

  // South America
  { name: "Argentina", continent: "South America" },
  { name: "Bolivia", continent: "South America" },
  { name: "Brazil", continent: "South America" },
  { name: "Chile", continent: "South America" },
  { name: "Colombia", continent: "South America" },
  { name: "Ecuador", continent: "South America" },
  { name: "Paraguay", continent: "South America" },
  { name: "Peru", continent: "South America" },
  { name: "Uruguay", continent: "South America" },
  { name: "Venezuela", continent: "South America" },

  // Oceania
  { name: "Australia", continent: "Oceania" },
  { name: "Fiji", continent: "Oceania" },
  { name: "New Zealand", continent: "Oceania" },
  { name: "Papua New Guinea", continent: "Oceania" },
];

const COUNTRY_LOOKUP = new Map<string, CountryEntry>();

for (const entry of COUNTRIES) {
  COUNTRY_LOOKUP.set(normalize(entry.name), entry);
  for (const alias of entry.aliases ?? []) {
    COUNTRY_LOOKUP.set(normalize(alias), entry);
  }
}

/** Lowercase and strip accents so "Cote d'Ivoire" matches "cote d'ivoire". */
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Pull a country out of a location name written as "City, Country". The
 * trailing segment is only accepted when it is a country we recognise, so a
 * bare "Tokyo" yields nothing rather than inventing a country.
 */
export function countryFromLocationName(
  locationName: string | null
): string | null {
  if (!locationName) return null;

  const segments = locationName
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  // Scan from the end so "Brooklyn Bridge, New York, United States" wins on
  // the country rather than the borough.
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const match = COUNTRY_LOOKUP.get(normalize(segments[i]));
    if (match) return match.name;
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

/**
 * Coarse continental boxes, checked most specific first. Continent level is
 * the only resolution this can honestly claim, which is all the filter needs.
 */
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

export function continentFromCountry(country: string | null): Continent | null {
  if (!country) return null;
  return COUNTRY_LOOKUP.get(normalize(country))?.continent ?? null;
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
    continentFromCoords(place.lat, place.lng) ?? continentFromCountry(country);

  return { country, continent };
}
