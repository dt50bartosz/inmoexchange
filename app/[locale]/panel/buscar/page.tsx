// app/[locale]/panel/buscar/page.tsx
import SearchPage from "@/components/search/SearchPage";
import { parseSearchParams } from "@/lib/schemas/search";
import { checkLocationIds } from "@/lib/server/locations";
import { searchNetwork } from "@/lib/server/network";

export const dynamic = "force-dynamic";

// The filters are in the URL; every change re-renders this page on the server with new results.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parsed = parseSearchParams(await searchParams);
  // Location ids checked in the database (unknown ones are dropped); their names come from there too
  const { ids, places } = await checkLocationIds(parsed.filters.locations);
  const filters = { ...parsed.filters, locations: ids };
  const results = await searchNetwork(filters, parsed.page);
  return <SearchPage filters={filters} places={places} results={results} />;
}
