"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bath, BedDouble, CalendarCheck, Heart, Mail, MapPin, MessageCircle, Phone, Ruler, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import AgencyAvatar from "@/components/agency/AgencyAvatar";
import { usePropertyFormat } from "@/components/properties/usePropertyFormat";
import { useTrackWhenSeen } from "@/components/properties/TrackView";
import BookViewingButton from "@/components/properties/BookViewingButton";
import { whatsappHref } from "@/lib/utils";
import type { PublicAgency, PublicClientPage, PublicProperty, Reaction } from "@/types/client-pages";
import { trackClientPageEventAction, updateItemAction } from "@/app/p/[token]/server/actions";

/** This page's own address, for the WhatsApp message (empty when the site address isn't configured). */
const pageUrl = (token: string) => {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}/p/${token}` : "";
};

type Props = { token: string; page: PublicClientPage };

/** The client's shortlist. The only contact details on it are the agency that shared it. */
export default function ClientShortlist({ token, page }: Props) {
  const { agency, properties } = page;
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <header className="flex items-center gap-3 border-b pb-5">
        <AgencyAvatar logoUrl={agency.logoUrl} name={agency.name} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{agency.name}</p>
          {agency.website && (
            <a href={agency.website} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-muted-foreground hover:underline">
              {agency.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h1 className="text-xl font-semibold tracking-tight">
              {page.buyerFirstName ? `${page.buyerFirstName}, your shortlist` : "Your shortlist"}
            </h1>
            {page.welcomeMessage && <p className="mt-2 whitespace-pre-line text-muted-foreground">{page.welcomeMessage}</p>}
          </section>

          {properties.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">
              There are no properties on this page right now. {agency.contactPerson || agency.name} will add some soon.
            </p>
          ) : (
            <ol className="space-y-6">
              {properties.map((p, i) => (
                <li key={p.id}>
                  <PropertyCard token={token} property={p} n={i + 1} agency={agency} />
                </li>
              ))}
            </ol>
          )}
        </main>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <ContactCard agency={agency} />
        </aside>
      </div>
    </div>
  );
}

function ContactCard({ agency }: { agency: PublicAgency }) {
  const wa = whatsappHref(agency.whatsapp);
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">Your contact</p>
      <p className="mt-2 font-semibold">{agency.contactPerson || agency.name}</p>
      {agency.contactPerson && <p className="text-sm text-muted-foreground">{agency.name}</p>}
      <div className="mt-4 grid gap-2">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={`${buttonVariants()} justify-start`}>
            <MessageCircle aria-hidden className="size-4" />
            WhatsApp
          </a>
        )}
        {agency.phone && (
          <a href={`tel:${agency.phone.replace(/\s/g, "")}`} className={`${buttonVariants({ variant: wa ? "outline" : "default" })} justify-start`}>
            <Phone aria-hidden className="size-4" />
            {agency.phone}
          </a>
        )}
        {agency.email && (
          <a href={`mailto:${agency.email}`} className={`${buttonVariants({ variant: "outline" })} justify-start`}>
            <Mail aria-hidden className="size-4" />
            <span className="truncate">{agency.email}</span>
          </a>
        )}
      </div>
    </div>
  );
}

function PropertyCard({ token, property: p, n, agency }: { token: string; property: PublicProperty; n: number; agency: PublicAgency }) {
  const tp = useTranslations("panel.properties");
  const f = usePropertyFormat();
  const [photo, setPhoto] = useState(0);
  const [reaction, setReaction] = useState<Reaction | null>(p.reaction);
  const [comment, setComment] = useState(p.clientComment);
  const [savedComment, setSavedComment] = useState(p.clientComment);
  const [viewing, setViewing] = useState(p.viewingRequested);
  const [busy, setBusy] = useState(false);
  // A view counts when the client has really seen the card (half of it on screen), once
  const cardRef = useRef<HTMLElement>(null);
  useTrackWhenSeen(cardRef, () => trackClientPageEventAction(token, { propertyId: p.id, type: "view" }));

  const send = async (patch: { reaction?: Reaction | null; clientComment?: string; requestViewing?: true }) => {
    setBusy(true);
    const res = await updateItemAction(token, { propertyId: p.id, ...patch }).catch(() => undefined);
    setBusy(false);
    if (!res?.ok) {
      toast.error(res?.error === "rate_limited" ? "Too many changes. Wait a few minutes." : "That didn't save. Try again.");
      return false;
    }
    return true;
  };

  const react = async (r: Reaction) => {
    const next = reaction === r ? null : r;
    if (await send({ reaction: next })) setReaction(next);
  };
  const saveComment = async () => {
    if (await send({ clientComment: comment.trim() })) {
      setSavedComment(comment.trim());
      toast.success(`Sent to ${agency.contactPerson || agency.name}.`);
    }
  };
  const requestViewing = async () => {
    if (await send({ requestViewing: true, ...(comment.trim() !== savedComment ? { clientComment: comment.trim() } : {}) })) {
      setViewing(true);
      setSavedComment(comment.trim());
      toast.success(`${agency.contactPerson || agency.name} will contact you to arrange it.`);
    }
  };

  const current = p.photos[photo] ?? p.photos[0];
  const description = p.description.en || p.description.es || p.description.pl;
  const place = [p.address, p.town, p.province].filter(Boolean).join(", ");

  return (
    <article ref={cardRef} className={`overflow-hidden rounded-xl border bg-card ${reaction === "rejected" ? "opacity-60" : ""}`}>
      <div className="relative aspect-[16/10] bg-muted">
        {current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={`${f.title(p)}, photo ${photo + 1} of ${p.photos.length}`} className="h-full w-full object-cover" />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-0.5 text-sm font-medium tabular-nums">{n}</span>
        {p.condition === "newBuild" && <Badge className="absolute top-3 right-3">{tp("conditions.newBuild")}</Badge>}
      </div>
      {p.photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2" role="group" aria-label="Photos">
          {p.photos.map((ph, i) => (
            <button
              key={ph.id}
              type="button"
              onClick={() => setPhoto(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={i === photo}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === photo ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4 p-5">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{f.title(p)}</h2>
            <p className="text-xl font-semibold tabular-nums">{f.price(p.price)}</p>
          </div>
          {p.code && <p className="text-xs text-muted-foreground">Ref. {p.code}</p>}
          {place && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin aria-hidden className="size-4" />
              {place}
            </p>
          )}
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {p.type !== "plot" && (
              <>
                <span className="inline-flex items-center gap-1">
                  <BedDouble aria-hidden className="size-4" />
                  {p.bedrooms} bed
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bath aria-hidden className="size-4" />
                  {p.bathrooms} bath
                </span>
              </>
            )}
            <span className="inline-flex items-center gap-1">
              <Ruler aria-hidden className="size-4" />
              {p.type === "plot" ? `${p.plotM2 ?? "–"} m² plot` : `${p.builtM2} m²${p.plotM2 ? ` · ${p.plotM2} m² plot` : ""}`}
            </span>
          </p>
        </div>

        {p.agentComment && (
          <p className="rounded-lg bg-primary/5 p-3 text-sm">
            <span className="font-medium">{agency.contactPerson || agency.name}:</span> {p.agentComment}
          </p>
        )}

        {p.features.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {p.features.map((k) => (
              <li key={k}>
                <Badge variant="secondary">{tp(`features.${k}`)}</Badge>
              </li>
            ))}
          </ul>
        )}

        {description && <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{description}</p>}

        {/* Straight to the agent who shared the page (never the listing agency) */}
        <BookViewingButton
          number={agency.whatsapp}
          label="Book a viewing on WhatsApp"
          message={`Hi, I'd like to book a viewing for property${p.code ? ` ref. ${p.code}` : ""} – ${tp(`types.${p.type}`)}, ${p.town || tp("noTown")}. ${pageUrl(token)}`.trim()}
          onTrack={() => trackClientPageEventAction(token, { propertyId: p.id, type: "whatsapp_click" })}
        />

        {/* What the client thinks: goes to the agency */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={reaction === "liked" ? "default" : "outline"} aria-pressed={reaction === "liked"} disabled={busy} onClick={() => react("liked")}>
              <Heart aria-hidden className={`size-4 ${reaction === "liked" ? "fill-current" : ""}`} />
              {reaction === "liked" ? "You like this" : "I like it"}
            </Button>
            <Button type="button" variant={reaction === "rejected" ? "secondary" : "ghost"} aria-pressed={reaction === "rejected"} disabled={busy} onClick={() => react("rejected")}>
              <ThumbsDown aria-hidden className="size-4" />
              Not for me
            </Button>
          </div>
          <div>
            <label htmlFor={`c-${p.id}`} className="mb-1 block text-sm font-medium">
              A note for {agency.contactPerson || agency.name}
            </label>
            <Textarea id={`c-${p.id}`} rows={2} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Questions, what you like or don't…" />
            <div className="mt-2 flex flex-wrap gap-2">
              {comment.trim() !== savedComment && (
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={saveComment}>
                  Send note
                </Button>
              )}
              {viewing ? (
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-success" role="status">
                  <CalendarCheck aria-hidden className="size-4" />
                  Viewing requested
                </p>
              ) : (
                <Button type="button" size="sm" disabled={busy} onClick={requestViewing}>
                  <CalendarCheck aria-hidden className="size-4" />
                  Request a viewing
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
