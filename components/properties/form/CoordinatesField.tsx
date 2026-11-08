"use client";

import { useEffect, useRef, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { Crosshair, ExternalLink, Loader2, MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import FormField from "@/components/panel/FormField";
import { distanceFromTownKm, type LatLng } from "@/lib/geo";
import type { PropertyEditOutput, PropertyEditValues } from "@/types/property";
import { geocodeAddressAction, townCentreAction, type CoordinatesError } from "@/app/[locale]/panel/mis-propiedades/server/actions";

const TOWN_DELAY_MS = 600;

type Form = UseFormReturn<PropertyEditValues, unknown, PropertyEditOutput>;
type Lookup = { status: "idle" } | { status: "loading" } | { status: "error"; error: CoordinatesError };

/** "" → null (no coordinate), otherwise a number; the schema checks the range. */
const asCoordinate = { setValueAs: (v: string) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))) };

/**
 * Latitude / longitude of the property and its straight-line distance from the town centre.
 * - Town picked or typed: its centre is looked up (our location data, else the geocoder) and fills the
 *   coordinates when they are empty or were only a town centre.
 * - "Find from address": the street address is geocoded for the property's own point.
 * - The numbers can be typed or corrected by hand.
 * The distance shown here is a preview with the same formula; the server recalculates it when saving.
 */
export default function CoordinatesField({ form, readOnly }: { form: Form; readOnly: boolean }) {
  const t = useTranslations("panel.properties.form.coordinates");
  const locale = useLocale();
  const { control, register, setValue, formState } = form;
  const e = formState.errors;
  const [town, province, address, latitude, longitude, source] = useWatch({
    control,
    name: ["town", "province", "address", "latitude", "longitude", "coordinatesSource"],
  });

  const [centre, setCentre] = useState<LatLng | null>(null);
  const [townLookup, setTownLookup] = useState<Lookup>({ status: "idle" });
  const [addressLookup, setAddressLookup] = useState<Lookup>({ status: "idle" });
  const lastTown = useRef<string | null>(null); // the town key last asked for: no repeated requests
  const request = useRef(0);

  const setPoint = (point: LatLng, kind: "town" | "address") => {
    const changed = point.lat !== latitude || point.lng !== longitude || kind !== source;
    const opts = { shouldDirty: changed, shouldValidate: true };
    setValue("latitude", point.lat, opts);
    setValue("longitude", point.lng, opts);
    setValue("coordinatesSource", kind, { shouldDirty: changed });
  };

  const lookUpTown = async (key: string, force = false) => {
    if (!force && key === lastTown.current) return;
    lastTown.current = key;
    const n = ++request.current;
    setTownLookup({ status: "loading" });
    try {
      const res = await townCentreAction({ town: town.trim(), province: province.trim() });
      if (n !== request.current) return; // the town changed again meanwhile
      if (!res.ok) {
        setCentre(null);
        setTownLookup({ status: "error", error: res.error });
        return;
      }
      setCentre({ lat: res.data.lat, lng: res.data.lng });
      setTownLookup({ status: "idle" });
      // Fill in only what isn't the property's own point
      const own = latitude != null && longitude != null && source !== "town";
      if (!own && !readOnly) setPoint(res.data, "town");
    } catch {
      if (n !== request.current) return;
      setTownLookup({ status: "error", error: "unavailable" });
    }
  };

  // Town (or province) changed: look up its centre shortly after the last change
  const townKey = `${(town ?? "").trim()}|${(province ?? "").trim()}`;
  useEffect(() => {
    if (!(town ?? "").trim()) {
      setCentre(null);
      return;
    }
    const timer = setTimeout(() => void lookUpTown(townKey), TOWN_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the town key starts a lookup
  }, [townKey]);

  const findFromAddress = async () => {
    setAddressLookup({ status: "loading" });
    try {
      const res = await geocodeAddressAction({ address, town, province });
      if (!res.ok) {
        setAddressLookup({ status: "error", error: res.error });
        return;
      }
      setPoint(res.data, "address");
      setAddressLookup({ status: "idle" });
    } catch {
      setAddressLookup({ status: "error", error: "unavailable" });
    }
  };

  const point = latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null;
  const distance = distanceFromTownKm(point, centre);
  const manual = { onChange: () => setValue("coordinatesSource", "manual", { shouldDirty: true }) };

  const errorText = (err: CoordinatesError, what: "town" | "address") =>
    err === "not_found" ? t(what === "town" ? "townNotFound" : "addressNotFound") : err === "rate_limited" ? t("rateLimited") : t("unavailable");

  return (
    <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t("title")}</p>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!centre} onClick={() => centre && setPoint(centre, "town")}>
              <MapPin aria-hidden className="size-4" />
              {t("useTownCentre")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!(address ?? "").trim() || !(town ?? "").trim() || addressLookup.status === "loading"}
              onClick={findFromAddress}
            >
              {addressLookup.status === "loading" ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Crosshair aria-hidden className="size-4" />}
              {t("fromAddress")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={t("latitude")} error={e.latitude?.message}>
          {(p) => <Input {...p} type="number" inputMode="decimal" step="any" min={-90} max={90} placeholder="37.97872" disabled={readOnly} {...register("latitude", { ...asCoordinate, ...manual })} />}
        </FormField>
        <FormField label={t("longitude")} error={e.longitude?.message}>
          {(p) => <Input {...p} type="number" inputMode="decimal" step="any" min={-180} max={180} placeholder="-0.68222" disabled={readOnly} {...register("longitude", { ...asCoordinate, ...manual })} />}
        </FormField>
      </div>

      <div className="space-y-1 text-sm" aria-live="polite">
        {townLookup.status === "loading" ? (
          <p className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            {t("findingTown")}
          </p>
        ) : townLookup.status === "error" ? (
          <p className="text-destructive">
            {errorText(townLookup.error, "town")}{" "}
            <button type="button" className="inline-flex items-center gap-1 font-medium underline" onClick={() => void lookUpTown(townKey, true)}>
              <RotateCcw aria-hidden className="size-3.5" />
              {t("retry")}
            </button>
          </p>
        ) : distance === null ? (
          <p className="text-muted-foreground">{centre ? t("noPoint") : (town ?? "").trim() ? t("noCentre") : t("pickTown")}</p>
        ) : source === "town" ? (
          <p className="text-muted-foreground">{t("atTownCentre")}</p>
        ) : (
          <p>
            <span className="font-semibold tabular-nums">{t("distance", { km: distance.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })}</span>{" "}
            <span className="text-muted-foreground">{t("straightLine")}</span>
          </p>
        )}
        {addressLookup.status === "error" && (
          <p className="text-destructive">
            {errorText(addressLookup.error, "address")}{" "}
            <button type="button" className="inline-flex items-center gap-1 font-medium underline" onClick={findFromAddress}>
              <RotateCcw aria-hidden className="size-3.5" />
              {t("retry")}
            </button>
          </p>
        )}
        {point && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=16/${point.lat}/${point.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {t("checkOnMap")}
            <ExternalLink aria-hidden className="size-3" />
          </a>
        )}
      </div>
    </div>
  );
}
