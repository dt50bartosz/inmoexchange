"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2, MapPin, X } from "lucide-react";
import { MAX_SEARCH_LOCATIONS, MIN_LOCATION_QUERY } from "@/lib/schemas/locations";
import type { PlaceOption, PlaceSearchResult } from "@/types/locations";

const DEBOUNCE_MS = 250;
const PAGE = 8;
const ENDPOINT = "/api/locations/search";

type Props = {
  id?: string;
  /** Chosen locations, shown as removable tags. Only places from the list can be chosen. */
  values: PlaceOption[];
  onChange: (places: PlaceOption[]) => void;
  placeholder: string;
  "aria-describedby"?: string;
};

type State =
  | { status: "idle" }
  | { status: "loading"; items: PlaceOption[]; hasMore: boolean }
  | { status: "done"; items: PlaceOption[]; hasMore: boolean }
  | { status: "error" };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** The typed letters in bold where a word of the name starts with them ("tor" → **Tor**revieja). */
function highlight(name: string, text: string): ReactNode {
  const q = fold(text.trim());
  if (!q) return name;
  const folded = fold(name); // same length as `name` for the Latin letters used in Spanish place names
  // Start of the name, else start of a later word, else anywhere
  const wordStart = folded.search(new RegExp(`[\\s/'-]${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  const at = folded.startsWith(q) ? 0 : wordStart >= 0 ? wordStart + 1 : folded.indexOf(q);
  if (at < 0 || folded.length !== name.length) return name;
  return (
    <>
      {name.slice(0, at)}
      <mark className="bg-transparent font-semibold text-foreground">{name.slice(at, at + q.length)}</mark>
      {name.slice(at + q.length)}
    </>
  );
}

/**
 * Location search across Spain, backed by /api/locations/search (MongoDB): provinces, towns and the
 * villages, neighbourhoods and urbanisations inside them. Typing waits a moment before asking; an older
 * answer that arrives late never replaces a newer one.
 */
export default function PlaceAutocomplete({ id, values, onChange, placeholder, ...aria }: Props) {
  const t = useTranslations("panel.search.places");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [state, setState] = useState<State>({ status: "idle" });
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      controller.current?.abort();
    },
    []
  );

  const items = state.status === "done" || state.status === "loading" ? state.items : [];
  const full = values.length >= MAX_SEARCH_LOCATIONS;

  /** Asks the server for `q`; with `more`, the next page is added to the list shown. */
  const search = (q: string, more = false) => {
    clearTimeout(timer.current);
    controller.current?.abort();
    if (q.trim().length < MIN_LOCATION_QUERY) {
      request.current++; // a reply still on its way must not show up
      setState({ status: "idle" });
      return;
    }
    const shown = more ? items : [];
    setState({ status: "loading", items: more ? shown : items, hasMore: false });
    const n = ++request.current;
    timer.current = setTimeout(
      async () => {
        const ctrl = new AbortController();
        controller.current = ctrl;
        try {
          const params = new URLSearchParams({ q: q.trim(), limit: String(PAGE), offset: String(shown.length) });
          const res = await fetch(`${ENDPOINT}?${params}`, { signal: ctrl.signal });
          const body = (await res.json()) as { ok: true; data: PlaceSearchResult } | { ok: false; error: string };
          if (n !== request.current) return; // a newer search started meanwhile
          if (!body.ok) throw new Error(body.error);
          setState({ status: "done", items: [...shown, ...body.data.items], hasMore: body.data.hasMore });
          if (!more) setActive(0);
        } catch (err) {
          if (ctrl.signal.aborted || n !== request.current) return;
          console.error("[location search]", err);
          setState({ status: "error" });
        }
      },
      more ? 0 : DEBOUNCE_MS
    );
  };

  const pick = (place: PlaceOption) => {
    if (!values.some((v) => v.id === place.id) && !full) onChange([...values, place]);
    setText("");
    setOpen(false);
    request.current++;
    setState({ status: "idle" });
    inputRef.current?.focus();
  };

  const remove = (placeId: string) => onChange(values.filter((v) => v.id !== placeId));

  // Leaving the box drops the typed text: typed text alone is never a location
  const close = () => {
    setOpen(false);
    setText("");
    clearTimeout(timer.current);
    controller.current?.abort();
    request.current++;
    setState({ status: "idle" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      // With a list open, Enter picks; otherwise it submits the search form
      if (open && text.trim()) {
        e.preventDefault();
        if (items[active] && state.status === "done") pick(items[active]);
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    } else if (e.key === "Backspace" && !text && values.length) {
      remove(values[values.length - 1].id);
    }
  };

  const typeLabel = (p: PlaceOption) => t(`types.${p.type}`);
  const whereLabel = (p: PlaceOption) =>
    p.type === "province" ? p.detail : [p.municipalityName, p.provinceName].filter(Boolean).join(", ");

  const short = text.trim().length > 0 && text.trim().length < MIN_LOCATION_QUERY;
  const showList = open && (state.status !== "idle" || short);
  const message =
    state.status === "loading" ? (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 aria-hidden className="size-3.5 animate-spin" />
        {t("searching")}
      </span>
    ) : state.status === "error" ? (
      <span className="text-destructive">{t("error")}</span>
    ) : state.status === "done" && items.length === 0 ? (
      t("noMatches")
    ) : short ? (
      t("minChars", { n: MIN_LOCATION_QUERY })
    ) : null;

  return (
    <div className="relative">
      {/* Tags and the input in one box, like the big property portals */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
      >
        <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        {values.length > 0 && (
          <ul className="contents" aria-label={t("selected")}>
            {values.map((v, i) => (
              <li key={v.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary py-0.5 pr-1 pl-2.5 text-xs font-medium">
                <span className="truncate">{v.name}</span>
                <button
                  type="button"
                  // With every place chosen there is no text box: the field's label points here instead
                  id={full && i === values.length - 1 ? id : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(v.id);
                  }}
                  aria-label={t("remove", { name: v.name })}
                  className="rounded-full p-0.5 outline-none hover:bg-background hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {!full && (
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && items[active] ? `${listId}-${active}` : undefined}
          aria-describedby={aria["aria-describedby"]}
          autoComplete="off"
          placeholder={values.length ? t("addAnother") : placeholder}
          className="min-w-24 flex-1 bg-transparent py-0.5 outline-none placeholder:text-muted-foreground"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            search(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={close}
          onKeyDown={onKeyDown}
        />
        )}
      </div>

      {showList && (
        <div className="absolute z-50 mt-1 w-full min-w-64 rounded-md border bg-popover text-sm shadow-md">
          {items.length > 0 && (
            <ul id={listId} role="listbox" aria-busy={state.status === "loading"} className="max-h-80 overflow-y-auto p-1">
              {items.map((place, i) => {
                const chosen = values.some((v) => v.id === place.id);
                return (
                  <li
                    key={place.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    aria-disabled={chosen}
                    onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(place)}
                    className={`cursor-pointer rounded px-2 py-1.5 ${i === active ? "bg-muted" : ""} ${chosen ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate">{highlight(place.name, text)}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{typeLabel(place)}</span>
                    </div>
                    {whereLabel(place) && <div className="truncate text-xs text-muted-foreground">{whereLabel(place)}</div>}
                  </li>
                );
              })}
            </ul>
          )}
          {state.status === "done" && state.hasMore && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => search(text, true)}
              className="w-full border-t px-3 py-2 text-left text-xs font-medium text-primary hover:bg-muted"
            >
              {t("more")}
            </button>
          )}
          {message && (
            <p role="status" className="px-3 py-2 text-xs text-muted-foreground">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
