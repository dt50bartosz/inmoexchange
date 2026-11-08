// app/[locale]/promotoras/page.tsx
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { getTranslations } from "next-intl/server";
import DevHeader from "@/components/developers-landing/DevHeader";
import DevHero from "@/components/developers-landing/DevHero";
import OfferBand from "@/components/developers-landing/OfferBand";
import Benefits from "@/components/developers-landing/Benefits";
import DevHowItWorks from "@/components/developers-landing/DevHowItWorks";
import DevFaq from "@/components/developers-landing/DevFaq";
import ApplySection from "@/components/developers-landing/ApplySection";
import DevFooter from "@/components/developers-landing/DevFooter";
import ApplicationForm from "./application-form";

// Headings font for this page only (globals.css: --font-display)
const grotesk = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-space-grotesk", display: "swap" });

type Props = { params: Promise<{ locale: string }> };

// Spanish has no prefix (localePrefix "as-needed")
const pathFor = (locale: string) => (locale === "es" ? "/promotoras" : `/${locale}/promotoras`);
const OG_LOCALE: Record<string, string> = { es: "es_ES", en: "en_GB", pl: "pl_PL" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "developersLanding.meta" });
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: pathFor(locale),
      languages: { es: pathFor("es"), en: pathFor("en"), pl: pathFor("pl"), "x-default": pathFor("es") },
    },
    openGraph: {
      type: "website",
      siteName: "Colabora MLS",
      title: t("title"),
      description: t("description"),
      url: pathFor(locale),
      locale: OG_LOCALE[locale] ?? "es_ES",
    },
  };
}

/** Public "Para promotoras" page. Has its own header and footer (the site ones are hidden by PublicOnly). */
export default function DevelopersPage() {
  return (
    <div className={`${grotesk.variable} bg-white text-dev-ink`}>
      <DevHeader />
      <DevHero />
      <OfferBand />
      <Benefits />
      <DevHowItWorks />
      <DevFaq />
      <ApplySection>
        <ApplicationForm />
      </ApplySection>
      <DevFooter />
    </div>
  );
}
