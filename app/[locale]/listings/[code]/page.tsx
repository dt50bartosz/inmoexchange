// app/[locale]/listings/[code]/page.tsx
// One public property, by its platform code (/listings/KT-4821). No contact details.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";
import ListingDetail from "@/components/listings/ListingDetail";
import TrackView from "@/components/properties/TrackView";
import { LISTINGS_ROUTE } from "@/lib/constants/routes";
import { getPublicListing } from "@/lib/server/network";
import { trackListingEventAction } from "./server/actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const listing = await getPublicListing(decodeURIComponent(code));
  const t = await getTranslations("panel.properties");
  if (!listing) return { title: (await getTranslations("listings.detail"))("notFoundTitle"), robots: { index: false } };
  return { title: `${t("titleFormat", { type: t(`types.${listing.type}`), town: listing.town || t("noTown") })} · ${listing.code}` };
}

export default async function ListingPage({ params }: Props) {
  const { code } = await params;
  const listing = await getPublicListing(decodeURIComponent(code));

  if (!listing) {
    const t = await getTranslations("listings.detail");
    return (
      <Container className="max-w-xl py-24 text-center">
        <h1 className="text-xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("notFoundBody")}</p>
        <Link href={LISTINGS_ROUTE} className={`${buttonVariants({ variant: "outline" })} mt-6`}>
          {t("back")}
        </Link>
      </Container>
    );
  }
  return (
    <>
      {/* Counted for the listing agency after the page shows (once per visitor per day) */}
      <TrackView track={trackListingEventAction.bind(null, { code: listing.code, type: "view" })} />
      <ListingDetail listing={listing} />
    </>
  );
}
