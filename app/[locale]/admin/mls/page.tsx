import { connection } from "next/server";
import MlsMonitorPage from "@/components/admin/mls/MlsMonitorPage";
import { getMlsMonitor } from "@/lib/server/admin/mls";

/** Admin → MLS: network health, listing quality, stale listings, possible duplicates, by agency and by province. */
export default async function Page() {
  await connection(); // always read fresh data, never prerender at build
  const data = await getMlsMonitor();
  return <MlsMonitorPage data={data} />;
}
