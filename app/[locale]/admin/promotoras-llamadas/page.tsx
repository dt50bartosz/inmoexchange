import { connection } from "next/server";
import DeveloperLeadsPage from "@/components/admin/developer-leads/DeveloperLeadsPage";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { callGroup, listDeveloperLeads, madridDay } from "@/lib/server/admin/developer-leads";

/** Admin → Developer calls: who to call next and on which number (personal data: admin only). */
export default async function Page() {
  await connection(); // always read fresh data, never prerender at build
  await requireAdmin();
  const today = madridDay(new Date());
  // Already in call order; "due" = callback / next call today or earlier (Spain time)
  const leads = (await listDeveloperLeads()).map((l) => ({ ...l, due: callGroup(l, today) === 0 }));
  return <DeveloperLeadsPage leads={leads} />;
}
