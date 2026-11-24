import EnglishOnly from "@/components/admin/ui/EnglishOnly";
import LeadForm from "@/components/admin/developer-leads/LeadForm";
import { requireAdmin } from "@/lib/server/admin/current-admin";

/** Admin → Developer calls → Add developer. */
export default async function Page() {
  await requireAdmin();
  return (
    <EnglishOnly>
      <LeadForm lead={null} />
    </EnglishOnly>
  );
}
