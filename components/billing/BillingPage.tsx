"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/panel/PageHeader";
import PanelCard from "@/components/panel/PanelCard";
import SubscriptionSection from "./sections/SubscriptionSection";
import PaymentMethodSection from "./sections/PaymentMethodSection";
import BillingDetailsSection from "./sections/BillingDetailsSection";
import InvoicesSection from "./sections/InvoicesSection";
import { MOCK_BILLING } from "./mockData";
import type { BillingState } from "./types";

export default function BillingPage() {
  const t = useTranslations("panel.billing");
  const [state, setState] = useState<BillingState>(MOCK_BILLING);
  const update = (patch: Partial<BillingState>) => setState((s) => ({ ...s, ...patch }));

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <PageHeader title={t("title")} description={t("description")} />
      <PanelCard>
        <SubscriptionSection subscription={state.subscription} onChange={(subscription) => update({ subscription })} />
        <PaymentMethodSection card={state.card} onChange={(card) => update({ card })} />
        <BillingDetailsSection details={state.details} onSave={(details) => update({ details })} />
        <InvoicesSection invoices={state.invoices} currency={state.subscription.currency} />
      </PanelCard>
    </div>
  );
}
