"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/panel/PageHeader";
import PanelCard from "@/components/panel/PanelCard";
import type { SecurityInfo } from "@/lib/server/account";
import PasswordSection from "./sections/PasswordSection";
import LoginEmailSection from "./sections/LoginEmailSection";
import SessionsSection from "./sections/SessionsSection";
import type { SecurityActions } from "./types";

type Props = {
  /** Loaded on the server from the logged-in user. */
  info: SecurityInfo;
  /** The agency page and the admin page each pass their own actions. */
  actions: SecurityActions;
};

/** Password, login email and sessions of the logged-in user (agency or admin). */
export default function SecurityPage({ info, actions }: Props) {
  const t = useTranslations("panel.security");
  const [changedAt, setChangedAt] = useState(info.passwordChangedAt);
  const [pendingEmail, setPendingEmail] = useState(info.pendingEmail);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <PageHeader title={t("title")} description={t("description")} />
      <PanelCard>
        <PasswordSection changedAt={changedAt} onChanged={setChangedAt} action={actions.changePassword} />
        <LoginEmailSection email={info.email} pendingEmail={pendingEmail} onPendingChange={setPendingEmail} actions={actions} />
        <SessionsSection action={actions.signOutEverywhere} />
      </PanelCard>
    </div>
  );
}
