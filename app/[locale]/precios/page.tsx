// app/[locale]/precios/page.tsx
// The pricing page was removed (2026-11-24): old links and bookmarks go to the home page.
import { redirect } from "@/i18n/navigation";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/", locale });
}
