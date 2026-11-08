import type { BillingState } from "./types";

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

// Replace with GET /api/billing when the backend is ready
export const MOCK_BILLING: BillingState = {
  subscription: {
    priceCents: 4900, // €49.00 before IVA — change the price here
    currency: "EUR",
    vatRate: 0.21,
    status: "active", // try "trialing", "past_due" or "canceled"
    currentPeriodEnd: daysFromNow(18),
    trialEnd: daysFromNow(9),
  },
  card: { brand: "Visa", last4: "4242", expMonth: 8, expYear: 2028, holder: "Laura Martínez" },
  details: {
    legalName: "Casa Mar Inmobiliaria S.L.",
    taxId: "B12345678",
    street: "Calle Ramón Gallud 12",
    town: "Torrevieja",
    postcode: "03181",
    province: "Alicante",
    country: "ES",
    invoiceEmail: "facturas@casamarproperties.es",
  },
  invoices: [
    { id: "in_6", number: "INV-2026-0106", date: daysFromNow(-12), amountCents: 5929, status: "paid" },
    { id: "in_5", number: "INV-2026-0105", date: daysFromNow(-42), amountCents: 5929, status: "paid" },
    { id: "in_4b", number: "INV-2026-0104", date: daysFromNow(-70), amountCents: 5929, status: "paid" },
    { id: "in_4", number: "INV-2026-0104", date: daysFromNow(-72), amountCents: 5929, status: "failed" },
    { id: "in_3", number: "INV-2026-0103", date: daysFromNow(-102), amountCents: 5929, status: "paid" },
    { id: "in_2", number: "INV-2026-0102", date: daysFromNow(-132), amountCents: 5929, status: "refunded" },
  ],
};
