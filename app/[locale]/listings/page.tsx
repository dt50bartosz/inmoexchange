// app/[locale]/listings/page.tsx
// Public property search (no login). Only properties, never agency or contact details.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ListingsPage from "@/components/listings/ListingsPage";
import { parseSearchParams } from "@/lib/schemas/search";
import { checkLocationIds } from "@/lib/server/locations";
import { searchPublicListings } from "@/lib/server/network";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("listings");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

// The filters are in the URL; every change re-renders this page on the server with new results.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parsed = parseSearchParams(await searchParams);
  // Location ids checked in the database (unknown ones are dropped); their names come from there too
  const { ids, places } = await checkLocationIds(parsed.filters.locations);
  const filters = { ...parsed.filters, locations: ids };
  const results = await searchPublicListings(filters, parsed.page);
  return <ListingsPage filters={filters} places={places} results={results} />;
}
