"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FormField from "@/components/panel/FormField";
import { feedSchema, type FeedFormValues } from "@/lib/schemas/feed";
import { addFeed, testFeed } from "@/app/[locale]/panel/mis-propiedades/server/actions";
import { upsertFeed } from "../store";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

type TestResult = { ok: true; count: number } | { ok: false } | null;

const DEFAULTS: FeedFormValues = { name: "", url: "" };

/** Asks the server to download the URL and check it's a Kyero feed. */
async function checkFeed(url: string): Promise<TestResult> {
  try {
    const res = await testFeed(url);
    return res.ok ? { ok: true, count: res.data.count } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export default function AddFeedDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("panel.properties.feeds");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult>(null);

  const form = useForm({ resolver: zodResolver(feedSchema), defaultValues: DEFAULTS, mode: "onTouched" });
  const { register, handleSubmit, formState, trigger, getValues, reset, setError } = form;
  const e = formState.errors;

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      reset(DEFAULTS);
      setResult(null);
    }
  };

  const test = async () => {
    if (!(await trigger("url"))) return;
    setTesting(true);
    setResult(null);
    setResult(await checkFeed(getValues("url")));
    setTesting(false);
  };

  const onSubmit = handleSubmit(async (values) => {
    // The server tests the URL again before saving, so nobody can save a broken feed.
    let res: Awaited<ReturnType<typeof addFeed>>;
    try {
      res = await addFeed(values);
    } catch {
      toast.error(t("addDialog.testFailed"));
      return;
    }

    if (!res.ok) {
      if (res.fieldErrors?.url === "feed_exists") {
        setError("url", { type: "server", message: t("addDialog.urlExists") });
      } else {
        setResult({ ok: false });
      }
      return;
    }

    upsertFeed(res.data);
    toast.success(t("toasts.added", { name: res.data.name }));
    close(false);
  });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t("addDialog.title")}</DialogTitle>
            <DialogDescription>{t("addDialog.description")}</DialogDescription>
          </DialogHeader>

          <FormField label={t("addDialog.name")} required error={e.name?.message}>
            {(p) => <Input {...p} {...register("name")} placeholder={t("addDialog.namePlaceholder")} />}
          </FormField>

          <FormField label={t("addDialog.url")} required error={e.url?.message}>
            {(p) => (
              <Input
                {...p}
                type="url"
                inputMode="url"
                placeholder="https://"
                {...register("url", { onChange: () => setResult(null) })}
              />
            )}
          </FormField>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={test} disabled={testing || formState.isSubmitting}>
              {testing && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />}
              {testing ? t("addDialog.testing") : t("addDialog.test")}
            </Button>
            <p aria-live="polite" className="text-sm">
              {result?.ok && (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 aria-hidden className="size-4" />
                  {t("addDialog.testOk", { count: result.count })}
                </span>
              )}
              {result && !result.ok && (
                <span className="inline-flex items-center gap-1.5 text-destructive">
                  <AlertCircle aria-hidden className="size-4" />
                  {t("addDialog.testFailed")}
                </span>
              )}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              {t("addDialog.cancel")}
            </Button>
            <Button type="submit" disabled={formState.isSubmitting || testing}>
              {formState.isSubmitting ? t("addDialog.adding") : t("addDialog.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}