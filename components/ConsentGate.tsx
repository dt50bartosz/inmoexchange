"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CONSENT_CHANGED_EVENT, hasConsent } from "@/lib/cookie-consent";
import type { OptionalCategory } from "@/lib/cookie-inventory";

/**
 * Renders `children` (e.g. an analytics <Script>) only while the visitor has accepted `category`.
 * The one place optional scripts may load from; never add them to a layout directly.
 *
 *   <ConsentGate category="analytics"><Script src="https://www.googletagmanager.com/gtag/js?id=…" /></ConsentGate>
 */
export default function ConsentGate({ category, children }: { category: OptionalCategory; children: ReactNode }) {
  // Decided after mount: nothing optional is rendered on the server or before the cookie is read
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const update = () => setAllowed(hasConsent(category));
    update();
    window.addEventListener(CONSENT_CHANGED_EVENT, update);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, update);
  }, [category]);

  return allowed ? <>{children}</> : null;
}
