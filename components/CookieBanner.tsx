"use client";

import { useEffect, useId, useState } from "react";
import { Cookie } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { OPEN_SETTINGS_EVENT, readConsent, saveConsent, type ConsentChoices } from "@/lib/cookie-consent";
import { COOKIE_CATEGORIES, OPTIONAL_CATEGORIES, cookiesIn, type CookieCategory } from "@/lib/cookie-inventory";
import { recordConsentAction } from "@/lib/actions/consent";

const all = (on: boolean) => Object.fromEntries(OPTIONAL_CATEGORIES.map((c) => [c, on])) as ConsentChoices;
const NONE = all(false);
const ALL = all(true);

/*
 * Brand colours for the consent UI (#012C70 primary, #0171F2 secondary, #0075F5 accent).
 * Every choice uses the SAME button style: accepting is never bigger, brighter or easier than rejecting
 * (AEPD cookie guide 2024, EDPB guidelines 03/2022 on deceptive design).
 */
const choiceButton =
  "inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#012C70] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0171F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075F5] focus-visible:ring-offset-2";
const textLink = "font-medium text-[#0171F2] underline underline-offset-2 hover:no-underline dark:text-[#5AA2FF]";

type Method = "banner" | "preferences_centre";

/**
 * Asks for the visitor's cookie choice on the first visit (and again after a cookie policy version change).
 * Banner: reject non-essential, customise, accept all. Nothing optional is pre-selected and browsing on does
 * not count as consent: the banner stays until the visitor chooses.
 * Preferences centre (modal): one switch per optional category; "Cookie settings" (footer, cookie policy,
 * account) opens it straight away, so withdrawing is as easy as accepting.
 */
export default function CookieBanner() {
  const t = useTranslations("cookies.banner");
  const uid = useId();
  // Decided after mount: the cookie isn't readable during server rendering
  const [view, setView] = useState<"closed" | "banner" | "settings">("closed");
  const [choices, setChoices] = useState<ConsentChoices>(NONE);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    const saved = readConsent();
    setHasSaved(!!saved);
    if (!saved) setView("banner");
    const reopen = (e: Event) => {
      const current = readConsent();
      setHasSaved(!!current);
      setChoices(current ? (Object.fromEntries(OPTIONAL_CATEGORIES.map((c) => [c, current[c]])) as ConsentChoices) : NONE);
      setView((e as CustomEvent<{ configure?: boolean }>).detail?.configure ? "settings" : "banner");
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  if (view === "closed") return null;

  const choose = (next: ConsentChoices, action: "accept_all" | "reject_all" | "custom", method: Method) => {
    setView("closed");
    setHasSaved(true);
    const consent = saveConsent(next);
    void recordConsentAction({ ...next, id: consent.id, version: consent.version, action, method });
  };

  const openSettings = () => {
    setChoices(NONE); // never pre-selected
    setView("settings");
  };

  const categoryRow = (c: CookieCategory) => {
    const used = cookiesIn(c).length > 0;
    const locked = c === "necessary";
    const id = `${uid}-${c}`;
    return (
      <li key={c} className="flex items-start justify-between gap-4 border-t border-border py-4 first:border-t-0 first:pt-0">
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-semibold">
            {t(`categories.${c}.title`)}
          </label>
          <p id={`${id}-desc`} className="mt-1 text-sm text-muted-foreground">
            {t(`categories.${c}.description`)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(`categories.${c}.examples`)}
            {!used && <span className="block italic">{t("noneInUse")}</span>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
          <Switch
            id={id}
            aria-describedby={`${id}-desc`}
            checked={locked ? true : choices[c as keyof ConsentChoices]}
            disabled={locked}
            onCheckedChange={(on) => !locked && setChoices((prev) => ({ ...prev, [c]: on }))}
          />
          {locked && <span className="text-xs text-muted-foreground">{t("alwaysOn")}</span>}
        </div>
      </li>
    );
  };

  const links = (
    <>
      <Link href="/privacidad" className={textLink}>
        {t("privacy")}
      </Link>
      {" · "}
      <Link href="/cookies" className={textLink}>
        {t("policy")}
      </Link>
    </>
  );

  if (view === "settings") {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          // Closing without choosing: back to the banner if there is no saved choice yet
          if (!open) setView(hasSaved ? "closed" : "banner");
        }}
      >
        <DialogContent showCloseButton={hasSaved} className="max-h-[90dvh] overflow-y-auto border-t-4 border-t-[#012C70] p-6 sm:max-w-lg">
          <DialogTitle className="text-lg font-semibold">{t("settingsTitle")}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("settingsIntro")} {links}
          </DialogDescription>
          <ul className="mt-2">{COOKIE_CATEGORIES.map(categoryRow)}</ul>
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" className={choiceButton} onClick={() => choose(NONE, "reject_all", "preferences_centre")}>
              {t("rejectAll")}
            </button>
            <button type="button" className={choiceButton} onClick={() => choose(choices, "custom", "preferences_centre")}>
              {t("save")}
            </button>
            <button type="button" className={choiceButton} onClick={() => choose(ALL, "accept_all", "preferences_centre")}>
              {t("accept")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div role="region" aria-label={t("title")} className="fixed inset-x-0 bottom-0 z-50 p-3 sm:bottom-4 sm:left-4 sm:right-auto sm:w-[30rem] sm:p-0">
      <div className="max-h-[85dvh] overflow-y-auto rounded-xl border border-border border-t-4 border-t-[#012C70] bg-background p-5 shadow-xl">
        <h2 className="flex items-center gap-2 font-semibold">
          <Cookie aria-hidden className="size-5 text-[#0171F2]" />
          {t("title")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("text")} {links}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button type="button" className={choiceButton} onClick={() => choose(NONE, "reject_all", "banner")}>
            {t("reject")}
          </button>
          <button type="button" className={choiceButton} onClick={openSettings}>
            {t("configure")}
          </button>
          <button type="button" className={choiceButton} onClick={() => choose(ALL, "accept_all", "banner")}>
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
