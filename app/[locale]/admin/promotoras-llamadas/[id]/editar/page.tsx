import { connection } from "next/server";
import { notFound } from "next/navigation";
import EnglishOnly from "@/components/admin/ui/EnglishOnly";
import LeadForm from "@/components/admin/developer-leads/LeadForm";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { findDeveloperLeadDoc, toDeveloperLead, toMadridInput } from "@/lib/server/admin/developer-leads";

type Props = { params: Promise<{ id: string }> };

/** Admin → Developer calls → a developer → Edit. */
export default async function Page({ params }: Props) {
  await connection(); // always read fresh data, never prerender at build
  await requireAdmin();
  const { id } = await params;
  const doc = await findDeveloperLeadDoc(id);
  if (!doc) notFound();
  return (
    <EnglishOnly>
      <LeadForm lead={toDeveloperLead(doc)} nextCallInput={toMadridInput(doc.nextCallAt)} />
    </EnglishOnly>
  );
}
