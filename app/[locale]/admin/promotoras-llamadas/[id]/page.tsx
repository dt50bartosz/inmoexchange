import { connection } from "next/server";
import { notFound } from "next/navigation";
import EnglishOnly from "@/components/admin/ui/EnglishOnly";
import LeadDetail from "@/components/admin/developer-leads/LeadDetail";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { callGroup, findDeveloperLeadDoc, madridDay, toDeveloperLead } from "@/lib/server/admin/developer-leads";

type Props = { params: Promise<{ id: string }> };

/** Admin → Developer calls → one developer: all details, the full call history and "Log call". */
export default async function Page({ params }: Props) {
  await connection(); // always read fresh data, never prerender at build
  await requireAdmin();
  const { id } = await params;
  const doc = await findDeveloperLeadDoc(id);
  if (!doc) notFound();
  const lead = toDeveloperLead(doc);
  return (
    <EnglishOnly>
      <LeadDetail lead={lead} due={callGroup(lead, madridDay(new Date())) === 0} />
    </EnglishOnly>
  );
}
