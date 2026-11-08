// app/[locale]/admin/promotores/[id]/promociones/page.tsx
import { redirect } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/admin";

/** The developer's developments are listed on its profile (Projects tab). */
export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect({ href: ADMIN_ROUTES.developer(id, "projects"), locale });
}
