"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePropertyFormat } from "@/components/properties/usePropertyFormat";
import { langLabel, orderedLangs, type LangCode } from "@/lib/constants/languages";
import { LISTINGS_ROUTE } from "@/lib/constants/routes";
import type { PublicListing } from "@/types/listings";

/**
 * A public property page. Only the property: no agency, no phone, email or WhatsApp, no address.
 * Agencies are pointed to /join instead.
 */
export default function ListingDetail({ listing: p }: { listing: PublicListing }) {
  const t = useTranslations("panel.search");
  const tp = useTranslations("panel.properties");
  const to = useTranslations("panel.options");
  const tl = useTranslations("listings.detail");
  const f = usePropertyFormat();
  const [photoIndex, setPhotoIndex] = useState(0);

  const photo = p.photos[photoIndex] ?? p.photos[0];
  const text = (c: LangCode) => (p.description as Partial<Record<LangCode, string>>)[c];
  const langs = orderedLangs(p.description).filter((c) => text(c)?.trim());

  const details: [string, ReactNode][] = [
    [tp("form.fields.type"), tp(`types.${p.type}`)],
    [tp("form.fields.condition"), tp(`conditions.${p.condition}`)],
    [tp("form.fields.area"), to(`regions.${p.area}`)],
    ...(p.type !== "plot"
      ? ([
          [tp("form.fields.bedrooms"), p.bedrooms],
          [tp("form.fields.bathrooms"), p.bathrooms],
          [tp("form.fields.builtM2"), `${p.builtM2} m²`],
        ] as [string, ReactNode][])
      : []),
    ...(p.plotM2 ? ([[tp("form.fields.plotM2"), `${p.plotM2} m²`]] as [string, ReactNode][]) : []),
    ...(p.yearBuilt ? ([[tp("form.fields.yearBuilt"), p.yearBuilt]] as [string, ReactNode][]) : []),
    ...(p.energyRating
      ? ([[tp("form.fields.energyRating"), p.energyRating === "inProgress" ? tp("energy.inProgress") : p.energyRating]] as [string, ReactNode][])
      : []),
  ];

  return (
    <Container className="pb-24 pt-8">
      <Link href={LISTINGS_ROUTE} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden className="size-4" />
        {tl("back")}
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-8">
          <div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt={t("detail.photoAlt", { n: photoIndex + 1, total: p.photos.length })} className="h-full w-full object-cover" />
              )}
              {p.condition === "newBuild" && <Badge className="absolute top-3 left-3">{tp("conditions.newBuild")}</Badge>}
            </div>
            {p.photos.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("detail.photos")}>
                {p.photos.map((ph, i) => (
                  <button
                    key={ph.url}
                    type="button"
                    onClick={() => setPhotoIndex(i)}
                    aria-label={t("detail.showPhoto", { n: i + 1 })}
                    aria-pressed={i === photoIndex}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      i === photoIndex ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <header>
            <p className="text-sm text-muted-foreground">{tl("reference", { code: p.code })}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{f.title(p)}</h1>
            <p className="mt-1 inline-flex items-center gap-1 text-muted-foreground">
              <MapPin aria-hidden className="size-4" />
              {[p.town, p.province].filter(Boolean).join(", ")}
            </p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{f.price(p.price)}</p>
          </header>

          <section aria-labelledby="details-heading">
            <h2 id="details-heading" className="mb-3 text-lg font-semibold">
              {t("detail.details")}
            </h2>
            <dl className="grid gap-x-8 gap-y-2 rounded-xl border p-4 text-sm sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b py-1.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {p.features.length > 0 && (
            <section aria-labelledby="features-heading">
              <h2 id="features-heading" className="mb-3 text-lg font-semibold">
                {t("detail.features")}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {p.features.map((k) => (
                  <li key={k}>
                    <Badge variant="secondary">{tp(`features.${k}`)}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {langs.length > 0 && (
            <section aria-labelledby="desc-heading">
              <h2 id="desc-heading" className="mb-3 text-lg font-semibold">
                {t("detail.description")}
              </h2>
              {langs.length === 1 ? (
                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{text(langs[0])}</p>
              ) : (
                <Tabs defaultValue={langs[0]}>
                  <TabsList>
                    {langs.map((c) => (
                      <TabsTrigger key={c} value={c}>
                        {langLabel(c)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {langs.map((c) => (
                    <TabsContent key={c} value={c} className="pt-3">
                      <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{text(c)}</p>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </section>
          )}
        </div>

        {/* No contact details on public pages: agencies are invited to join instead */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border bg-card p-5">
            <p className="font-semibold">{tl("agencyTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{tl("agencyBody")}</p>
            <Link href="/registro" className={`${buttonVariants()} mt-4 w-full`}>
              {tl("agencyCta")}
            </Link>
          </div>
        </aside>
      </div>
    </Container>
  );
}
