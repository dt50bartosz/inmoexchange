"use client";

import { useState } from "react";
import AgencyAvatar from "./ui/AgencyAvatar";
import InfoRow from "./InfoRow";
import type { Agency } from "@/types/agent";
import {
  CONTENT_LANGUAGES,
  langLabel,
  orderedLangs,
  type LangCode,
} from "@/components/panel/languages";
import { SITE_HOST, slugify } from "./utils";

export default function MicrositePreview({ agency }: { agency: Agency }) {
  const codes = orderedLangs(agency.about, agency.defaultLanguage);
  const [picked, setPicked] = useState<LangCode>(agency.defaultLanguage);
  const lang = agency.about[picked] !== undefined ? picked : agency.defaultLanguage;

  // Same fallback rule the real microsite should use
  const ownText = agency.about[lang]?.trim() ?? "";
  const usingFallback = !ownText && lang !== agency.defaultLanguage;
  const shownLang = usingFallback ? agency.defaultLanguage : lang;
  const text = usingFallback ? agency.about[agency.defaultLanguage]?.trim() ?? "" : ownText;
  const heading = CONTENT_LANGUAGES.find((l) => l.code === shownLang)?.aboutHeading ?? "About us";
  const place = [agency.town, agency.province].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      {/* Browser bar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted px-3 py-2">
        <span aria-hidden className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-input" />
          <span className="h-2 w-2 rounded-full bg-input" />
          <span className="h-2 w-2 rounded-full bg-input" />
        </span>
        <span className="truncate text-xs text-muted-foreground">{SITE_HOST}/{slugify(agency.name)}</span>
      </div>

      {/* Language switcher, like the client sees it */}
      {codes.length > 1 && (
        <div className="flex flex-wrap justify-end gap-1 px-5 pt-4" aria-label="Microsite language">
          {codes.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === lang}
              title={langLabel(c)}
              onClick={() => setPicked(c)}
              className={`rounded px-2 py-0.5 text-xs font-medium uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                c === lang ? "bg-foreground text-white" : "text-muted-foreground hover:bg-muted"
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
            <p className="truncate font-semibold">{agency.name || "Agency name"}</p>
            {place && <p className="truncate text-xs text-muted-foreground">{place}</p>}
          </div>
        </div>

        <h3 className="mt-5 text-lg font-semibold tracking-tight">{heading}</h3>
        {usingFallback && (
          <p className="mt-1 rounded bg-warning-soft px-2 py-1 text-xs text-warning">
            No {langLabel(lang)} text yet, so clients see your {langLabel(agency.defaultLanguage)} version.
          </p>
        )}
        {text ? (
          <p className="mt-2 line-clamp-[10] whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{text}</p>
        ) : (
          <p className="mt-2 text-sm italic text-muted-foreground/70">Your About text will appear here.</p>
        )}

        <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
          {agency.phone && <InfoRow label="Phone" value={agency.phone} />}
          {agency.whatsapp && <InfoRow label="WhatsApp" value={agency.whatsapp} />}
          {agency.email && <InfoRow label="Email" value={agency.email} />}
        </dl>
      </div>
    </div>
  );
}