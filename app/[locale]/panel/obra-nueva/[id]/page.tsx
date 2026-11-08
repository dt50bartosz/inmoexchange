// app/[locale]/panel/obra-nueva/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Download, ExternalLink, FileText, Globe, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UnitStatusBadge } from "@/components/developer/UnitsTable";
import AgencyRegistrations from "@/components/new-builds/AgencyRegistrations";
import CollaborationText from "@/components/new-builds/CollaborationText";
import RegisterClientForm from "@/components/new-builds/RegisterClientForm";
import { requireRole } from "@/lib/server/auth/require-role";
import { getNewBuild, listAgencyRegistrations } from "@/lib/server/new-builds";
import { registerClientAction } from "./server/actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/** A draft, a deleted development or one of a suspended developer is a 404. */
async function load(id: string) {
  await requireRole("agency");
  const development = await getNewBuild(id);
  if (!development) notFound();
  return development;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load((await params).id);
  return { title: d.name };
}

export default async function NewBuildPage({ params }: Props) {
  const { id } = await params;
  const d = await load(id);
  const { accountId } = await requireRole("agency");
  const registrations = await listAgencyRegistrations(accountId, id);
  const t = await getTranslations("newBuilds");
  const tp = await getTranslations("Projects");
  const tt = await getTranslations("panel.properties.types");
  const tu = await getTranslations("units");
  const locale = await getLocale();
  const format = await getFormatter();
  const money = (n: number | null) => (n === null ? "—" : format.number(n, { style: "currency", currency: d.currency, maximumFractionDigits: 0 }));
  // The viewer's language first, the other one if that's all there is
  const lang = locale === "es" ? "es" : "en";
  const text = (v: { es: string; en: string }) => v[lang] || v[lang === "es" ? "en" : "es"];
  const description = text(d.description);
  const about = text(d.developer.description);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/panel/obra-nueva" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          {t("title")}
        </Link>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.developer.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{d.name}</h1>
        <p className="mt-1 inline-flex items-center gap-1 text-muted-foreground">
          <MapPin aria-hidden className="size-4" />
          {[d.address, d.town, d.province].filter(Boolean).join(", ")} · {tp(`statuses.${d.status}`)}
          {d.expectedCompletion && <> · {t("delivery", { date: format.dateTime(new Date(d.expectedCompletion), { month: "long", year: "numeric" }) })}</>}
        </p>
      </div>

      {d.images.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {d.images.slice(0, 8).map((img, i) => (
            <li key={img.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
              <a href={img.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" loading={i === 0 ? "eager" : "lazy"} className="aspect-[4/3] w-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          {description && (
            <section aria-labelledby="nb-description">
              <h2 id="nb-description" className="mb-2 text-lg font-semibold">{t("description")}</h2>
              <p className="whitespace-pre-line leading-7">{description}</p>
            </section>
          )}

          {d.amenities.length > 0 && (
            <section aria-labelledby="nb-amenities">
              <h2 id="nb-amenities" className="mb-2 text-lg font-semibold">{tp("fields.amenities")}</h2>
              <ul className="flex flex-wrap gap-2">
                {d.amenities.map((a) => (
                  <li key={a} className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">{tp(`amenities.${a}`)}</li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="nb-units">
            <h2 id="nb-units" className="mb-2 text-lg font-semibold">{t("units", { available: d.unitsAvailable ?? 0, total: d.units.length })}</h2>
            {d.units.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noUnits")}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">{tu("fields.reference")}</th>
                      <th scope="col" className="px-3 py-2 font-medium">{tu("fields.type")}</th>
                      <th scope="col" className="px-3 py-2 font-medium">{tu("columns.rooms")}</th>
                      <th scope="col" className="px-3 py-2 font-medium">{tu("columns.size")}</th>
                      <th scope="col" className="px-3 py-2 font-medium">{tu("fields.floor")}</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">{tu("fields.price")}</th>
                      <th scope="col" className="px-3 py-2 font-medium">{tu("fields.status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {d.units.map((u) => (
                      <tr key={u.id} className={u.status === "sold" ? "text-muted-foreground" : undefined}>
                        <th scope="row" className="px-3 py-2 text-left font-medium">{u.reference}</th>
                        <td className="px-3 py-2">{tt(u.type)}</td>
                        <td className="px-3 py-2 tabular-nums">{tu("columns.roomsValue", { beds: u.bedrooms, baths: u.bathrooms })}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {u.builtM2 !== null ? `${format.number(u.builtM2)} m²` : "—"}
                          {u.terraceM2 ? ` + ${format.number(u.terraceM2)} m² ${tu("columns.terrace")}` : ""}
                          {u.plotM2 ? ` · ${tu("fields.plotM2")}: ${format.number(u.plotM2)}` : ""}
                        </td>
                        <td className="px-3 py-2">
                          {u.floor || "—"}
                          {u.orientation ? ` · ${tu(`orientations.${u.orientation}`)}` : ""}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(u.price)}</td>
                        <td className="px-3 py-2"><UnitStatusBadge status={u.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="nb-register" className="rounded-xl border bg-card p-5">
            <h2 id="nb-register" className="mb-3 text-lg font-semibold">{t("register.title")}</h2>
            <RegisterClientForm developmentId={d.id} protectionDays={d.protectionDays} register={registerClientAction.bind(null, d.id)} />
          </section>

          <section aria-labelledby="nb-my-registrations" className="space-y-3">
            <h2 id="nb-my-registrations" className="text-lg font-semibold">{t("myRegistrationsHere")}</h2>
            <AgencyRegistrations registrations={registrations} />
          </section>
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="nb-terms" className="rounded-xl border border-success/30 bg-success-soft p-5">
            <h2 id="nb-terms" className="text-sm font-semibold uppercase tracking-wide text-success">{t("terms")}</h2>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              <CollaborationText c={d.collaboration} />
            </p>
            {d.collaboration.paymentTerms && <p className="mt-2 whitespace-pre-line text-sm">{d.collaboration.paymentTerms}</p>}
            {d.collaboration.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{d.collaboration.notes}</p>}
            <p className="mt-3 text-sm">{t("protection", { days: d.protectionDays })}</p>
            <p className="mt-3 text-xs text-muted-foreground">{t("termsNote")}</p>
          </section>

          {d.documents.length > 0 && (
            <section aria-labelledby="nb-documents" className="rounded-xl border bg-card p-5">
              <h2 id="nb-documents" className="mb-3 font-semibold">{t("documents")}</h2>
              <ul className="space-y-2">
                {d.documents.map((doc) => (
                  <li key={doc.id}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
                      <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{doc.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {tp(`documents.kinds.${doc.kind}`)} · PDF · {format.number(doc.size / 1024 / 1024, { maximumFractionDigits: 1 })} MB
                        </span>
                      </span>
                      <Download aria-hidden className="size-4 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="nb-developer" className="rounded-xl border bg-card p-5">
            <h2 id="nb-developer" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("developer")}</h2>
            <div className="flex items-center gap-3">
              {d.developer.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.developer.logo} alt="" className="size-12 rounded border bg-white object-contain" />
              ) : (
                <span aria-hidden className="flex size-12 items-center justify-center rounded border bg-muted font-semibold">{d.developer.name[0]}</span>
              )}
              <p className="font-semibold">{d.developer.name}</p>
            </div>
            {about && <p className="mt-3 line-clamp-6 whitespace-pre-line text-sm text-muted-foreground">{about}</p>}
            <ul className="mt-3 space-y-1.5 text-sm">
              {d.developer.contactPerson && <li>{d.developer.contactPerson}</li>}
              {d.developer.phone && (
                <li>
                  <a href={`tel:${d.developer.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 hover:underline">
                    <Phone aria-hidden className="size-4" />
                    {d.developer.phone}
                  </a>
                </li>
              )}
              {d.developer.email && (
                <li>
                  <a href={`mailto:${d.developer.email}`} className="inline-flex items-center gap-2 break-all hover:underline">
                    <Mail aria-hidden className="size-4" />
                    {d.developer.email}
                  </a>
                </li>
              )}
              {d.developer.website && (
                <li>
                  <a href={d.developer.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline">
                    <Globe aria-hidden className="size-4" />
                    {d.developer.website.replace(/^https?:\/\//, "")}
                    <ExternalLink aria-hidden className="size-3" />
                  </a>
                </li>
              )}
            </ul>
          </section>

          {(d.mapsUrl || (d.latitude !== null && d.longitude !== null)) && (
            <a
              href={d.mapsUrl || `https://www.google.com/maps?q=${d.latitude},${d.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm font-medium hover:bg-accent"
            >
              <MapPin aria-hidden className="size-4" />
              {t("map")}
              <ExternalLink aria-hidden className="ml-auto size-3.5" />
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
