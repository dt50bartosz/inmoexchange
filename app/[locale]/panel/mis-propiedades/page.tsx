// app/[locale]/panel/mis-propiedades/page.tsx
import PropertiesPage from "@/components/properties/PropertiesPage";
import { getFeeds, getProperties, getPropertyStatsSummary } from "./server/actions";

export const dynamic = "force-dynamic";

// ?tab=feeds opens the import feeds tab (the dashboard's "Import XML" button); &add=1 also opens "Add XML feed" (sidebar)
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; add?: string }> }) {
  const [{ tab, add }, properties, feeds, stats] = await Promise.all([searchParams, getProperties(), getFeeds(), getPropertyStatsSummary()]);
  return (
    <PropertiesPage
      // A new key when the sidebar link changes the tab, so the page opens on it even if it is already showing
      key={`${tab ?? ""}-${add ?? ""}`}
      initialProperties={properties.ok ? properties.data : []}
      initialFeeds={feeds.ok ? feeds.data : []}
      stats={stats.ok ? stats.data : {}}
      initialTab={tab === "feeds" ? "feeds" : "properties"}
      initialAddFeed={tab === "feeds" && add === "1"}
    />
  );
}
