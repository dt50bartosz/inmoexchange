// app/[locale]/admin/promotores/[id]/promociones/[developmentId]/editar/page.tsx
import { connection } from "next/server";
import AdminProjectFormPage from "@/components/admin/developers/AdminProjectFormPage";
import EnglishOnly from "@/components/admin/ui/EnglishOnly";
import { loadAdminDevelopment } from "@/lib/server/admin/developments";
import { toProject } from "@/lib/server/developer/developments";

type Props = { params: Promise<{ id: string; developmentId: string }> };

/** The developer's own development form (shared), saved as made by an admin. */
export default async function Page({ params }: Props) {
  await connection(); // always read fresh data, never prerender at build
  const { id, developmentId } = await params;
  const { developer, development, unitCount } = await loadAdminDevelopment(id, developmentId);
  return (
    <EnglishOnly>
      <AdminProjectFormPage developer={developer} project={toProject(development)} unitCount={unitCount} />
    </EnglishOnly>
  );
}
