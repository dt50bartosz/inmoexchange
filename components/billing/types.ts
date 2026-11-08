import type { BillingDetails } from "@/lib/schemas/billing";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export type Subscription = {
  priceCents: number; // before IVA
  currency: string;
  vatRate: number; // 0.21 = 21% IVA
  status: SubscriptionStatus;
  currentPeriodEnd: string; // ISO: next payment, or end of access when cancelled
  trialEnd: string | null; // ISO
};

export type Card = { brand: string; last4: string; expMonth: number; expYear: number; holder: string };

export type InvoiceStatus = "paid" | "open" | "failed" | "refunded";

export type Invoice = { id: string; number: string; date: string; amountCents: number; status: InvoiceStatus };

export type BillingState = { subscription: Subscription; card: Card | null; details: BillingDetails; invoices: Invoice[] };

export const PLAN_FEATURE_KEYS = ["listings", "crm", "microsites", "support"] as const;
