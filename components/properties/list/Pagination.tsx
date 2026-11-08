"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = { page: number; pageCount: number; onChange: (page: number) => void };

export default function Pagination({ page, pageCount, onChange }: Props) {
  const t = useTranslations("panel.common");
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={t("pagination")} className="flex items-center justify-end gap-2">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft aria-hidden className="size-4" />
        {t("previous")}
      </Button>
      <span className="px-2 text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {t("pageOf", { page, total: pageCount })}
      </span>
      <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
        {t("next")}
        <ChevronRight aria-hidden className="size-4" />
      </Button>
    </nav>
  );
}
