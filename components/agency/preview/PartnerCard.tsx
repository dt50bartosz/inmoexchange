"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import AgencyAvatar from "../AgencyAvatar";
import InfoRow from "./InfoRow";
import type { AgencyFormValues } from "@/lib/schemas/agency";

export default function PartnerCard({ agency }: { agency: AgencyFormValues }) {
  const t = useTranslations("panel.agency.preview");
  const to = useTranslations("panel.options");
  const place = [agency.town, agency.province].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-4 border-b p-5">
        <AgencyAvatar logoUrl={agency.logoUrl} name={agency.name} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{agency.name || t("agencyName")}</p>
          {place && <p className="truncate text-sm text-muted-foreground">{place}</p>}
        </div>
      </div>
      <div className="space-y-4 p-5 text-sm">
        {agency.regions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agency.regions.map((r) => (
              <Badge key={r} variant="secondary">
                {to(`regions.${r}`)}
              </Badge>
            ))}
          </div>
        )}
        <dl className="space-y-1.5">
          {agency.contactPerson && <InfoRow label={t("contact")} value={agency.contactPerson} />}
          {agency.phone && <InfoRow label={t("phone")} value={agency.phone} />}
          {agency.email && <InfoRow label={t("email")} value={agency.email} />}
          {agency.spokenLanguages.length > 0 && (
            <InfoRow label={t("speaks")} value={agency.spokenLanguages.map((l) => to(`spokenLanguages.${l}`)).join(", ")} />
          )}
          {agency.commission && <InfoRow label={t("commission")} value={agency.commission} />}
          {agency.founded && <InfoRow label={t("since")} value={agency.founded} />}
        </dl>
      </div>
    </div>
  );
}
