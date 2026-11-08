"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import AgencyAvatar from "../AgencyAvatar";
import InfoRow from "./InfoRow";
import { CONTENT_LANGUAGES, langLabel, orderedLangs, type LangCode } from "@/lib/constants/languages";
import { SITE_HOST, slugify } from "../utils";
import type { AgencyFormValues } from "@/lib/schemas/agency";

export default function MicrositePreview({ agency }: { agency: AgencyFormValues }) {
  const t = useTranslations("panel.agency.preview");
  const codes = orderedLangs(agency.about, agency.defaultLanguage);
  const [picked, setPicked] = useState<LangCode>(agency.defaultLanguage);
  const lang = agency.about[picked] !== undefined ? picked : agency.defaultLanguage;

  // Same fallback rule the real microsite should use
  const own = agency.about[lang]?.trim() ?? "";
  const usingFallback = !own && lang !== agency.defaultLanguage;
  const shown = usingFallback ? agency.defaultLanguage : lang;
  const text = usingFallback ? agency.about[agency.defaultLanguage]?.trim() ?? "" : own;
  const heading = CONTENT_LANGUAGES.find((l) => l.code === shown)?.aboutHeading ?? "About us";
  const place = [agency.town, agency.province].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted px-3 py-2">
        <span aria-hidden className="flex gap-1">
          <span className="size-2 rounded-full bg-muted-foreground/30" />
          <span className="size-2 rounded-full bg-muted-foreground/30" />
          <span className="size-2 rounded-full bg-muted-foreground/30" />
        </span>
        <span className="truncate text-xs text-muted-foreground">{SITE_HOST}/{slugify(agency.name)}</span>
      </div>

      {codes.length > 1 && (
        <div className="flex flex-wrap justify-end gap-1 px-5 pt-4" role="group" aria-label={t("micrositeLanguage")}>
          {codes.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === lang}
              title={langLabel(c)}
              onClick={() => setPicked(c)}
              className={`rounded px-2 py-0.5 text-xs font-medium uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                c === lang ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-3">
          <AgencyAvatar logoUrl={agency.logoUrl} name={agency.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{agency.name || t("agencyName")}</p>
            {place && <p className="truncate text-xs text-muted-foreground">{place}</p>}
          </div>
        </div>
        <h3 className="mt-5 text-lg font-semibold tracking-tight">{heading}</h3>
        {usingFallback && (
          <p className="mt-1 rounded bg-warning-soft px-2 py-1 text-xs text-warning">
            {t("fallbackNote", { language: langLabel(lang), fallback: langLabel(agency.defaultLanguage) })}
          </p>
        )}
        {text ? (
          <p className="mt-2 line-clamp-[10] whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{text}</p>
        ) : (
          <p className="mt-2 text-sm italic text-muted-foreground">{t("aboutPlaceholder")}</p>
        )}
        <dl className="mt-5 space-y-1.5 border-t pt-4 text-sm">
          {agency.phone && <InfoRow label={t("phone")} value={agency.phone} />}
          {agency.whatsapp && <InfoRow label="WhatsApp" value={agency.whatsapp} />}
          {agency.email && <InfoRow label={t("email")} value={agency.email} />}
        </dl>
      </div>
    </div>
  );
}
