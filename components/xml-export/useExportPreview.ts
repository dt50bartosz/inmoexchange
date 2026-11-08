"use client";

import { useEffect, useState } from "react";
import { previewExport, type ExportPreview } from "@/app/[locale]/panel/exportar-xml/server/actions";
import type { XmlExportFilters } from "@/types/xmlExport";

const DELAY_MS = 300;

/**
 * What an export link would contain right now (own + partners, same rule as the feed itself).
 * Asks the server shortly after the filters stop changing. While the filters are invalid
 * (e.g. max price below min price) or a request fails, the last preview stays on screen.
 */
export function useExportPreview(filters: XmlExportFilters) {
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(filters); // re-run only when the values change, not the object

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await previewExport(JSON.parse(key));
        if (!cancelled && res.ok) setPreview(res.data);
      } catch {
        // network error: keep the last preview
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key]);

  return { preview, loading };
}
