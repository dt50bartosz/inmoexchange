"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Bath, BedDouble, ChevronDown, ImageOff, MapPin, Pencil, Ruler } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/lib/constants/routes";
import { reducedFrom } from "@/lib/schemas/property";
import type { NetworkAgency, NetworkProperty } from "@/types/search";
import { usePropertyFormat } from "@/components/properties/usePropertyFormat";
import AgencyContact from "./AgencyContact";

/** `searchQuery`: the search the card is shown in ("?town=…&page=2"), so the detail page can link back to it. */
/** `distance`: straight-line km from the searched place ("within X km" searches). */
type Props = { property: NetworkProperty; agency?: NetworkAgency; searchQuery?: string; distance?: { km: number; place: string } };

export default function PropertyCard({ property: p, agency, searchQuery = "", distance }: Props) {
  const t = useTranslations("panel.search");
  const tp = useTranslations("panel.properties");
  const f = usePropertyFormat();
  const was = reducedFrom(p);
  const photo = p.photos[0]?.url;
  const title = f.title(p);
  const [showContact, setShowContact] = useState(false);
  const contactId = useId();

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/9] bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff aria-hidden className="size-6" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {p.own && <Badge variant="secondary">{t("card.own")}</Badge>}
          {p.condition === "newBuild" && <Badge>{tp("conditions.newBuild")}</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-lg font-semibold tabular-nums">{f.price(p.price)}</p>
          {was !== null && (
            <p className="text-sm text-muted-foreground">
              <span className="sr-only">{tp("list.reducedFrom")} </span>
              <s className="tabular-nums">{f.price(was)}</s>
            </p>
          )}
        </div>

        <h3 className="font-medium">
          {/* The link covers the whole card */}
          <Link href={`${ROUTES.searchProperty(p.id)}${searchQuery}`} className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
            {title}
          </Link>
        </h3>
        <p className="-mt-1.5 text-xs text-muted-foreground">{p.code}</p>
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

        <div className="mt-auto border-t pt-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-muted-foreground">{agency?.name ?? t("card.unknownAgency")}</span>
            {p.commission && <span className="shrink-0 font-medium">{t("card.commission", { split: p.commission })}</span>}
          </div>

          {p.own ? (
            // Above the card-wide link
            <Link
              href={ROUTES.editProperty(p.id)}
              className="relative z-10 mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pencil aria-hidden className="size-4" />
              {t("card.edit")}
            </Link>
          ) : agency && (
            // Above the card-wide link, so these clicks don't open the property
            <div className="relative z-10 mt-2">
              <button
                type="button"
                aria-expanded={showContact}
                aria-controls={contactId}
                aria-label={showContact ? t("card.hideContact") : t("card.showContactLabel", { agency: agency.name })}
                onClick={() => setShowContact((v) => !v)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showContact ? t("card.hideContact") : t("card.showContact")}
                <ChevronDown aria-hidden className={`size-4 transition-transform ${showContact ? "rotate-180" : ""}`} />
              </button>
              {showContact && (
                <div id={contactId} className="mt-2 rounded-md bg-muted/40 p-2.5">
                  <AgencyContact agency={agency} property={{ id: p.id, code: p.code }} compact />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
