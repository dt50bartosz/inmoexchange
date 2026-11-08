"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { OPEN_SETTINGS_EVENT, readConsent, saveConsent, type ConsentChoices } from "@/lib/cookie-consent";
import { COOKIE_CATEGORIES, cookiesIn, type CookieCategory } from "@/lib/cookie-inventory";
import { recordConsentAction } from "@/lib/actions/consent";

const NONE: ConsentChoices = { analytics: false, marketing: false };
const ALL: ConsentChoices = { analytics: true, marketing: true };

/**
 * Asks for the visitor's cookie choice on the first visit (and again after a policy version change).
 * Three equal choices: reject non-essential, configure, accept all. Nothing is pre-selected and
 * browsing on does not count as consent: the banner stays until the visitor chooses.
 * "Cookie settings" (footer, cookie policy) opens it again, straight on the per-category view.
 */
export default function CookieBanner() {
  const t = useTranslations("cookies.banner");
  const uid = useId();
  // Decided after mount: the cookie isn't readable during server rendering
  const [view, setView] = useState<"closed" | "banner" | "settings">("closed");
  const [choices, setChoices] = useState<ConsentChoices>(NONE);

  useEffect(() => {
    if (!readConsent()) setView("banner");
    const reopen = (e: Event) => {
      const saved = readConsent();
      setChoices(saved ? { analytics: saved.analytics, marketing: saved.marketing } : NONE);
      setView((e as CustomEvent<{ configure?: boolean }>).detail?.configure ? "settings" : "banner");
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  if (view === "closed") return null;

  const choose = (next: ConsentChoices, action: "accept_all" | "reject_all" | "custom") => {
    setView("closed");
    const consent = saveConsent(next);
    void recordConsentAction({ ...next, id: consent.id, version: consent.version, action });
  };

  const categoryRow = (c: CookieCategory) => {
    const used = cookiesIn(c).length > 0;
    const locked = c === "necessary";
    const id = `${uid}-${c}`;
    return (
      <li key={c} className="flex items-start justify-between gap-4 border-t border-border py-3 first:border-t-0">
        <div>
          <label htmlFor={id} className="text-sm font-medium">
            {t(`categories.${c}.title`)}
          </label>
          <p id={`${id}-desc`} className="mt-0.5 text-xs text-muted-foreground">
            {t(`categories.${c}.description`)} {!used && t("noneInUse")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {locked && <span className="text-xs text-muted-foreground">{t("alwaysOn")}</span>}
          <Switch
            id={id}
            aria-describedby={`${id}-desc`}
            checked={locked ? true : choices[c as keyof ConsentChoices]}
            disabled={locked}
            onCheckedChange={(on) => !locked && setChoices((prev) => ({ ...prev, [c]: on }))}
          />
        </div>
      </li>
    );
  };

  return (
    <div
      role="region"
      aria-label={t("title")}
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:bottom-4 sm:left-4 sm:right-auto sm:w-[28rem] sm:p-0"
    >
      <div className="max-h-[85dvh] overflow-y-auto rounded-xl border border-border bg-background p-5 shadow-lg">
        <h2 className="font-semibold">{view === "settings" ? t("settingsTitle") : t("title")}</h2>

        {view === "banner" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("text")}{" "}
            <Link href="/cookies" className="text-primary underline underline-offset-2 hover:no-underline">
              {t("policy")}
            </Link>
          </p>
        ) : (
          <ul className="mt-3">{COOKIE_CATEGORIES.map(categoryRow)}</ul>
        )}

        {/* All choices equally visible and equally easy (AEPD cookie guide, EDPB guidelines 03/2022) */}
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => choose(NONE, "reject_all")}>
            {t("reject")}
          </Button>
          {view === "banner" ? (
            <Button variant="outline" onClick={() => setView("settings")}>
              {t("configure")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => choose(choices, "custom")}>
              {t("save")}
            </Button>
          )}
          <Button variant="outline" onClick={() => choose(ALL, "accept_all")}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
