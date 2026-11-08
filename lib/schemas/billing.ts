import { z } from "zod";
import { RE, V } from "./shared";

export const COUNTRIES = ["ES", "PT", "GB", "other"] as const;
export type Country = (typeof COUNTRIES)[number];

export const billingDetailsSchema = z
  .object({
    legalName: z.string().trim().min(1, V.required),
    taxId: z
      .string()
      .trim()
      .min(1, V.required)
      .refine((v) => /^[A-Z0-9]{8,12}$/.test(v.replace(/[\s-]/g, "")), V.taxId),
    street: z.string().trim().min(1, V.required),
    town: z.string().trim().min(1, V.required),
    postcode: z.string().trim().min(1, V.required),
    province: z.string().trim(),
    country: z.enum(COUNTRIES),
    invoiceEmail: z.string().trim().min(1, V.required).regex(RE.email, V.email),
  })
  .refine((d) => d.country !== "ES" || RE.postcodeEs.test(d.postcode), { path: ["postcode"], message: V.postcode });
export type BillingDetails = z.output<typeof billingDetailsSchema>;

const digits = (v: string) => v.replace(/\D/g, "");

/*
 * FRONT-END MOCK ONLY. Before going live, card details must go to Stripe's card element,
 * never to your own server. This schema exists only for the mock dialog.
 */
export const cardFormSchema = z
  .object({
    holder: z.string().trim().min(1, V.required),
    number: z.string().refine((v) => digits(v).length >= 13 && digits(v).length <= 19, V.cardNumber),
    expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, V.expiry),
    cvc: z.string().regex(/^\d{3,4}$/, V.cvc),
  })
  .refine(
    (v) => {
      const [mm, yy] = v.expiry.split("/").map(Number);
      if (!mm || Number.isNaN(yy)) return true;
      const now = new Date();
      const year = 2000 + yy;
      return year > now.getFullYear() || (year === now.getFullYear() && mm >= now.getMonth() + 1);
    },
    { path: ["expiry"], message: V.expired }
  );
export type CardFormValues = z.input<typeof cardFormSchema>;
