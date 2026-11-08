// app/[locale]/panel/perfil/page.tsx
// Old address of the security page; kept so existing links still work.
import { redirect } from "@/i18n/navigation";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/panel/security", locale });
}
