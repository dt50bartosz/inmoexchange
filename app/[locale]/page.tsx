import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Hero from "@/components/landing-mls/Hero";
import HowItWorks from "@/components/landing-mls/HowItWorks";
import Rules from "@/components/landing-mls/Rules";
import Features from "@/components/landing-mls/Features";
import Pricing from "@/components/landing-mls/Pricing";
import Faq from "@/components/landing-mls/Faq";
import FinalCta from "@/components/landing-mls/FinalCta";
import LandingFooter from "@/components/landing-mls/LandingFooter";

type Props = { params: Promise<{ locale: string }> };

// Spanish has no prefix (localePrefix "as-needed")
const pathFor = (locale: string) => (locale === "es" ? "/" : `/${locale}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing.meta" });
  const base = process.env.NEXT_PUBLIC_BASE_URL;

  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: { absolute: t("title") }, // already starts with "Colabora MLS"
    description: t("description"),
    alternates: {
      canonical: pathFor(locale),
      languages: { es: "/", en: "/en", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName: "Colabora MLS",
      title: t("title"),
      description: t("description"),
      url: pathFor(locale),
      locale: locale === "es" ? "es_ES" : "en_GB",
    },
  };
}

/** Public landing page (Colabora MLS). The site navbar and footer are hidden here: the page has its own. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Rules />
      <Features />
      <Pricing />
      <Faq />
      <FinalCta />
      <LandingFooter />
    </>
  );
}
