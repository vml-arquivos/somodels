import {
  attendancePlaceOptions,
  priceBands,
  serviceOptions,
} from "../../../shared/discovery-options";

export const DISCOVERY_PAGE_SIZE = 12;

export type DiscoverySort = "featured" | "recent" | "available" | "price_asc";

export type DiscoveryFilters = {
  search: string;
  city: string;
  region: string;
  category: string;
  attribute: string;
  ageMin: string;
  ageMax: string;
  availableNow: boolean;
  priceMax: string;
  service: string;
  place: string;
  verifiedOnly: boolean;
  sort: DiscoverySort;
  page: number;
};

function clean(value: string | null, max: number) {
  return (value ?? "").trim().slice(0, max);
}

function cleanAge(value: string | null) {
  const normalized = clean(value, 2);
  if (!normalized) return "";
  const age = Number(normalized);
  return Number.isInteger(age) && age >= 18 && age <= 99 ? String(age) : "";
}

function cleanSort(value: string | null): DiscoverySort {
  return value === "recent" || value === "available" || value === "price_asc"
    ? value
    : "featured";
}

// Aceita somente valores do vocabulário controlado ou das faixas de preço.
function cleanOption(value: string | null, allowed: readonly string[]) {
  const normalized = clean(value, 80);
  return allowed.includes(normalized) ? normalized : "";
}

function cleanPriceMax(value: string | null) {
  const normalized = clean(value, 8);
  return priceBands.some(band => String(band.maxCents) === normalized)
    ? normalized
    : "";
}

export function parseDiscoverySearch(
  searchString: string,
  fixedCity?: string,
  fixedCategory?: string,
): DiscoveryFilters {
  const params = new URLSearchParams(
    searchString.startsWith("?") ? searchString : `?${searchString}`
  );
  const parsedPage = Number(params.get("page") || "1");
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0
    ? Math.min(parsedPage - 1, 833)
    : 0;
  return {
    search: clean(params.get("q"), 120),
    city: fixedCity ? clean(fixedCity, 120) : clean(params.get("city"), 120),
    region: clean(params.get("region"), 80),
    category: fixedCategory
      ? clean(fixedCategory, 60)
      : clean(params.get("category"), 60),
    attribute: clean(params.get("attribute"), 60),
    ageMin: cleanAge(params.get("minAge")),
    ageMax: cleanAge(params.get("maxAge")),
    availableNow: params.get("available") === "now",
    priceMax: cleanPriceMax(params.get("priceMax")),
    service: cleanOption(params.get("service"), serviceOptions),
    place: cleanOption(params.get("place"), attendancePlaceOptions),
    verifiedOnly: params.get("verified") === "1",
    sort: cleanSort(params.get("sort")),
    page,
  };
}

export function buildDiscoverySearch(
  filters: DiscoveryFilters,
  fixedCity?: string,
  fixedCategory?: string,
) {
  const params = new URLSearchParams();
  const search = clean(filters.search, 120);
  const city = fixedCity ? "" : clean(filters.city, 120);
  const region = clean(filters.region, 80);
  const category = fixedCategory ? "" : clean(filters.category, 60);
  const attribute = clean(filters.attribute, 60);
  const ageMin = cleanAge(filters.ageMin);
  const ageMax = cleanAge(filters.ageMax);
  const sort = cleanSort(filters.sort);
  if (search) params.set("q", search);
  if (city) params.set("city", city);
  if (region) params.set("region", region);
  if (category) params.set("category", category);
  if (attribute) params.set("attribute", attribute);
  if (ageMin) params.set("minAge", ageMin);
  if (ageMax) params.set("maxAge", ageMax);
  if (filters.availableNow) params.set("available", "now");
  const priceMax = cleanPriceMax(filters.priceMax);
  const service = cleanOption(filters.service, serviceOptions);
  const place = cleanOption(filters.place, attendancePlaceOptions);
  if (priceMax) params.set("priceMax", priceMax);
  if (service) params.set("service", service);
  if (place) params.set("place", place);
  if (filters.verifiedOnly) params.set("verified", "1");
  if (sort !== "featured") params.set("sort", sort);
  if (filters.page > 0) params.set("page", String(filters.page + 1));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function cityPath(city: string) {
  return `/cidade/${encodeURIComponent(clean(city, 120))}`;
}

export function categoryPath(category: string) {
  return `/categoria/${encodeURIComponent(clean(category, 60))}`;
}
