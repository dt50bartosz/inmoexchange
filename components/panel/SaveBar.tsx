"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

type Props = { visible: boolean; saving: boolean; onSave: () => void; onDiscard: () => void };

/** Sticky bar shown while a page has unsaved changes. */
export default function SaveBar({ visible, saving, onSave, onDiscard }: Props) {
  const t = useTranslations("panel.common");
  return (
    <div
      inert={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur transition-transform duration-200 motion-reduce:transition-none ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">{t("unsavedChanges")}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDiscard} disabled={saving}>
            {t("discard")}
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}
