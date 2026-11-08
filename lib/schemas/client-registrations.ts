import { z } from "zod";
import { RE, V, optionalMatch } from "./shared";

/*
 * Client registrations: an agency registers a buyer for a development (step "Obra nueva" in the agency panel),
 * the developer accepts or rejects it (/promotor/registros). Messages are translation keys under panel.validation.
 */

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const text = (max: number) => z.string().trim().max(max, V.tooLong);

/** Agency → "Registrar cliente". Phone or email is needed to recognise the same buyer later; the developer never sees them. */
export const clientRegistrationSchema = z
  .object({
    developmentId: z.string().refine((v) => OBJECT_ID.test(v), V.required),
    buyerName: text(120).min(1, V.required),
    buyerPhone: z.string().trim().refine(optionalMatch(RE.phone), V.phone),
    buyerEmail: z.string().trim().refine(optionalMatch(RE.email), V.email),
    notes: text(1000),
  })
  .refine((v) => v.buyerPhone !== "" || v.buyerEmail !== "", { path: ["buyerPhone"], message: "phone_or_email" });

/** Developer → accept / reject. A reason is optional and shown to the agency. */
export const registrationDecisionSchema = z.object({
  decision: z.enum(["accept", "reject"]),
  reason: text(500),
});
