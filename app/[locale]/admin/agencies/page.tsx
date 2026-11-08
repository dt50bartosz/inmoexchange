import { connection } from "next/server";
import AgenciesPage from "@/components/admin/agencies/AgenciesPage";
import { countsByAgency, listAgencies } from "@/lib/server/admin/agencies";

export default async function Page() {
  await connection(); // always read fresh data, never prerender at build
  const [agencies, counts] = await Promise.all([listAgencies(), countsByAgency()]);
  return <AgenciesPage agencies={agencies} feedCounts={counts.feeds} propertyCounts={counts.activeProperties} stats={counts.stats} />;
}
