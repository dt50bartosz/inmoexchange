// app/[locale]/contacto/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CONTACT_ROLES, type ContactRole } from "@/lib/schemas/contact";
import ContactForm from "./contact-form";

type Props = { searchParams: Promise<{ soy?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: t("title"), description: t("metaDescription") };
}

/** Public contact form. "?soy=developer" (from the FAQ) pre-selects "I am…". */
export default async function ContactPage({ searchParams }: Props) {
  const { soy } = await searchParams;
  const role = CONTACT_ROLES.find((r) => r === soy) as ContactRole | undefined;
  return <ContactForm initialRole={role} />;
}
