"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { confirmEmailAction } from "@/app/[locale]/confirm-email/[token]/server/actions";

/** Confirms a new login email. A button, so opening the link alone (e.g. by a mail scanner) changes nothing. */
export default function ConfirmEmailButton({ token }: { token: string }) {
  const t = useTranslations("auth.confirmEmail");
  const [state, setState] = useState<"idle" | "busy" | "done" | "invalid" | "taken" | "failed">("idle");

  const confirm = async () => {
    setState("busy");
    const res = await confirmEmailAction(token).catch(() => undefined);
    setState(res?.ok ? "done" : res?.error === "invalid" ? "invalid" : res?.error === "email_taken" ? "taken" : "failed");
  };

  if (state === "done" || state === "invalid" || state === "taken") {
    return (
      <div role={state === "done" ? "status" : "alert"} className="space-y-4">
        <p className="text-sm">{t(state)}</p>
        <Link href="/login" className={`${buttonVariants()} w-full`}>
          {t("login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {state === "failed" && (
        <p role="alert" className="text-sm text-destructive">
          {t("failed")}
        </p>
      )}
      <Button type="button" className="w-full" disabled={state === "busy"} onClick={confirm}>
        {state === "busy" ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
