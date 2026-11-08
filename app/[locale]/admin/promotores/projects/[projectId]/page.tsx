// app/[locale]/admin/promotores/projects/[projectId]/page.tsx
// Old address of a development (before it moved under its developer): sends old links and bookmarks on.
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
  redirect({ href: ADMIN_ROUTES.project(doc.developerId, projectId), locale });
}
