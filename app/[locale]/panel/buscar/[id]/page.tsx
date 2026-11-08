// app/[locale]/panel/buscar/[id]/page.tsx
import PropertyDetail from "@/components/search/PropertyDetail";
import TrackView from "@/components/properties/TrackView";
import { parseSearchParams, toSearchQuery } from "@/lib/schemas/search";
import { getNetworkProperty } from "@/lib/server/network";
import { trackNetworkEventAction } from "../server/actions";

export const dynamic = "force-dynamic";

// Next.js 16: params is a Promise. The URL keeps the search the card was opened from, for "Back to search".
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { filters, page } = parseSearchParams(await searchParams);
  const found = await getNetworkProperty(id);
  return (
    <>
      {/* The owner's stats count it (once per agency per day; never the owner's own views), after the page shows */}
      {found && <TrackView track={trackNetworkEventAction.bind(null, { propertyId: id, type: "view" })} />}
      <PropertyDetail property={found?.property ?? null} agency={found?.agency ?? null} searchQuery={toSearchQuery(filters, page)} />
    </>
  );
}
