"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import AgencyAvatar from "./AgencyAvatar";
import { LOGO_MAX_BYTES, LOGO_TYPES } from "@/lib/constants/agency";

type Props = {
  logoUrl: string | null;
  agencyName: string;
  onChange: (url: string | null, file: File | null) => void;
};

/*
 * Shows the picked logo from a local object URL. The file itself is uploaded to R2
 * when the agency saves the page (see AgencyDetailsPage).
 */
export default function LogoUpload({ logoUrl, agencyName, onChange }: Props) {
  const t = useTranslations("panel.agency.logo");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<"type" | "size" | null>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return setError("type");
    if (file.size > LOGO_MAX_BYTES) return setError("size");
    setError(null);
    if (logoUrl?.startsWith("blob:")) URL.revokeObjectURL(logoUrl);
    onChange(URL.createObjectURL(file), file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-start gap-5 rounded-lg border-2 border-dashed p-4 sm:flex-row sm:items-center ${
          dragging ? "border-primary bg-primary/5" : ""
        }`}
      >
        <AgencyAvatar logoUrl={logoUrl} name={agencyName} size="lg" alt={t("alt", { name: agencyName })} />
        <div className="text-sm">
          <p className="text-muted-foreground">{t("dropHere")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              {logoUrl ? t("replace") : t("upload")}
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  setError(null);
                  onChange(null, null);
                }}
              >
                {t("remove")}
              </Button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={LOGO_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error === "type" ? t("errorType") : t("errorSize")}
        </p>
      )}
    </div>
  );
}
