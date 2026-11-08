"use client";

import { forwardRef, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { searchLocations, type Location } from "@/lib/locations";

type Common = {
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
};

type SingleProps = Common & {
  multiple?: false;
  /** The town text (a picked location's name, or whatever was typed). */
  value: string;
  /** `location` is null when the text doesn't come from the list (free text is allowed). */
  onChange: (text: string, location: Location | null) => void;
};

type MultiProps = Common & {
  multiple: true;
  values: string[];
  onChange: (values: string[]) => void;
};

/**
 * Location search over every municipality (INE), district and urbanisation in lib/locations.
 * Accents, Spanish / Valencian names and common spellings all match. Typed text is kept too,
 * so towns outside the list (other regions, new urbanisations) still work.
 */
const LocationInput = forwardRef<HTMLInputElement, SingleProps | MultiProps>(function LocationInput(props, ref) {
  const t = useTranslations("panel.locations");
  const listId = useId();
  // Multi: the text being typed. Single: always the parent's value (so "Clear" and back/forward show up here too).
  const [typed, setTyped] = useState("");
  const query = props.multiple ? typed : props.value;
  const setQuery = (v: string) => (props.multiple ? setTyped(v) : undefined);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const results = useMemo(() => (open ? searchLocations(query, 10) : []), [open, query]);
  const selected = props.multiple ? props.values : [];

  const pick = (l: Location) => {
    if (props.multiple) {
      if (!props.values.includes(l.name)) props.onChange([...props.values, l.name]);
      setQuery("");
    } else {
      props.onChange(l.name, l);
    }
    setOpen(false);
  };

  const addTyped = () => {
    const text = query.trim();
    if (props.multiple && text && !props.values.includes(text)) props.onChange([...props.values, text]);
    if (props.multiple) setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault();
        pick(results[active]);
      } else if (props.multiple && query.trim()) {
        e.preventDefault();
        addTyped();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && props.multiple && !query && props.values.length) {
      props.onChange(props.values.slice(0, -1));
    }
  };

  const typeLabel = (l: Location) =>
    l.type === "municipality" ? t("types.municipality") : `${t(`types.${l.type}`)} · ${l.parentName ?? ""}`;

  return (
    <div className={`relative ${props.className ?? ""}`}>
      {props.multiple && selected.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label={t("selected")}>
          {selected.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
              {v}
              <button
                type="button"
                disabled={props.disabled}
                onClick={() => props.onChange(selected.filter((x) => x !== v))}
                aria-label={t("remove", { name: v })}
                className="rounded-full outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <MapPin aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          id={props.id}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          aria-invalid={props["aria-invalid"]}
          aria-describedby={props["aria-describedby"]}
          autoComplete="off"
          disabled={props.disabled}
          placeholder={props.placeholder ?? t("placeholder")}
          className="pl-8"
          value={query}
          onChange={(e) => {
            setActive(0);
            setOpen(true);
            if (props.multiple) setTyped(e.target.value);
            else props.onChange(e.target.value, null); // free text until a location is picked
          }}
          onFocus={() => query && setOpen(true)}
          onBlur={() => {
            // Let a click on an option land first
            blurTimer.current = setTimeout(() => (props.multiple && query.trim() ? addTyped() : setOpen(false)), 150);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          {results.map((l, i) => (
            <li
              key={l.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()} // keep focus in the input
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                clearTimeout(blurTimer.current);
                pick(l);
              }}
              className={`flex cursor-pointer items-baseline justify-between gap-3 rounded px-2 py-1.5 ${i === active ? "bg-muted" : ""}`}
            >
              <span className="truncate font-medium">{l.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{typeLabel(l)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default LocationInput;
