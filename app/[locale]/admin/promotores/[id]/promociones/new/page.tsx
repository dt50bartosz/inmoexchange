// app/[locale]/admin/promotores/[id]/promociones/new/page.tsx
import { connection } from "next/server";
import AdminProjectFormPage from "@/components/admin/developers/AdminProjectFormPage";
import EnglishOnly from "@/components/admin/ui/EnglishOnly";
import { loadAdminDeveloper } from "@/lib/server/admin/developments";

/** New development on the developer's behalf: saved as a draft, recorded as added by Colabora MLS. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // always read fresh data, never prerender at build
  const { id } = await params;
  const developer = await loadAdminDeveloper(id);
  return (
    <EnglishOnly>
      <AdminProjectFormPage developer={{ id: developer.id, name: developer.name }} project={null} unitCount={0} />
    </EnglishOnly>
  );
}
