"use client";

import { useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteFeed } from "@/app/[locale]/panel/mis-propiedades/server/actions";
import { removeFeed } from "../store";
import type { Feed } from "@/lib/schemas/feed";

type Props = { feed: Feed | null; propertyCount: number; onClose: () => void };

export default function DeleteFeedDialog({ feed, propertyCount, onClose }: Props) {
  const t = useTranslations("panel.properties.feeds.deleteDialog");
  const [choice, setChoice] = useState<"keep" | "remove">("keep");
  const [busy, setBusy] = useState(false);

  const confirm = async (e: MouseEvent) => {
    e.preventDefault(); // keep the dialog open until the server answers
    if (!feed) return;
    setBusy(true);
    try {
      const res = await deleteFeed(feed.id, choice);
      if (!res.ok) throw new Error(res.error);
      removeFeed(feed.id, choice);
      toast.success(choice === "remove" ? t("doneRemoved", { name: feed.name }) : t("doneKept", { name: feed.name }));
      setChoice("keep");
      onClose();
    } catch {
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  };

  const options = [
    { value: "keep" as const, label: t("keep"), hint: t("keepHint") },
    { value: "remove" as const, label: t("remove", { count: propertyCount }), hint: t("removeHint") },
  ];

  return (
    <AlertDialog open={feed !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{feed && t("title", { name: feed.name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("body")}</AlertDialogDescription>
        </AlertDialogHeader>

        {propertyCount > 0 && (
          <fieldset className="grid gap-2">
            <legend className="sr-only">{t("legend")}</legend>
            {options.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${choice === o.value ? "border-primary bg-primary/5" : ""}`}
              >
                <input
                  type="radio"
                  name="feed-properties"
                  value={o.value}
                  checked={choice === o.value}
                  onChange={() => setChoice(o.value)}
                  className="mt-0.5 accent-[var(--primary)]"
                />
                <span>
                  <span className="block font-medium">{o.label}</span>
                  <span className="block text-muted-foreground">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirm} disabled={busy}>
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}