"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { DEFAULT_SEARCH_FILTERS, toSearchQuery } from "@/lib/schemas/search";
import type { SearchFilters } from "@/types/search";

/**
 * Search filters kept in the URL (?area=…&page=2). The server page reads them and renders the results;
 * this hook only changes the URL. Filter changes wait for the Search button; sort, Reset and pages apply
 * straight away. The back / forward buttons bring their filters back into the inputs.
 */
export function useUrlSearch(filters: SearchFilters, basePath: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // What the inputs show. The URL follows it shortly after the last change.
  const [draft, setDraft] = useState(filters);
  const lastSent = useRef(toSearchQuery(filters));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The URL changed without us (back / forward button): show its filters
  const urlFilters = toSearchQuery(filters);
  useEffect(() => {
    if (urlFilters !== lastSent.current) {
      lastSent.current = urlFilters;
      setDraft(filters);
    }
  }, [urlFilters, filters]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (f: SearchFilters, page = 1) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastSent.current = toSearchQuery(f);
      startTransition(() => router.replace(`${basePath}${toSearchQuery(f, page)}`, { scroll: false }));
    });
  };

  return {
    draft,
    pending,
    /** Typing / picking a filter: only the inputs change until `search`. */
    change: (f: SearchFilters) => setDraft(f),
    /** The Search button: the filters as they are now, from page 1. */
    search: () => go(draft),
    /** Filters changed since the results on screen were loaded. */
    dirty: toSearchQuery({ ...draft, sort: "newest" }) !== toSearchQuery({ ...filters, sort: "newest" }),
    /** Sort: straight away. */
    setSort: (sort: SearchFilters["sort"]) => {
      const f = { ...draft, sort };
      setDraft(f);
      go(f);
    },
    clear: () => {
      const f = { ...DEFAULT_SEARCH_FILTERS, sort: draft.sort };
      setDraft(f);
      go(f);
    },
    // Something to reset: in the inputs, or still applied to the results on screen
    canClear: toSearchQuery({ ...draft, sort: "newest" }) !== "" || toSearchQuery({ ...filters, sort: "newest" }) !== "",
    /** A new history entry, so the back button returns to the previous page. */
    goToPage: (page: number) => {
      clearTimeout(timer.current);
      startTransition(() => router.push(`${basePath}${toSearchQuery(draft, page)}`));
    },
  };
}
