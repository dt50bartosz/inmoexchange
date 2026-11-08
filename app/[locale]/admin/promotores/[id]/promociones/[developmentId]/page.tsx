// app/[locale]/admin/promotores/[id]/promociones/[developmentId]/page.tsx
import { connection } from "next/server";
import ProjectDetail from "@/components/admin/developers/ProjectDetail";
import EnglishOnly from "@/components/admin/ui/EnglishOnly";
import { collections } from "@/lib/db";
import { listDeveloperNotes, listProjectActivity } from "@/lib/server/admin/developers";
import { loadAdminDevelopment } from "@/lib/server/admin/developments";
import { toProject } from "@/lib/server/developer/developments";

type Props = { params: Promise<{ id: string; developmentId: string }> };

export default async function Page({ params }: Props) {
  await connection(); // always read fresh data, never prerender at build
  const { id, developmentId } = await params;
  const { developer, development, unitCount } = await loadAdminDevelopment(id, developmentId);
  const [activity, notes, registrationCount] = await Promise.all([
    listProjectActivity(developmentId),
    listDeveloperNotes(id, developmentId),
    collections.clientRegistrations.countDocuments({ developerId: id, developmentId }),
  ]);
  return (
    <EnglishOnly>
      <ProjectDetail
        project={toProject(development)}
        developer={developer}
        unitCount={unitCount}
        registrationCount={registrationCount}
        activity={activity}
        notes={notes}
      />
    </EnglishOnly>
  );
}
