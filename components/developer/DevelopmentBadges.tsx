"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, Eye, PencilLine } from "lucide-react";
import type { DevelopmentVisibility } from "@/lib/constants/developers";

/** Borrador / Publicada: always with an icon and a word, not colour alone. */
export function VisibilityBadge({ visibility }: { visibility: DevelopmentVisibility }) {
  const t = useTranslations("promotor.developments.visibility");
  const published = visibility === "published";
  const Icon = published ? Eye : PencilLine;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        published ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
      }`}
    >
      <Icon aria-hidden className="size-3.5" />
      {t(visibility)}
    </span>
  );
}

/**
 * Shown to the developer on developments an admin created for it ("Añadido por"), or else last changed
 * ("Editado por"): `edited` picks the second text.
 */
export function AddedByPlatformBadge({ edited = false }: { edited?: boolean }) {
  const t = useTranslations("promotor.developments");
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">
      <BadgeCheck aria-hidden className="size-3.5" />
      {t(edited ? "editedByPlatform" : "addedByPlatform")}
    </span>
  );
}
