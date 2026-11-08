"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import PanelSection from "@/components/panel/PanelSection";
import ConfirmDialog from "../ui/ConfirmDialog";
import type { SecurityActions } from "../types";

/**
 * "Sign out of all other devices". Sessions are signed cookies, so there is no device list:
 * the server raises the login's session number and every other session stops working on its next click.
 */
export default function SessionsSection({ action }: { action: SecurityActions["signOutEverywhere"] }) {
  const t = useTranslations("panel.security.sessions");
  const te = useTranslations("panel.security.errors");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    const res = await action().catch(() => undefined);
    setBusy(false);
    setConfirm(false);
    if (res?.ok) toast.success(t("signedOutEverywhere"));
    else toast.error(te("failed"));
  };

  return (
    <PanelSection title={t("title")} description={t("simpleDescription")}>
      <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm(true)}>
        {busy ? t("signingOut") : t("signOutOthers")}
      </Button>
      <ConfirmDialog
        open={confirm}
        title={t("confirmTitle")}
        confirmLabel={t("confirmCount")}
        cancelLabel={t("cancel")}
        busy={busy}
        onConfirm={signOut}
        onCancel={() => setConfirm(false)}
      >
        {t("confirmBody")}
      </ConfirmDialog>
    </PanelSection>
  );
}
