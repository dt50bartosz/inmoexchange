// app/[locale]/panel/mis-propiedades/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import PropertyForm from "@/components/properties/form/PropertyForm";
import PropertyStats from "@/components/properties/form/PropertyStats";
import { StoreProvider } from "@/components/properties/store";
import { getFeeds, getProperty, getPropertyStatsAction } from "../../server/actions";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [property, feeds, stats] = await Promise.all([getProperty(id), getFeeds(), getPropertyStatsAction(id)]);

  // Not found, or it belongs to another agency
  if (!property.ok) notFound();

  return (
    <StoreProvider properties={[property.data]} feeds={feeds.ok ? feeds.data : []}>
      <PropertyForm property={property.data} stats={stats.ok ? <PropertyStats stats={stats.data} /> : null} />
    </StoreProvider>
  );
}
