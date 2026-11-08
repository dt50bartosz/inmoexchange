"use client";

import { useTranslations } from "next-intl";
import { Bath, BedDouble, ImageOff, MapPin, Ruler } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { usePropertyFormat } from "@/components/properties/usePropertyFormat";
import { LISTINGS_ROUTE } from "@/lib/constants/routes";
import type { PublicListing } from "@/types/listings";

/**
 * A property on the public /listings page. No agency, no contact details.
 * `distance`: straight-line km from the searched place ("within X km" searches).
 */
export default function ListingCard({ listing: p, distance }: { listing: PublicListing; distance?: { km: number; place: string } }) {
  const t = useTranslations("panel.search");
  const tp = useTranslations("panel.properties");
  const f = usePropertyFormat();
  const photo = p.photos[0]?.url;

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff aria-hidden className="size-6" />
          </div>
        )}
        {p.condition === "newBuild" && <Badge className="absolute top-2 left-2">{tp("conditions.newBuild")}</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-lg font-semibold tabular-nums">{f.price(p.price)}</p>
        <h3 className="font-medium">
          {/* The link covers the whole card */}
          <Link href={`${LISTINGS_ROUTE}/${p.code}`} className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
            {f.title(p)}
          </Link>
        </h3>
        {distance && (
          <p className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            <MapPin aria-hidden className="size-4" />
            {t("card.kmFrom", { km: f.km(distance.km), place: distance.place })}
          </p>
        )}
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {p.type !== "plot" && (
            <>
              <span className="inline-flex items-center gap-1">
                <BedDouble aria-hidden className="size-4" />
                {t("card.beds", { n: p.bedrooms })}
              </span>
              <span className="inline-flex items-center gap-1">
                <Bath aria-hidden className="size-4" />
                {t("card.baths", { n: p.bathrooms })}
              </span>
            </>
          )}
          <span className="inline-flex items-center gap-1">
            <Ruler aria-hidden className="size-4" />
            {p.type === "plot" ? `${p.plotM2 ?? "–"} m²` : `${p.builtM2} m²`}
          </span>
        </p>
        <p className="mt-auto border-t pt-3 text-xs text-muted-foreground">{p.code}</p>
      </div>
    </article>
  );
}
