import { Suspense } from "react";
import { connection } from "next/server";
import AdminPropertiesPage from "@/components/admin/properties/AdminPropertiesPage";
import { listAgencies } from "@/lib/server/admin/agencies";
import { listAllProperties, statsByProperty } from "@/lib/server/admin/properties";

export default async function Page() {
  await connection(); // always read fresh data, never prerender at build
  const [agencies, properties, stats] = await Promise.all([listAgencies(), listAllProperties(), statsByProperty()]);

  // Suspense is required because the page reads ?agency= from the URL
  return (
    <Suspense>
      <AdminPropertiesPage agencies={agencies} initialProperties={properties} stats={stats} />
    </Suspense>
  );
}
