import { connection } from "next/server";
import AgencyDetail from "@/components/admin/agencies/AgencyDetail";
import { agencyStats, getAgencyById, listAgencyFeeds, listAgencyProperties } from "@/lib/server/admin/agencies";

// Next.js 16: params is a Promise
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // always read fresh data, never prerender at build
  const { id } = await params;
  const [agency, feeds, properties, stats] = await Promise.all([getAgencyById(id), listAgencyFeeds(id), listAgencyProperties(id), agencyStats(id)]);
  return <AgencyDetail agency={agency} feeds={agency ? feeds : []} properties={agency ? properties : []} stats={stats} />;
}
