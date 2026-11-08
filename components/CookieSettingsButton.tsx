"use client";

import { Button } from "@/components/ui/Button";
import { openCookieSettings } from "@/lib/cookie-consent";

/** Opens the cookie choices again, so the visitor can change or withdraw consent at any time. */
export default function CookieSettingsButton({ label, asLink, className }: { label: string; asLink?: boolean; className?: string }) {
  if (asLink) {
    return (
      <button type="button" onClick={() => openCookieSettings()} className={className}>
        {label}
      </button>
    );
  }
  return (
    <Button variant="outline" onClick={() => openCookieSettings()} className={className}>
      {label}
    </Button>
  );
}
