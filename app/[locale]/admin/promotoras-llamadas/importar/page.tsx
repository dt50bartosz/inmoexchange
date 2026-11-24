import EnglishOnly from "@/components/admin/ui/EnglishOnly";
import LeadImport from "@/components/admin/developer-leads/LeadImport";
import { requireAdmin } from "@/lib/server/admin/current-admin";

/** Admin → Developer calls → Import CSV: upload, preview with errors per row, then import (duplicates skipped). */
export default async function Page() {
  await requireAdmin();
  return (
    <EnglishOnly>
      <LeadImport />
    </EnglishOnly>
  );
}
