export const DISCOVERY_PAGE_SIZE = 12;

export type DiscoveryFilters = {
  search: string;
  city: string;
  category: string;
  page: number;
};

function clean(value: string | null, max: number) {
  return (value ?? "").trim().slice(0, max);
}

export function parseDiscoverySearch(
  searchString: string,
  fixedCity?: string,
  fixedCategory?: string,
): DiscoveryFilters {
  const params = new URLSearchParams(searchString.startsWith("?") ? searchString : `?${searchString}`);
  const parsedPage = Number(params.get("page") || "1");
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0
    ? Math.min(parsedPage - 1, 833)
    : 0;
  return {
    search: clean(params.get("q"), 120),
    city: fixedCity ? clean(fixedCity, 120) : clean(params.get("city"), 120),
    category: fixedCategory ? clean(fixedCategory, 60) : clean(params.get("category"), 60),
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
  const category = fixedCategory ? "" : clean(filters.category, 60);
  if (search) params.set("q", search);
  if (city) params.set("city", city);
  if (category) params.set("category", category);
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
