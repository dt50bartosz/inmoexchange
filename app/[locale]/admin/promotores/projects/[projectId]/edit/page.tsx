// app/[locale]/admin/promotores/projects/[projectId]/edit/page.tsx
// Old address of the edit form: sends old links and bookmarks on.
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { findProjectDoc } from "@/lib/server/developer/developments";

export default async function Page({ params }: { params: Promise<{ locale: string; projectId: string }> }) {
  await requireAdmin();
  const { locale, projectId } = await params;
  const doc = await findProjectDoc(projectId);
  if (!doc) notFound();
  redirect({ href: ADMIN_ROUTES.editProject(doc.developerId, projectId), locale });
}
