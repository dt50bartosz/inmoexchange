"use client";

import { useTranslations } from "next-intl";
import { Globe, Mail, MapPin, MessageCircle, Phone, User } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import type { NetworkAgency } from "@/types/search";
import { recordContactAction } from "@/app/[locale]/panel/buscar/server/actions";
import { whatsappHref } from "@/lib/utils";

type Props = {
  agency: NetworkAgency;
  /** The property being asked about: used in the WhatsApp / email text and counted as a contact. */
  property: { id: string; code: string };
  /** Smaller buttons, for the search card. */
  compact?: boolean;
  /** The detail page shows "Book a viewing on WhatsApp" instead. */
  hideWhatsapp?: boolean;
};

/**
 * The listing agency's contact details, for logged-in agencies only (Search card and detail page).
 * Never used on public pages. Phone, WhatsApp and email clicks count as a contact on the owner's dashboard.
 */
export default function AgencyContact({ agency, property, compact, hideWhatsapp }: Props) {
  const t = useTranslations("panel.search.detail");
  // Fire and forget: the link opens either way
  const contacted = () => void recordContactAction(property.id).catch(() => {});
  const size = compact ? "sm" : "default";
  const wa = hideWhatsapp ? null : whatsappHref(agency.whatsapp, t("whatsappText", { ref: property.code }));
  const hasAny = agency.phone || agency.whatsapp || agency.email || agency.website || agency.address;

  return (
    <div className={`grid ${compact ? "gap-1.5 text-xs" : "gap-2 text-sm"}`}>
      {agency.contactPerson && (
        <p className="flex items-center gap-1.5">
          <User aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">{t("contact")}:</span> <span className="font-medium">{agency.contactPerson}</span>
        </p>
      )}
      {agency.phone && (
        <a href={`tel:${agency.phone.replace(/\s/g, "")}`} onClick={contacted} className={`${buttonVariants({ size })} justify-start`}>
          <Phone aria-hidden className="size-4" />
          {agency.phone}
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={contacted}
          className={`${buttonVariants({ variant: "outline", size })} justify-start`}
        >
          <MessageCircle aria-hidden className="size-4" />
          {t("whatsapp")} · {agency.whatsapp}
        </a>
      )}
      {agency.email && (
        <a
          href={`mailto:${agency.email}?subject=${encodeURIComponent(t("emailSubject", { ref: property.code }))}`}
          onClick={contacted}
          className={`${buttonVariants({ variant: "outline", size })} justify-start`}
        >
          <Mail aria-hidden className="size-4" />
          <span className="truncate">{agency.email}</span>
        </a>
      )}
      {agency.website && (
        <a href={agency.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline">
          <Globe aria-hidden className="size-4 shrink-0" />
          <span className="sr-only">{t("website")}: </span>
          <span className="truncate">{agency.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
        </a>
      )}
      {agency.address && (
        <p className="flex items-start gap-1.5 text-muted-foreground">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="sr-only">{t("office")}: </span>
            {agency.address}
          </span>
        </p>
      )}
      {!hasAny && <p className="text-muted-foreground">{t("noContactDetails")}</p>}
    </div>
  );
}
